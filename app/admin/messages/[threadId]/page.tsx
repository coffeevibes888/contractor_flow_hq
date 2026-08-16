import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import Link from 'next/link';
import { decryptField } from '@/lib/encrypt';

interface AdminThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function AdminThreadPage({ params }: AdminThreadPageProps) {
  await requireAdmin();
  const session = await auth();
  const { threadId } = await params;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (thread?.messages?.length) {
    thread.messages = await Promise.all(
      thread.messages.map(async (m) => ({
        ...m,
        content: await decryptField(m.content),
      }))
    );
  }

  if (!thread) {
    return (
      <main className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center">
        <p className="text-slate-200">Thread not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-4xl">
        <div className="pointer-events-none absolute -inset-1 rounded-3xl" />

        <div className="relative rounded-3xl border overflow-hidden">
          <div className="flex flex-col h-[70vh]">
            <header className="flex items-center justify-between px-6 py-4 border-b ">
              <div>
                <p className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide text-violet-200/80 ring-1 ring-white/10">
                  Admin Conversation
                </p>
                <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight">
                  {thread.subject || 'Message thread'}
                </h1>
              </div>
              <Link
                href="/admin/messages"
                className="text-xs underline-offset-2 hover:underline"
              >
                Back to inbox
              </Link>
            </header>

            <div className="flex-1 flex flex-col px-6 py-4 gap-4 overflow-y-auto">
              {thread.messages.length === 0 && (
                <p className="text-sm text-slate-400/80">No messages in this thread yet.</p>
              )}
              {thread.messages.map((m) => {
                const isAdmin = m.role === 'admin';
                const created = new Date(m.createdAt).toLocaleString();

                return (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm shadow border ${
                      isAdmin
                        ? 'ml-auto bg-violet-600/80'
                        : 'mr-auto bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                        {m.senderName || (isAdmin ? 'Admin' : 'User')}
                      </span>
                      <span className="text-[9px] ">{created}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-[11px] sm:text-[13px]">
                      {m.content}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t ">
              <form
                action={async (formData: FormData) => {
                  'use server';

                  const content = formData.get('content');

                  if (!content || typeof content !== 'string' || !content.trim()) {
                    return;
                  }

                  const currentSession = await auth();

                  if (!currentSession?.user?.id) {
                    return;
                  }

                  const isAdminRole = currentSession.user.role === 'admin';

                  await prisma.message.create({
                    data: {
                      threadId: thread.id,
                      senderUserId: currentSession.user.id as string,
                      senderName: currentSession.user.name ?? null,
                      senderEmail: currentSession.user.email ?? null,
                      content: content.trim(),
                      role: isAdminRole ? 'admin' : 'user',
                    },
                  });

                  await prisma.thread.update({
                    where: { id: thread.id },
                    data: { updatedAt: new Date() },
                  });
                }}
                className="flex items-end gap-3"
              >
                <textarea
                  name="content"
                  rows={2}
                  className="flex-1 resize-none rounded-2xl border px-3 py-2 text-xs sm:text-sm  focus:outline-none focus:ring-2 focus:ring-violet-500/70"
                  placeholder="Type a reply to this conversation..."
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-violet-500 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow hover:bg-violet-400 transition-colors"
                >
                  Send
                </button>
              </form>
              <p className="mt-2 text-[10px]">
                Replies are visible to the visitor or user linked to this thread.
              </p>
              <p className="mt-1 text-[10px]">
                Logged in as <span className="font-semibold">{session?.user?.email ?? 'Admin'}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
