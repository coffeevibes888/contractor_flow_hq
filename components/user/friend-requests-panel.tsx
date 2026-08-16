'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

type RequestUser = {
  id: string;
  name: string | null;
  email: string | null;
};

export type FriendRequestItem = {
  id: string;
  direction: 'incoming' | 'outgoing';
  otherUser: RequestUser;
  status: string;
};

export default function FriendRequestsPanel({
  requests: initialRequests,
}: {
  requests: FriendRequestItem[];
}) {
  const [requests, setRequests] = useState<FriendRequestItem[]>(initialRequests);
  const [isPending, startTransition] = useTransition();

  const handleAction = (requestId: string, action: 'accept' | 'decline') => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/users/friend-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, action }),
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!data.ok) return;

        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } catch {
        // ignore
      }
    });
  };

  if (requests.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-white/15 bg-slate-950/80 px-3 py-3 text-xs text-slate-200/90 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
          Friend Requests
        </h3>
        <span className="text-[10px] text-slate-400/90">{requests.length}</span>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium truncate">
                {r.otherUser.name || 'User'}
              </p>
              {r.otherUser.email && (
                <p className="text-[10px] text-slate-400 truncate">{r.otherUser.email}</p>
              )}
              <p className="text-[9px] text-slate-500 mt-0.5">
                {r.direction === 'incoming' ? 'Wants to connect with you' : 'Awaiting response'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {r.direction === 'incoming' ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    className="h-6 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={isPending}
                    onClick={() => handleAction(r.id, 'accept')}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-6 px-2 text-[10px] bg-slate-700 hover:bg-slate-800 text-slate-50"
                    disabled={isPending}
                    onClick={() => handleAction(r.id, 'decline')}
                  >
                    Decline
                  </Button>
                </>
              ) : (
                <span className="text-[10px] text-slate-400">Pending</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
