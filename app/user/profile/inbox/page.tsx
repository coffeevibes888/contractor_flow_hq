import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { decryptField } from '@/lib/encrypt';
import Link from 'next/link';
import TenantDMCompose, { TenantContact } from '@/components/user/tenant-dm-compose';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserThreadParticipant = {
  id: string;
  threadId: string;
  userId: string;
  lastReadAt: Date | null;
  thread: {
    id: string;
    type: string;
    updatedAt: Date;
    status?: string;
    createdByUserId?: string | null;
    subject?: string | null;
    participants: { userId: string }[];
    messages: {
      content: string | null;
      createdAt: Date | string;
      senderUserId: string | null;
      senderName: string | null;
    }[];
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name?: string | null) {
  return (name || '?').charAt(0).toUpperCase();
}

function relTime(date: Date | string) {
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

export default async function UserInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="w-full min-h-screen">
        <p className="text-gray-500 p-8">You need to be signed in to view your messages.</p>
      </main>
    );
  }

  const userId = session.user.id as string;
  const resolvedSearchParams = await searchParams;
  const folder = (resolvedSearchParams.folder as string) || 'inbox';
  const composing = folder === 'compose';
  const prefillToId = (resolvedSearchParams.toId as string) || '';

  // ── 1. Fetch all DM threads this user participates in ──────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participantThreads = await (prisma as any).threadParticipant.findMany({
    where: { userId, isDeleted: false },
    include: {
      thread: {
        include: {
          participants: { select: { userId: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { thread: { updatedAt: 'desc' } },
  });

  const dmThreads = participantThreads.filter(
    (p: UserThreadParticipant) => p.thread.type === 'dm'
  );

  const inboxThreads = dmThreads.filter(
    (p: UserThreadParticipant) =>
      p.thread.status !== 'archived' && p.thread.status !== 'draft'
  );
  const archivedThreads = dmThreads.filter(
    (p: UserThreadParticipant) => p.thread.status === 'archived'
  );

  const currentThreads =
    folder === 'archived' ? archivedThreads : inboxThreads;

  // Decrypt preview snippets
  const previewByThreadId = new Map<string, string>();
  await Promise.all(
    currentThreads.map(async (p: UserThreadParticipant) => {
      const last = p.thread.messages[0];
      if (last?.content) {
        try {
          const plain = await decryptField(last.content);
          previewByThreadId.set(p.threadId, plain.slice(0, 120));
        } catch {
          previewByThreadId.set(p.threadId, '');
        }
      }
    })
  );

  const unreadCount = inboxThreads.filter((p: UserThreadParticipant) => {
    if (!p.thread.messages.length) return false;
    const last = p.thread.messages[0];
    if (!p.lastReadAt) return true;
    return new Date(last.createdAt) > new Date(p.lastReadAt);
  }).length;

  // ── 2. Fetch management contacts ──────────────────────────────────────────
  const activeLease = await prisma.lease.findFirst({
    where: {
      tenantId: userId,
      status: { in: ['active', 'pending_signature'] },
    },
    include: {
      unit: {
        include: {
          property: {
            include: {
              landlord: {
                include: {
                  owner: { select: { id: true, name: true } },
                  teamMembers: {
                    where: { status: 'active', userId: { not: null } },
                    include: {
                      user: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const contacts: TenantContact[] = [];

  if (activeLease) {
    const landlord = activeLease.unit.property.landlord;

    if (landlord.owner && landlord.owner.id !== userId) {
      contacts.push({
        userId: landlord.owner.id,
        name: landlord.owner.name || 'Property Owner',
        role: 'Landlord',
      });
    }

    for (const tm of landlord.teamMembers) {
      if (tm.user && tm.user.id !== userId) {
        const alreadyAdded = contacts.some((c) => c.userId === tm.user!.id);
        if (!alreadyAdded) {
          contacts.push({
            userId: tm.user.id,
            name: tm.user.name || 'Team Member',
            role: tm.role === 'admin' ? 'Property Manager' : 'Team Member',
          });
        }
      }
    }
  }

  if (contacts.length === 0) {
    const links = await prisma.tenantLandlordLink.findMany({
      where: { tenantId: userId, status: { not: 'archived' } },
      include: {
        landlord: {
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
      },
      take: 5,
    });

    for (const link of links) {
      if (link.landlord.owner && link.landlord.owner.id !== userId) {
        const alreadyAdded = contacts.some((c) => c.userId === link.landlord.owner!.id);
        if (!alreadyAdded) {
          contacts.push({
            userId: link.landlord.owner.id,
            name: link.landlord.owner.name || 'Landlord',
            role: 'Landlord',
          });
        }
      }
    }
  }

  // ── 3. Build per-thread "other participant" name map ───────────────────────
  const otherUserIds = new Set<string>();
  for (const p of currentThreads) {
    for (const part of p.thread.participants) {
      if (part.userId !== userId) otherUserIds.add(part.userId);
    }
  }

  const otherUsers =
    otherUserIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(otherUserIds) } },
          select: { id: true, name: true },
        })
      : [];

  const userNameById = new Map(otherUsers.map((u) => [u.id, u.name || 'Unknown']));

  const folders = [
    { key: 'inbox',    label: 'Inbox',    count: inboxThreads.length },
    { key: 'archived', label: 'Archived', count: archivedThreads.length },
  ];

  // Mobile: if composing, show main panel only
  const showMainOnMobile = composing;

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Messages</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Direct messages with your property management team.
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:shadow-md transition-all"
        >
          Support
        </Link>
      </div>

      {/* Main card */}
      <div
        className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        style={{ minHeight: 'calc(100vh - 260px)' }}
      >
        <div className="flex flex-col md:flex-row h-full" style={{ minHeight: 'calc(100vh - 260px)' }}>

          {/* ── Left sidebar ── */}
          <div
            className={`${showMainOnMobile ? 'hidden md:flex' : 'flex'} md:w-48 md:flex-shrink-0 md:border-r border-gray-100 flex-col py-3 gap-0.5 px-2 bg-gray-50/50 border-b md:border-b-0`}
          >
            {/* Compose */}
            <Link
              href="/user/profile/inbox?folder=compose"
              className="mx-2 mb-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-3 py-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              + New Message
            </Link>

            {/* Folders */}
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">Folders</p>

            {/* Desktop folder list */}
            <div className="hidden md:flex flex-col gap-0.5">
              {folders.map(({ key, label, count }) => (
                <Link
                  key={key}
                  href={`/user/profile/inbox?folder=${key}`}
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

            {/* Mobile folder pills */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-1 px-1">
              {folders.map(({ key, label, count }) => (
                <Link
                  key={key}
                  href={`/user/profile/inbox?folder=${key}`}
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

            {/* Management contacts (desktop) */}
            <div className="hidden md:block mt-4 pt-3 border-t border-gray-200 px-1">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2">Management</p>
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                {contacts.length === 0 && (
                  <p className="text-[11px] text-gray-400 px-2">No contacts yet</p>
                )}
                {contacts.map((c) => (
                  <Link
                    key={c.userId}
                    href={`/user/profile/inbox?folder=compose&toId=${c.userId}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-gray-600 hover:bg-white hover:text-gray-800 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                      {initials(c.name)}
                    </div>
                    <span className="truncate">{c.name}</span>
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
              <p className="text-xs font-bold text-gray-800 capitalize">{folder === 'compose' ? 'Inbox' : folder}</p>
              <span className="text-[10px] text-gray-400">{currentThreads.length} thread{currentThreads.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {currentThreads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No messages here</p>
                </div>
              )}
              {currentThreads.map((p: UserThreadParticipant) => {
                const t = p.thread;
                const last = t.messages[0];
                const preview = previewByThreadId.get(p.threadId) ?? '';
                const isUnread =
                  !p.lastReadAt ||
                  (last && new Date(last.createdAt) > new Date(p.lastReadAt));

                const otherParticipantId = t.participants.find(
                  (part) => part.userId !== userId
                )?.userId;
                const otherName = otherParticipantId
                  ? (userNameById.get(otherParticipantId) ?? 'Unknown')
                  : 'Unknown';

                const subject = t.subject || otherName;
                const lastSenderName =
                  last?.senderUserId === userId
                    ? 'You'
                    : last?.senderName || otherName;

                return (
                  <Link
                    key={p.id}
                    href={`/user/profile/inbox/${p.threadId}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[11px] sm:text-[10px] font-bold text-white">
                      {initials(otherName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs truncate ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                          {subject}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{relTime(t.updatedAt)}</span>
                      </div>
                      <p className="text-[11px] text-gray-700 truncate font-medium">{otherName}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-1">
                        {last ? `${lastSenderName}: ${preview || '…'}` : 'No messages yet'}
                      </p>
                    </div>
                    {isUnread && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-500 mt-2" />
                    )}
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
              <ComposePanelWrapper contacts={contacts} prefillToId={prefillToId} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-800 mb-1">Select a conversation</p>
                <p className="text-xs text-gray-500 max-w-xs">Choose a thread from the list or compose a new message to your property manager.</p>
                <Link
                  href="/user/profile/inbox?folder=compose"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-4 py-2 shadow-md hover:shadow-lg transition-all"
                >
                  + New Message
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Compose Panel Wrapper ────────────────────────────────────────────────────

function ComposePanelWrapper({ contacts, prefillToId }: { contacts: TenantContact[]; prefillToId?: string }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 gap-3">
        <Link
          href="/user/profile/inbox"
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex-shrink-0"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-sm font-bold text-gray-800 flex-1">New Message</h2>
        <Link href="/user/profile/inbox" className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium">
          Discard
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <TenantDMCompose contacts={contacts} prefillToId={prefillToId} />
      </div>
    </div>
  );
}
