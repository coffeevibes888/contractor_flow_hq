'use client';

/**
 * Four big action buttons under the balance card. Each is disabled (with
 * a tooltip explaining why) until the user is verified. The icons match
 * the lucide style used elsewhere in the dashboard.
 */

import { ArrowDownToLine, Send, HardHat, ArrowUpFromLine } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  ready: boolean;
  /** Friendly explanation when ready=false (shown in tooltips). */
  blockedReason: string;
  /** Hide Pay Contractor on the contractor's own wallet — they get paid, they don't pay other contractors. */
  hidePayContractor?: boolean;
  /** Rename "Withdraw" to "Cash Out" on the contractor wallet to match marketplace copy. */
  withdrawLabel?: string;
  onAdd: () => void;
  onSend: () => void;
  onPayContractor: () => void;
  onWithdraw: () => void;
}

export function WalletActions({
  ready,
  blockedReason,
  hidePayContractor = false,
  withdrawLabel = 'Withdraw',
  onAdd,
  onSend,
  onPayContractor,
  onWithdraw,
}: Props) {
  const buttons = [
    { label: 'Add Funds', icon: ArrowDownToLine, onClick: onAdd, key: 'add' },
    { label: 'Send', icon: Send, onClick: onSend, key: 'send' },
    ...(hidePayContractor
      ? []
      : [
          {
            label: 'Pay Contractor',
            icon: HardHat,
            onClick: onPayContractor,
            key: 'pay',
          },
        ]),
    {
      label: withdrawLabel,
      icon: ArrowUpFromLine,
      onClick: onWithdraw,
      key: 'withdraw',
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'grid grid-cols-2 gap-3',
          hidePayContractor ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
        )}
      >
        {buttons.map(({ label, icon: Icon, onClick, key }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                type='button'
                disabled={!ready}
                onClick={onClick}
                className={cn(
                  'group relative flex flex-col items-center gap-2 rounded-2xl',
                  'border border-slate-200 bg-white p-4 transition-all duration-150',
                  'hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:border-slate-200',
                )}
              >
                <span className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm group-hover:scale-105 transition-transform'>
                  <Icon className='h-5 w-5' />
                </span>
                <span className='text-xs sm:text-sm font-semibold text-slate-700'>
                  {label}
                </span>
              </button>
            </TooltipTrigger>
            {!ready && (
              <TooltipContent side='bottom'>
                <p className='max-w-[220px] text-xs'>{blockedReason}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
