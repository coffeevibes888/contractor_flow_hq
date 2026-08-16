import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import Link from 'next/link';

export default async function FriendsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="w-full min-h-screen px-4 py-8 md:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-200">You need to be signed in to view your friends list.</p>
        </div>
      </main>
    );
  }

  const currentUserId = session.user.id as string;

  const users = await prisma.user.findMany({
    where: { id: { not: currentUserId } },
    orderBy: { name: 'asc' },
    take: 100,
  });

  return (
    <main className="w-full min-h-screen px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Friends & Coworkers</h1>
          <p className="text-gray-300 text-sm md:text-base">
            Browse people in RockEnMyVibe and easily contact them by email or direct message.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-6 shadow-inner shadow-slate-950/60 space-y-3 text-sm text-slate-200/90">
          {users.length === 0 && (
            <p className="text-sm text-slate-400/80">No other users found yet.</p>
          )}
          <ul className="space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-slate-50">{u.name || 'User'}</p>
                  <p className="text-xs text-slate-300/90 break-all">{u.email}</p>
                  {u.phoneNumber && (
                    <p className="text-xs text-slate-400/90">Phone: {u.phoneNumber}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {u.email && (
                    <a
                      href={`mailto:${u.email}`}
                      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-slate-900/80 px-3 py-1.5 font-medium text-slate-100 hover:bg-slate-800/90 transition"
                    >
                      Email
                    </a>
                  )}
                  {u.phoneNumber && (
                    <a
                      href={`tel:${u.phoneNumber}`}
                      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-slate-900/80 px-3 py-1.5 font-medium text-slate-100 hover:bg-slate-800/90 transition"
                    >
                      Call
                    </a>
                  )}
                  {u.email && (
                    <Link
                      href="/user/profile/inbox"
                      className="inline-flex items-center justify-center rounded-lg bg-violet-500 px-3 py-1.5 font-medium text-white shadow hover:bg-violet-400 transition-colors"
                    >
                      Message in Inbox
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400/80 mt-2">
            To start a direct message, you can copy a friend&apos;s email, phone, or name into the Inbox page
            under {"Start a new conversation"}.
          </p>
        </div>
      </div>
    </main>
  );
}
