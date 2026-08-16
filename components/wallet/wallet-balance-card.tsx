'use client';

/**
 * Big balance card with reveal/hide animation. The number is blurred by
 * default (Cash App style) and crossfades to plaintext on click. We never
 * loop or auto-poll — the parent passes the SWR data in.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Building2, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WalletBalanceResponse } from './types';

interface Props {
  balance: WalletBalanceResponse;
  loading?: boolean;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function WalletBalanceCard({ balance, loading }: Props) {
  const [revealed, setRevealed] = useState(false);

  const status = balance.onboardingStatus;
  const verified = status === 'verified' && balance.ready;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br',
        'from-sky-600 via-sky-700 to-cyan-700 text-white',
        'shadow-xl shadow-sky-900/20 ring-1 ring-white/10',
      )}
    >
      <div className='absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,white,transparent_55%)]' />
      <div className='relative z-10 p-6 sm:p-8 space-y-6'>
        {/* Top row */}
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-sm text-sky-100/90'>
              <Building2 className='h-4 w-4' />
              <span className='font-medium'>{balance.bankName}</span>
              <Badge
                variant='secondary'
                className='bg-white/15 text-white border-0 text-[10px] tracking-wide'
              >
                Fifth Third Bank
              </Badge>
            </div>
            <div className='text-xs text-sky-100/70'>Available balance</div>
          </div>

          <StatusPill status={status} verified={verified} />
        </div>

        {/* Balance */}
        <div className='flex items-end gap-3'>
          <div className='text-4xl sm:text-5xl font-bold tracking-tight tabular-nums'>
            <AnimatePresence initial={false} mode='wait'>
              {revealed ? (
                <motion.span
                  key='shown'
                  initial={{ opacity: 0, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(8px)' }}
                  transition={{ duration: 0.25 }}
                  className='inline-block'
                >
                  {loading ? '—' : usd.format(balance.available)}
                </motion.span>
              ) : (
                <motion.span
                  key='hidden'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, filter: 'blur(10px)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className='inline-block select-none'
                >
                  {loading ? '—' : usd.format(balance.available)}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='h-9 w-9 rounded-full text-white/90 hover:bg-white/15 hover:text-white -mb-1'
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide balance' : 'Show balance'}
          >
            {revealed ? (
              <EyeOff className='h-4 w-4' />
            ) : (
              <Eye className='h-4 w-4' />
            )}
          </Button>
        </div>

        {/* Pending row */}
        {(balance.pending > 0 || balance.outboundPending > 0) && (
          <div className='flex flex-wrap gap-x-6 gap-y-1 text-xs text-sky-100/80'>
            {balance.pending > 0 && (
              <span>
                <Clock className='inline h-3 w-3 mr-1' />
                {usd.format(balance.pending)} arriving soon
              </span>
            )}
            {balance.outboundPending > 0 && (
              <span>
                <Clock className='inline h-3 w-3 mr-1' />
                {usd.format(balance.outboundPending)} pending out
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  status,
  verified,
}: {
  status: WalletBalanceResponse['onboardingStatus'];
  verified: boolean;
}) {
  if (verified) {
    return (
      <Badge className='bg-emerald-400/20 text-emerald-50 border border-emerald-300/30 hover:bg-emerald-400/20'>
        <ShieldCheck className='h-3 w-3 mr-1' /> Verified
      </Badge>
    );
  }
  if (status === 'restricted' || status === 'invalid') {
    return (
      <Badge className='bg-rose-400/20 text-rose-50 border border-rose-300/30 hover:bg-rose-400/20'>
        <AlertCircle className='h-3 w-3 mr-1' /> Action needed
      </Badge>
    );
  }
  return (
    <Badge className='bg-amber-400/20 text-amber-50 border border-amber-300/30 hover:bg-amber-400/20'>
      <Clock className='h-3 w-3 mr-1' />
      {status === 'in_review' ? 'In review' : 'Pending verification'}
    </Badge>
  );
}
