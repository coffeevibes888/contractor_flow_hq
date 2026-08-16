'use client';

/**
 * Card Activity feed — shows authorizations (real-time) + completed
 * transactions for the selected card. Polls every 30s via SWR.
 */

import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  CircleAlert,
  Inbox,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IssuingActivityRow } from './types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json())?.error || 'failed');
  return res.json();
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface Props {
  cardId: string;
}

export function CardActivity({ cardId }: Props) {
  const { data, error, isLoading } = useSWR<{
    authorizations: IssuingActivityRow[];
    transactions: IssuingActivityRow[];
  }>(`/api/cards/${cardId}/activity`, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  // Merge authorizations and transactions into one feed sorted by date.
  const rows: (IssuingActivityRow & { kind: 'auth' | 'txn' })[] = [
    ...(data?.authorizations.map((a) => ({ ...a, kind: 'auth' as const })) ?? []),
    ...(data?.transactions.map((t) => ({ ...t, kind: 'txn' as const })) ?? []),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (isLoading && !data) {
    return <SkeletonList />;
  }
  if (error) {
    return (
      <div className='p-8 text-center'>
        <CircleAlert className='h-8 w-8 text-rose-500 mx-auto mb-2' />
        <p className='text-sm text-slate-700'>Couldn&apos;t load activity.</p>
        <p className='text-xs text-slate-500 mt-1'>
          {(error as Error).message}
        </p>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-14 px-6 text-center'>
        <div className='flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600 mb-3'>
          <Inbox className='h-6 w-6' />
        </div>
        <h4 className='text-sm font-semibold text-slate-900'>
          No card activity yet
        </h4>
        <p className='mt-1 text-xs text-slate-500 max-w-xs'>
          Card swipes, online purchases, and refunds will show up here in
          real time.
        </p>
      </div>
    );
  }

  return (
    <ul className='divide-y divide-slate-100'>
      <AnimatePresence initial={false}>
        {rows.map((r, i) => (
          <motion.li
            key={`${r.kind}-${r.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
          >
            <Row row={r} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Row({
  row,
}: {
  row: IssuingActivityRow & { kind: 'auth' | 'txn' };
}) {
  const declined = row.kind === 'auth' && row.approved === false;
  const pending = row.kind === 'auth' && row.approved === true;
  return (
    <div className='flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-slate-50/60'>
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full shrink-0',
          declined
            ? 'bg-rose-50 text-rose-600'
            : pending
              ? 'bg-amber-50 text-amber-600'
              : 'bg-slate-100 text-slate-700'
        )}
      >
        <ArrowUpRight className='h-4 w-4' />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='text-sm font-medium text-slate-900 truncate'>
          {row.merchantName || 'Unknown merchant'}
        </div>
        <div className='text-[11px] text-slate-500'>
          {new Date(row.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {row.merchantCategory && ' · ' + row.merchantCategory.replaceAll('_', ' ')}
          {row.merchantCity && ' · ' + row.merchantCity}
        </div>
      </div>
      <div className='text-right shrink-0'>
        <div
          className={cn(
            'text-sm font-semibold tabular-nums',
            declined ? 'text-rose-600 line-through' : 'text-slate-900'
          )}
        >
          −{usd.format(Math.abs(row.amount))}
        </div>
        <div className='mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium'>
          {row.kind === 'auth' && declined ? (
            <span className='inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700'>
              Declined
            </span>
          ) : row.kind === 'auth' && pending ? (
            <span className='inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700'>
              <Loader2 className='h-2.5 w-2.5 animate-spin' />
              Pending
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700'>
              Posted
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className='divide-y divide-slate-100'>
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className='flex items-center gap-3 px-5 sm:px-6 py-3.5 animate-pulse'
        >
          <div className='h-9 w-9 rounded-full bg-slate-100 shrink-0' />
          <div className='flex-1 space-y-2'>
            <div className='h-3 w-2/5 rounded bg-slate-100' />
            <div className='h-2.5 w-1/4 rounded bg-slate-100' />
          </div>
          <div className='h-3 w-16 rounded bg-slate-100' />
        </li>
      ))}
    </ul>
  );
}
