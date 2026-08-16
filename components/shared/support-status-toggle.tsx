'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';

export default function SupportStatusToggle() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/support/status', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setIsOnline(Boolean(data.isOnline));
        if (data.updatedAt) setLastUpdated(new Date(data.updatedAt).toLocaleString());
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const toggle = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/support/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok) return;
        const data = await res.json();
        setIsOnline(Boolean(data.isOnline));
        if (data.updatedAt) setLastUpdated(new Date(data.updatedAt).toLocaleString());
      } catch {
        // ignore
      }
    });
  };

  const label = isOnline === null ? 'Loading…' : isOnline ? 'Support Online' : 'Support Offline';

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs md:text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">Support status</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {label}
          {lastUpdated && ` • Updated ${lastUpdated}`}
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant={isOnline ? 'default' : 'outline'}
        disabled={isPending || isOnline === null}
        onClick={toggle}
        className="h-7 px-3 text-[11px]"
      >
        {isPending ? (
          <Loader className="w-3 h-3 animate-spin" />
        ) : isOnline ? (
          'Go Offline'
        ) : (
          'Go Online'
        )}
      </Button>
    </div>
  );
}
