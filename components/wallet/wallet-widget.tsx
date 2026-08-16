'use client';

/**
 * Reusable compact wallet card. Drop on the dashboard home page or
 * anywhere else that wants a quick "balance + Send" action. Polls every
 * 30 seconds via SWR like the full wallet page; on click navigates to
 * /admin/wallet.
 */

import Link from 'next/link';
import useSWR from 'swr';
import { Wallet, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WalletBalanceResponse } from './types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed');
  return res.json();
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface Props {
  className?: string;
}

export function WalletWidget({ className }: Props) {
  const { data, isLoading } = useSWR<WalletBalanceResponse>(
    '/api/wallet/balance',
    fetcher,
    { refreshInterval: 30_000 }
  );

  const verified = data?.onboardingStatus === 'verified' && data?.ready;

  return (
    <Link
      href='/admin/wallet'
      className={cn(
        'group block rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-700 text-white p-4 shadow-lg ring-1 ring-white/10 hover:shadow-xl transition-shadow',
        className
      )}
    >
      <div className='flex items-center justify-between gap-2 mb-2'>
        <div className='flex items-center gap-2 text-sm font-medium'>
          <Wallet className='h-4 w-4' />
          Wallet
        </div>
        {verified ? (
          <span className='inline-flex items-center gap-1 text-[10px] bg-white/15 rounded-full px-2 py-0.5'>
            <ShieldCheck className='h-2.5 w-2.5' /> Verified
          </span>
        ) : (
          <span className='inline-flex items-center gap-1 text-[10px] bg-white/15 rounded-full px-2 py-0.5'>
            Pending
          </span>
        )}
      </div>
      <div className='text-2xl font-bold tabular-nums'>
        {isLoading
          ? '—'
          : verified
            ? usd.format(data?.available ?? 0)
            : '\u2022\u2022\u2022\u2022\u2022\u2022'}
      </div>
      <div className='mt-1 flex items-center justify-between text-[11px] text-white/80'>
        <span>{verified ? 'Available balance' : 'Activate to view balance'}</span>
        <span className='inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform'>
          Open
          <ArrowRight className='h-3 w-3' />
        </span>
      </div>
    </Link>
  );
}
