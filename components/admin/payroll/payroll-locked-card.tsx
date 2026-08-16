'use client';

/**
 * Shown to Starter (no-payroll) users in place of the payroll panel.
 * Includes the user's current plan name + an upgrade CTA + a brief
 * feature list, per the spec.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Lock, Check, ArrowRight } from 'lucide-react';

interface Props {
  currentTier: 'starter' | 'pro' | 'enterprise';
}

const FEATURES = [
  'Pay team members directly from your Wallet',
  'Stripe-hosted W9 + identity verification',
  'Automatic 1099-NEC filing at year end',
  '$1 flat fee per payment, no withholding',
  'Pay schedules + overtime tracking on Enterprise',
];

export function PayrollLockedCard({ currentTier }: Props) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 max-w-2xl'>
      <div className='flex items-center gap-3'>
        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700'>
          <Lock className='h-5 w-5' />
        </div>
        <div>
          <h3 className='text-base font-semibold text-slate-900'>
            Payroll requires Pro or Enterprise
          </h3>
          <p className='text-xs text-slate-500'>
            You&apos;re on the{' '}
            <span className='font-medium capitalize text-slate-700'>
              {currentTier}
            </span>{' '}
            plan. Upgrade to start paying team members through Property Flow.
          </p>
        </div>
      </div>

      <ul className='mt-5 space-y-2'>
        {FEATURES.map((f) => (
          <li key={f} className='flex items-start gap-2 text-sm text-slate-700'>
            <Check className='h-4 w-4 shrink-0 mt-0.5 text-emerald-600' />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className='mt-6 flex flex-col sm:flex-row gap-3'>
        <Link href='/admin/settings/billing' className='inline-flex'>
          <Button className='bg-sky-600 hover:bg-sky-700'>
            See plans
            <ArrowRight className='h-4 w-4 ml-1' />
          </Button>
        </Link>
        <Link
          href='/admin/settings/billing'
          className='inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2'
        >
          Compare features
        </Link>
      </div>
    </div>
  );
}
