import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { decryptField } from '@/lib/encrypt';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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

export default async function UserThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="w-full min-h-screen px-4 py-8 md:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-500">You need to be signed in to view this conversation.</p>
        </div>
      </main>
    );
  }

  const userId = session.user.id as string;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      participants: true,
    },
  });

  if (!thread) {
    return (
      <main className="w-full min-h-screen px-4 py-8 md:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-500">Conversation not found.</p>
        </div>
      </main>
    );
  }

  const isParticipant = thread.participants.some((p) => p.userId === userId);

  if (!isParticipant) {
    return (
      <main className="w-full min-h-screen px-4 py-8 md:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-500">You do not have access to this conversation.</p>
        </div>
      </main>
    );
  }

  // Mark this thread as read for the current user when they view it
  await prisma.threadParticipant.updateMany({
    where: { threadId: thread.id, userId },
    data: { lastReadAt: new Date() },
  });

  // The Prisma extension that auto-decrypts message.content only fires on
  // top-level Message queries. Messages reached via a nested `include` on
  // Thread come back with raw ciphertext, so we decrypt here.
  const decryptedMessages = await Promise.all(
    thread.messages.map(async (m) => ({
      ...m,
      content: await decryptField(m.content),
    }))
  );

  const subject = thread.subject || 'Conversation';

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Messages</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Direct messages with your property management team.</p>
      </div>

      {/* Main card — three-column shell, thread open on right */}
      <div
        className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        style={{ minHeight: 'calc(100vh - 260px)' }}
      >
        <div className="flex flex-col md:flex-row h-full" style={{ minHeight: 'calc(100vh - 260px)' }}>

          {/* ── Left sidebar (hidden on mobile when thread is open) ── */}
          <div className="hidden md:flex md:w-48 md:flex-shrink-0 md:border-r border-gray-100 flex-col py-3 gap-0.5 px-2 bg-gray-50/50">
            <Link
              href="/user/profile/inbox?folder=compose"
              className="mx-2 mb-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-3 py-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              + New Message
            </Link>

            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">Folders</p>
            {[
              { key: 'inbox',    label: 'Inbox' },
              { key: 'archived', label: 'Archived' },
            ].map(({ key, label }) => (
              <Link
                key={key}
                href={`/user/profile/inbox?folder=${key}`}
                className="flex items-center rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-white/80 hover:text-gray-800 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* ── Thread list column (hidden on mobile when thread is open) ── */}
          <div className="hidden md:flex md:w-72 md:flex-shrink-0 md:border-r border-gray-100 flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-800">Inbox</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
              <Link
                href="/user/profile/inbox"
                className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline transition-colors"
              >
                ← Back to inbox
              </Link>
            </div>
          </div>

          {/* ── Thread panel ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Thread header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 gap-2 sm:gap-3">
              <Link
                href="/user/profile/inbox"
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex-shrink-0"
                aria-label="Back to inbox"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-gray-800 truncate">{subject}</h2>
                <p className="text-[11px] text-gray-500">{decryptedMessages.length} message{decryptedMessages.length !== 1 ? 's' : ''}</p>
              </div>
              <Link
                href="/user/profile/inbox"
                className="hidden md:block text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Back to inbox
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 bg-gray-50/30">
              {decryptedMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No messages yet.</p>
                </div>
              )}
              {decryptedMessages.map((m) => {
                const mine = m.senderUserId === userId;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] ${mine ? 'order-2' : 'order-1'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                          {initials(m.senderName, m.senderEmail)}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[140px] sm:max-w-none">
                          {mine ? 'You' : m.senderName || 'Other'}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{relTime(m.createdAt)}</span>
                      </div>
                      <div className={`rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed break-words ${
                        mine
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                          : 'bg-white text-gray-800 border border-gray-100 shadow-sm'
                      }`}>
                        {m.content || <span className="opacity-50 italic">No content</span>}
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

                  await prisma.message.create({
                    data: {
                      threadId: thread.id,
                      senderUserId: currentSession.user.id as string,
                      senderName: currentSession.user.name ?? null,
                      senderEmail: currentSession.user.email ?? null,
                      content,
                      role: 'user',
                    },
                  });

                  await prisma.thread.update({
                    where: { id: thread.id },
                    data: { updatedAt: new Date() },
                  });

                  await prisma.threadParticipant.updateMany({
                    where: { threadId: thread.id, userId: currentSession.user.id as string },
                    data: { lastReadAt: new Date() },
                  });

                  revalidatePath(`/user/profile/inbox/${thread.id}`);
                  redirect(`/user/profile/inbox/${thread.id}`);
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
              <p className="mt-2 text-[10px] text-gray-400">
                Messages are only visible to participants in this thread.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
