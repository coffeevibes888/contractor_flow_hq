'use client';

/**
 * Realistic Property Flow HQ debit card visualization. Used as the
 * default "front" of the card on the wallet page. The PAN is masked by
 * default; the parent passes in `revealed` props (PAN, CVV, exp) when
 * the user passes 2FA.
 */

import { Wallet, Snowflake } from 'lucide-react';
import { motion } from 'framer-motion';
import type { IssuingCardSummary } from './types';

interface Props {
  card: IssuingCardSummary;
  cardholderName: string;
  /** Full 16-digit PAN to display when the user has revealed it. */
  revealedPan?: string | null;
  revealedCvv?: string | null;
  revealedExp?: string | null;
}

const formatPan = (pan: string) =>
  pan.replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') ?? pan;

export function CardFace({
  card,
  cardholderName,
  revealedPan,
  revealedCvv,
  revealedExp,
}: Props) {
  const masked = `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${card.last4 ?? '\u2022\u2022\u2022\u2022'}`;
  const exp =
    revealedExp ||
    (card.expMonth && card.expYear
      ? `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
      : '\u2022\u2022/\u2022\u2022');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className='relative w-full max-w-[420px] aspect-[1.586/1] rounded-2xl text-white overflow-hidden shadow-xl ring-1 ring-white/10'
    >
      {/* Background — sky-cyan gradient that matches the wallet card */}
      <div className='absolute inset-0 bg-gradient-to-br from-sky-700 via-sky-800 to-cyan-900' />
      <div className='absolute inset-0 opacity-40 [background:radial-gradient(circle_at_85%_15%,white,transparent_50%)]' />
      <div className='absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl' />

      {/* Frozen overlay */}
      {card.frozen && (
        <div className='absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] z-20 flex items-center justify-center'>
          <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold'>
            <Snowflake className='h-3.5 w-3.5' /> Card frozen
          </div>
        </div>
      )}

      <div className='relative z-10 p-5 sm:p-6 flex flex-col h-full'>
        {/* Top row — brand + chip */}
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-2 text-sm font-semibold tracking-tight'>
            <Wallet className='h-4 w-4' />
            Property Flow
          </div>
          <span className='text-[10px] uppercase tracking-[0.18em] text-sky-100/80 font-semibold'>
            {card.type === 'virtual' ? 'Virtual' : 'Debit'}
          </span>
        </div>

        {/* Chip placeholder */}
        <div className='mt-6 mb-3 flex items-center gap-3'>
          <div className='h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 ring-1 ring-amber-100/40 shadow-inner' />
          <div className='h-7 w-9 rounded-full bg-white/10 border border-white/20' />
        </div>

        {/* PAN */}
        <div className='font-mono tracking-[0.18em] text-lg sm:text-xl tabular-nums'>
          {revealedPan ? formatPan(revealedPan) : masked}
        </div>

        {/* Cardholder + exp + cvv */}
        <div className='mt-auto flex items-end justify-between gap-3 text-[11px] uppercase tracking-wide'>
          <div className='space-y-0.5 min-w-0'>
            <div className='text-sky-100/70'>Cardholder</div>
            <div className='text-sm font-semibold tracking-normal truncate'>
              {cardholderName}
            </div>
          </div>
          <div className='space-y-0.5 text-right'>
            <div className='text-sky-100/70'>Exp · CVV</div>
            <div className='text-sm font-mono tracking-wide tabular-nums'>
              {exp} · {revealedCvv ?? '\u2022\u2022\u2022'}
            </div>
          </div>
          <div className='text-right'>
            <div className='font-bold tracking-[0.2em] text-base'>VISA</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
