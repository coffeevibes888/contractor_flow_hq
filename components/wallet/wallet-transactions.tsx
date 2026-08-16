'use client';

/**
 * Paginated wallet transaction list with status pills, direction icons,
 * filter tabs, and a Framer Motion entrance animation. SWR drives the
 * data with a 30-second revalidation cadence.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Inbox,
  CircleCheck,
  CircleAlert,
  CircleSlash,
  Loader2,
} from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  WalletTransactionRow,
  WalletTransactionsResponse,
  WalletTxFilter,
} from './types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

const FILTERS: { key: WalletTxFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Money In' },
  { key: 'out', label: 'Money Out' },
  { key: 'pending', label: 'Pending' },
];

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function WalletTransactions() {
  const [filter, setFilter] = useState<WalletTxFilter>('all');
  const { data, error, isLoading, mutate } = useSWR<WalletTransactionsResponse>(
    `/api/wallet/transactions?filter=${filter}&limit=20`,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  return (
    <div className='rounded-2xl border border-slate-200 bg-white'>
      <div className='flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100'>
        <div>
          <h3 className='text-sm font-semibold text-slate-900'>Activity</h3>
          <p className='text-xs text-slate-500'>
            Live from your Treasury wallet
          </p>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => mutate()}
          className='text-slate-500 hover:text-slate-900'
        >
          {isLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className='flex flex-wrap gap-1 px-4 sm:px-5 py-3 border-b border-slate-100'>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type='button'
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === f.key
                ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-200'
                : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className='min-h-[260px]'>
        {isLoading && !data ? (
          <SkeletonList />
        ) : error ? (
          <div className='p-8 text-center'>
            <CircleAlert className='h-8 w-8 text-rose-500 mx-auto mb-2' />
            <p className='text-sm text-slate-700'>
              Couldn&apos;t load transactions.
            </p>
            <p className='text-xs text-slate-500 mt-1'>
              {(error as Error).message}
            </p>
          </div>
        ) : !data || data.transactions.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className='divide-y divide-slate-100'>
            <AnimatePresence initial={false}>
              {data.transactions.map((tx, i) => (
                <motion.li
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
                >
                  <Row tx={tx} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ tx }: { tx: WalletTransactionRow }) {
  const isIn = tx.direction === 'in';
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className='flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-slate-50/60'>
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full shrink-0',
          isIn
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-slate-100 text-slate-700'
        )}
      >
        <Icon className='h-4 w-4' />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='text-sm font-medium text-slate-900 truncate'>
          {tx.description}
        </div>
        <div className='text-[11px] text-slate-500'>
          {new Date(tx.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {tx.counterparty && <> &middot; {tx.counterparty}</>}
        </div>
      </div>
      <div className='text-right shrink-0'>
        <div
          className={cn(
            'text-sm font-semibold tabular-nums',
            isIn ? 'text-emerald-600' : 'text-slate-900'
          )}
        >
          {isIn ? '+' : '\u2212'}
          {usd.format(tx.amount)}
        </div>
        <StatusPill status={tx.status} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: WalletTransactionRow['status'] }) {
  const map = {
    posted: {
      label: 'Completed',
      icon: CircleCheck,
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    open: {
      label: 'Pending',
      icon: Loader2,
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    void: {
      label: 'Void',
      icon: CircleSlash,
      classes: 'bg-slate-100 text-slate-600 border-slate-200',
    },
  } as const;
  const cfg = map[status] ?? map.void;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        cfg.classes
      )}
    >
      <Icon
        className={cn('h-2.5 w-2.5', status === 'open' && 'animate-spin')}
      />
      {cfg.label}
    </span>
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
          <div className='space-y-2 text-right'>
            <div className='h-3 w-16 rounded bg-slate-100 ml-auto' />
            <div className='h-2.5 w-12 rounded bg-slate-100 ml-auto' />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ filter }: { filter: WalletTxFilter }) {
  return (
    <div className='flex flex-col items-center justify-center py-14 px-6 text-center'>
      <div className='flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600 mb-3'>
        <Inbox className='h-6 w-6' />
      </div>
      <h4 className='text-sm font-semibold text-slate-900'>
        {filter === 'all'
          ? 'No transactions yet'
          : filter === 'in'
            ? 'No money in yet'
            : filter === 'out'
              ? 'No money out yet'
              : 'Nothing pending'}
      </h4>
      <p className='mt-1 text-xs text-slate-500 max-w-xs'>
        {filter === 'all'
          ? 'When rent comes in or you send money, it will show up here.'
          : 'Once a transfer matches this filter, it will appear here.'}
      </p>
    </div>
  );
}
