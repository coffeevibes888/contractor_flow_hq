import { auth } from '@/auth';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { decryptField } from '@/lib/encrypt';
import Link from 'next/link';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { UnifiedMessageService } from '@/lib/services/unified-message-service';

// ─── Style tokens matching new PM dashboard ─────────────────────────────────
// Cards: white with border-gray-200, shadow-sm
// Text: text-gray-800 / text-gray-500
// Accent: cyan-500 to blue-500 gradient

// ─── Types ───────────────────────────────────────────────────────────────────

type MsgRow = {
  id: string;
  content: string | null;
  senderName: string | null;
  senderEmail: string | null;
  role: string;
  createdAt: Date;
};

type ThreadRow = {
  id: string;
  type: string;
  subject: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  status: string;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: MsgRow[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name?: string | null, email?: string | null) {
  return (name || email || '?').charAt(0).toUpperCase();
}

function relTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const sp = await searchParams;
  const folder = sp.folder || 'inbox';
  const selectedId = sp.thread || null;
  const composing = sp.compose === '1';

  const landlordResult = await getOrCreateCurrentLandlord();
  const landlordId = landlordResult.landlord?.id;

  // Platform staff (PropertyFlowHQ superAdmins) see global contact-form and
  // support threads. Everyone else — including regular landlord/admin role
  // accounts — only sees their own DMs. Otherwise the inbox leaks every
  // contact submission on the platform to every new tenant-facing account.
  const isPlatformAdmin = session.user.role === 'superAdmin';

  // All threads visible to this PM
  // Build the OR conditions properly
  const orConditions: any[] = [
    { type: 'dm', participants: { some: { userId: session.user.id } } },
  ];

  if (isPlatformAdmin) {
    orConditions.push({ type: { in: ['contact', 'support'] } });
  } else {
    // Non-platform admins still see contact/support threads they
    // are explicitly a participant of (e.g. they replied to one).
    orConditions.push({
      type: { in: ['contact', 'support'] },
      participants: { some: { userId: session.user.id } },
    });
  }

  const allThreadsRaw = (await prisma.thread.findMany({
    where: {
      OR: orConditions,
    },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })) as ThreadRow[];

  // The Prisma extension for message.content decryption only runs on top-level
  // message queries. When messages are loaded via a nested include on Thread,
  // the content is returned still encrypted. Decrypt here so the preview in
  // the thread list shows human-readable text.
  const allThreads: ThreadRow[] = await Promise.all(
    allThreadsRaw.map(async (t) => ({
      ...t,
      messages: await Promise.all(
        t.messages.map(async (m) => ({ ...m, content: await decryptField(m.content) }))
      ),
    }))
  );

  // Folder counts
  const inboxThreads    = allThreads.filter(t => t.status === 'open');
  const sentThreads     = allThreads.filter(t => t.createdByUserId === session.user.id && t.status !== 'trash');
  const archivedThreads = allThreads.filter(t => t.status === 'archived');
  const spamThreads     = allThreads.filter(t => t.status === 'spam');
  const trashThreads    = allThreads.filter(t => t.status === 'trash');

  const folderMap: Record<string, ThreadRow[]> = {
    inbox: inboxThreads,
    sent: sentThreads,
    archived: archivedThreads,
    spam: spamThreads,
    trash: trashThreads,
  };
  const folderThreads = folderMap[folder] ?? inboxThreads;

  // Active tenants for compose (includes both assigned and unassigned tenants)
  const assignedTenants = landlordId
    ? await prisma.user.findMany({
        where: {
          role: 'tenant',
          leasesAsTenant: {
            some: { unit: { property: { landlordId } }, status: { in: ['active', 'pending_signature'] } },
          },
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
    : [];

  // Unassigned tenants linked to this landlord
  const unassignedTenantLinks = landlordId
    ? await prisma.tenantLandlordLink.findMany({
        where: {
          landlordId,
          status: 'pending',
        },
        include: {
          tenant: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    : [];

  const unassignedTenants = unassignedTenantLinks.map(link => link.tenant);

  // Combine both lists, removing duplicates
  const tenants = [
    ...assignedTenants,
    ...unassignedTenants.filter(
      ut => !assignedTenants.some(at => at.id === ut.id)
    ),
  ];

  // Selected thread with full messages
  let selectedThread: (ThreadRow & { messages: MsgRow[] }) | null = null;
  if (selectedId) {
    const raw = await prisma.thread.findUnique({
      where: { id: selectedId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    }) as (ThreadRow & { messages: MsgRow[] }) | null;

    // Authorization: same scoping as the list. Non-platform-admins can only
    // open a thread if it's a DM they participate in, or a contact/support
    // thread they've explicitly been added to as a participant.
    let allowed = false;
    if (raw) {
      if (isPlatformAdmin && (raw.type === 'contact' || raw.type === 'support')) {
        allowed = true;
      } else {
        const participation = await prisma.threadParticipant.findFirst({
          where: { threadId: raw.id, userId: session.user.id },
          select: { id: true },
        });
        allowed = !!participation;
      }
    }

    if (raw && allowed) {
      raw.messages = await Promise.all(
        raw.messages.map(async (m) => ({ ...m, content: await decryptField(m.content) }))
      );
      selectedThread = raw;
      await prisma.threadParticipant.updateMany({
        where: { threadId: selectedId, userId: session.user.id },
        data: { lastReadAt: new Date() },
      });
    }
  }

  const folders = [
    { key: 'inbox',    label: 'Inbox',    count: inboxThreads.length },
    { key: 'sent',     label: 'Sent',     count: sentThreads.length },
    { key: 'archived', label: 'Archived', count: archivedThreads.length },
    { key: 'spam',     label: 'Spam',     count: spamThreads.length },
    { key: 'trash',    label: 'Trash',    count: trashThreads.length },
  ];

  // Mobile state: what view to show
  // On mobile, we show ONE panel at a time:
  //   - `main` (compose or thread view) when composing or a thread is selected
  //   - `browse` (folders + thread list) otherwise
  const showMainOnMobile = composing || !!selectedThread;

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Messages</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Communicate with tenants and contacts.</p>
      </div>

      {/* Main card */}
      <div
        className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        style={{ minHeight: 'calc(100vh - 220px)' }}
      >
        <div className="flex flex-col md:flex-row h-full" style={{ minHeight: 'calc(100vh - 220px)' }}>

          {/* ── Left sidebar (folders & tenants) ── */}
          <div
            className={`${showMainOnMobile ? 'hidden md:flex' : 'flex'} md:w-48 md:flex-shrink-0 md:border-r border-gray-100 flex-col py-3 gap-0.5 px-2 bg-gray-50/50 border-b md:border-b-0`}
          >
            {/* Compose */}
            <Link
              href="/admin/messages?compose=1"
              className="mx-2 mb-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-3 py-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Compose
            </Link>

            {/* Folders */}
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">Folders</p>

            {/* Desktop folder list */}
            <div className="hidden md:flex flex-col gap-0.5">
              {folders.map(({ key, label, count }) => (
                <Link
                  key={key}
                  href={`/admin/messages?folder=${key}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    folder === key
                      ? 'bg-white text-gray-800 font-semibold shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-white/80 hover:text-gray-800'
                  }`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full font-semibold text-gray-600">
                      {count}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Mobile folder pills (horizontal scroll) */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-1 px-1">
              {folders.map(({ key, label, count }) => (
                <Link
                  key={key}
                  href={`/admin/messages?folder=${key}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                    folder === key
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      folder === key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Tenants quick-compose (desktop only) */}
            <div className="hidden md:block mt-4 pt-3 border-t border-gray-200 px-1">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2">Tenants</p>
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                {tenants.length === 0 && (
                  <p className="text-[11px] text-gray-400 px-2">No active tenants</p>
                )}
                {tenants.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/messages?compose=1&toId=${t.id}&to=${encodeURIComponent(t.email || '')}&toName=${encodeURIComponent(t.name || '')}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-gray-600 hover:bg-white hover:text-gray-800 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                      {initials(t.name, t.email)}
                    </div>
                    <span className="truncate">{t.name || t.email}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Thread list ── */}
          <div
            className={`${showMainOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-72 md:flex-shrink-0 md:border-r border-gray-100 flex-col overflow-hidden`}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-800 capitalize">{folder}</p>
              <span className="text-[10px] text-gray-400">{folderThreads.length} thread{folderThreads.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {folderThreads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No messages here</p>
                </div>
              )}
              {folderThreads.map((t) => {
                const last = t.messages[0];
                const sender = last?.senderName || last?.senderEmail || t.fromEmail || 'Unknown';
                const subject = t.subject || sender;
                const preview = last?.content?.slice(0, 80) ?? '';
                const isSelected = t.id === selectedId;

                return (
                  <Link
                    key={t.id}
                    href={`/admin/messages?folder=${folder}&thread=${t.id}`}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-cyan-50/50 md:border-l-2 md:border-cyan-500' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[11px] sm:text-[10px] font-bold text-white">
                      {initials(last?.senderName, last?.senderEmail || t.fromEmail)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs sm:text-xs font-semibold text-gray-800 truncate">{sender}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{relTime(t.updatedAt)}</span>
                      </div>
                      <p className="text-[11px] text-gray-700 truncate font-medium">{subject}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-1">{preview || 'No content'}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── Main panel ── */}
          <div
            className={`${showMainOnMobile ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden min-w-0`}
          >
            {composing ? (
              <ComposePanel tenants={tenants} sp={sp} />
            ) : selectedThread ? (
              <ThreadPanel thread={selectedThread} session={session} folder={folder} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-800 mb-1">Select a conversation</p>
                <p className="text-xs text-gray-500 max-w-xs">Choose a thread from the list or compose a new message to a tenant.</p>
                <Link
                  href="/admin/messages?compose=1"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-4 py-2 shadow-md hover:shadow-lg transition-all"
                >
                  Compose New Message
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Compose Panel ────────────────────────────────────────────────────────────

function ComposePanel({
  tenants,
  sp,
}: {
  tenants: { id: string; name: string; email: string }[];
  sp: Record<string, string | undefined>;
}) {
  const prefillToId = sp.toId || '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 gap-3">
        <Link
          href="/admin/messages"
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex-shrink-0"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-sm font-bold text-gray-800 flex-1">New Message</h2>
        <Link href="/admin/messages" className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium">
          Discard
        </Link>
      </div>

      <form
        className="flex-1 flex flex-col p-4 sm:p-6 gap-0"
        action={async (formData: FormData) => {
          'use server';
          const toId = formData.get('toId') as string;
          const subject = (formData.get('subject') as string)?.trim();
          const content = (formData.get('content') as string)?.trim();
          if (!content || !subject || !toId) return;

          const currentSession = await auth();
          if (!currentSession?.user?.id) return;

          // Use unified message service
          const result = await UnifiedMessageService.sendMessage({
            senderId: currentSession.user.id,
            senderName: currentSession.user.name || undefined,
            senderEmail: currentSession.user.email || undefined,
            recipientId: toId,
            subject,
            content,
            threadType: 'dm',
          });

          if (result.success) {
            revalidatePath('/admin/messages');
            redirect(`/admin/messages?folder=sent&thread=${result.threadId}`);
          }
        }}
      >
        {/* To */}
        <div className="flex items-center gap-3 border-b border-gray-100 py-3">
          <span className="text-xs font-semibold text-gray-500 w-14 flex-shrink-0">To</span>
          <select
            name="toId"
            defaultValue={prefillToId}
            required
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 font-medium focus:outline-none"
          >
            <option value="" disabled>Select a tenant...</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="flex items-center gap-3 border-b border-gray-100 py-3">
          <span className="text-xs font-semibold text-gray-500 w-14 flex-shrink-0">Subject</span>
          <input
            name="subject"
            type="text"
            placeholder="Message subject"
            required
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none"
          />
        </div>

        {/* Body */}
        <textarea
          name="content"
          rows={10}
          required
          placeholder="Write your message..."
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none py-4 min-h-[200px]"
        />

        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-5 py-2.5 shadow-md hover:shadow-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
          <Link href="/admin/messages" className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// ─── Thread Panel ─────────────────────────────────────────────────────────────

function ThreadPanel({
  thread,
  session,
  folder,
}: {
  thread: ThreadRow & { messages: MsgRow[] };
  session: any;
  folder: string;
}) {
  const sender = thread.fromEmail || thread.messages[0]?.senderName || 'Unknown';
  const subject = thread.subject || sender;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Thread header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 gap-2 sm:gap-3">
        <Link
          href={`/admin/messages?folder=${folder}`}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex-shrink-0"
          aria-label="Back to inbox"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-800 truncate">{subject}</h2>
          <p className="text-[11px] text-gray-500">{thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {thread.status === 'open' && (
            <form
              action={async () => {
                'use server';
                await prisma.thread.update({ where: { id: thread.id }, data: { status: 'archived' } });
                revalidatePath('/admin/messages');
                redirect(`/admin/messages?folder=${folder}`);
              }}
            >
              <button type="submit" className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 sm:px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                Archive
              </button>
            </form>
          )}
          {thread.status === 'archived' && (
            <form
              action={async () => {
                'use server';
                await prisma.thread.update({ where: { id: thread.id }, data: { status: 'open' } });
                revalidatePath('/admin/messages');
                redirect(`/admin/messages?folder=${folder}`);
              }}
            >
              <button type="submit" className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 sm:px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
                <span className="hidden sm:inline">Move to Inbox</span>
                <span className="sm:hidden">Inbox</span>
              </button>
            </form>
          )}
          {thread.status !== 'trash' && (
            <form
              action={async () => {
                'use server';
                await prisma.thread.update({ where: { id: thread.id }, data: { status: 'trash' } });
                revalidatePath('/admin/messages');
                redirect(`/admin/messages?folder=${folder}`);
              }}
            >
              <button type="submit" className="text-xs text-red-500 hover:text-red-600 font-medium px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 bg-gray-50/30">
        {thread.messages.map((msg) => {
          const isMe = msg.senderEmail === session?.user?.email || msg.role === 'admin';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                    {initials(msg.senderName, msg.senderEmail)}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[140px] sm:max-w-none">{msg.senderName || msg.senderEmail || 'Unknown'}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{relTime(msg.createdAt)}</span>
                </div>
                <div className={`rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed break-words ${
                  isMe
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm'
                }`}>
                  {msg.content || <span className="opacity-50 italic">No content</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply form */}
      <div className="border-t border-gray-100 px-3 sm:px-6 py-3 sm:py-4">
        <form
          className="flex gap-2 sm:gap-3"
          action={async (formData: FormData) => {
            'use server';
            const content = (formData.get('content') as string)?.trim();
            if (!content) return;

            const currentSession = await auth();
            if (!currentSession?.user?.id) return;

            // Use unified message service for replies
            const result = await UnifiedMessageService.sendMessage({
              senderId: currentSession.user.id,
              senderName: currentSession.user.name || undefined,
              senderEmail: currentSession.user.email || undefined,
              content,
              threadId: thread.id,
            });

            if (result.success) {
              revalidatePath('/admin/messages');
              redirect(`/admin/messages?folder=${folder}&thread=${thread.id}`);
            }
          }}
        >
          <input
            name="content"
            type="text"
            placeholder="Type a reply..."
            required
            className="flex-1 min-w-0 bg-gray-50 rounded-lg px-3 sm:px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-cyan-500/20 border border-gray-200 transition-all"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-3 sm:px-5 py-2.5 shadow-md hover:shadow-lg transition-all flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="hidden sm:inline">Reply</span>
          </button>
        </form>
      </div>
    </div>
  );
}
