'use client';

import { Building2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PaymentMethodType = 'ach' | 'card';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  onMethodChange: (method: PaymentMethodType) => void;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className='space-y-4'>
      <p className='text-sm font-medium text-slate-300'>Select Payment Method</p>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        {/* Bank Account (ACH) Option */}
        <button
          type='button'
          onClick={() => onMethodChange('ach')}
          className={cn(
            'rounded-lg border-2 p-4 transition-all cursor-pointer text-left',
            selectedMethod === 'ach'
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-white/10 bg-slate-800/40 hover:border-emerald-500/40'
          )}
        >
          <div className='flex items-start gap-3'>
            <div className={cn(
              'rounded-full p-2',
              selectedMethod === 'ach' ? 'bg-emerald-600' : 'bg-emerald-500'
            )}>
              <Building2 className='h-4 w-4 text-white' />
            </div>
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <h4 className='text-sm font-semibold text-white'>Bank Account (ACH)</h4>
                <span className='text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium'>
                  FREE
                </span>
              </div>
              <p className='text-xs text-emerald-400 mt-1'>No convenience fee • 5-7 days</p>
              <p className='text-xs text-emerald-400 mt-1'>✓ Can set up recurring payments</p>
            </div>
            {selectedMethod === 'ach' && (
              <div className='h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-1'>
                <svg
                  className='h-3 w-3 text-white'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path d='M5 13l4 4L19 7'></path>
                </svg>
              </div>
            )}
          </div>
        </button>

        {/* Card / Wallet Option */}
        <button
          type='button'
          onClick={() => onMethodChange('card')}
          className={cn(
            'rounded-lg border-2 p-4 transition-all cursor-pointer text-left',
            selectedMethod === 'card'
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-white/10 bg-slate-800/40 hover:border-indigo-500/40'
          )}
        >
          <div className='flex items-start gap-3'>
            <div className={cn(
              'rounded-full p-2',
              selectedMethod === 'card' ? 'bg-indigo-600' : 'bg-indigo-500'
            )}>
              <CreditCard className='h-4 w-4 text-white' />
            </div>
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <h4 className='text-sm font-semibold text-white'>Card / Wallet</h4>
                <span className='text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium'>
                  +$2
                </span>
              </div>
              <p className='text-xs text-indigo-400 mt-1'>Convenience fee • Instant</p>
              <p className='text-xs text-indigo-400 mt-1'>Apple Pay, Google Pay, Cards</p>
            </div>
            {selectedMethod === 'card' && (
              <div className='h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1'>
                <svg
                  className='h-3 w-3 text-white'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path d='M5 13l4 4L19 7'></path>
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
