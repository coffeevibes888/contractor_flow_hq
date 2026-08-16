'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Users, CreditCard, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Tag } from 'lucide-react';

export interface SetupWizardStep {
  id: 'property' | 'tenant' | 'bank';
  done: boolean;
}

interface Props {
  steps: SetupWizardStep[];
  /** Days remaining in free trial — used to show early-upgrade offer */
  trialDaysLeft: number;
  /** Whether they are still on trial (no active paid sub) */
  isTrialing: boolean;
  /** When provided, the tenant step opens an invite dialog instead of navigating */
  onInviteTenant?: () => void;
}

const STEP_META = {
  property: {
    icon: Building2,
    title: 'Add your first property',
    value: 'Unlocks your rent dashboard, occupancy chart, and maintenance queue.',
    href: '/admin/dashboard/properties/new',
    cta: 'Add property',
    color: 'emerald',
  },
  tenant: {
    icon: Users,
    title: 'Invite a tenant',
    value: 'Tenants pay online, you get notified automatically — no more chasing rent.',
    href: '/admin/tenants/add',
    cta: 'Invite tenant',
    color: 'blue',
  },
  bank: {
    icon: CreditCard,
    title: 'Connect your bank',
    value: 'Connect once and every rent payment deposits straight to your account.',
    href: '/admin/payouts',
    cta: 'Connect bank',
    color: 'violet',
  },
} as const;

const COLOR = {
  emerald: {
    icon: 'bg-emerald-100 text-emerald-600',
    ring: 'ring-emerald-400',
    cta: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    step: 'bg-emerald-500',
  },
  blue: {
    icon: 'bg-blue-100 text-blue-600',
    ring: 'ring-blue-400',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
    step: 'bg-blue-500',
  },
  violet: {
    icon: 'bg-violet-100 text-violet-600',
    ring: 'ring-violet-400',
    cta: 'bg-violet-600 hover:bg-violet-700 text-white',
    step: 'bg-violet-500',
  },
} as const;

export default function SetupWizardStrip({ steps, trialDaysLeft, isTrialing, onInviteTenant }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  // Show 10% early offer only if still trialing with 7+ days left (not desperate — celebratory)
  const showEarlyOffer = isTrialing && trialDaysLeft >= 7;

  if (allDone) return null;

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      {/* Header row */}
      <button
        type='button'
        onClick={() => setCollapsed((v) => !v)}
        className='w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors text-left'
      >
        <div className='flex items-center gap-3 min-w-0'>
          <div className='flex-shrink-0'>
            <div className='relative h-8 w-8'>
              <svg className='h-8 w-8 -rotate-90' viewBox='0 0 32 32'>
                <circle cx='16' cy='16' r='13' fill='none' stroke='#e5e7eb' strokeWidth='3' />
                <circle
                  cx='16' cy='16' r='13'
                  fill='none'
                  stroke='#10b981'
                  strokeWidth='3'
                  strokeDasharray={`${2 * Math.PI * 13}`}
                  strokeDashoffset={`${2 * Math.PI * 13 * (1 - pct / 100)}`}
                  strokeLinecap='round'
                />
              </svg>
              <span className='absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700'>
                {doneCount}/{steps.length}
              </span>
            </div>
          </div>
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-gray-900 leading-tight'>
              Get the most out of PropertyFlow
            </p>
            <p className='text-[11px] text-gray-500'>
              {doneCount === 0
                ? 'Complete 3 quick steps to start collecting rent automatically'
                : `${steps.length - doneCount} step${steps.length - doneCount !== 1 ? 's' : ''} left`}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2 flex-shrink-0'>
          {showEarlyOffer && (
            <span className='hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5'>
              <Tag className='h-3 w-3' />
              10% off if you upgrade this week
            </span>
          )}
          {collapsed ? (
            <ChevronDown className='h-4 w-4 text-gray-400' />
          ) : (
            <ChevronUp className='h-4 w-4 text-gray-400' />
          )}
        </div>
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className='border-t border-gray-100'>
          <div className='grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 px-4 py-3 gap-y-3 sm:gap-y-0'>
            {steps.map((step) => {
              const meta = STEP_META[step.id];
              const col = COLOR[meta.color];
              const Icon = meta.icon;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-start gap-2 sm:px-4 first:pl-0 last:pr-0 py-1 ${step.done ? 'opacity-50' : ''}`}
                >
                  {/* Icon + status row */}
                  <div className='flex items-center gap-2'>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${col.icon}`}>
                      <Icon className='h-4 w-4' />
                    </div>
                    {step.done ? (
                      <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                    ) : (
                      <div className='h-4 w-4 rounded-full border-2 border-gray-300 bg-gray-50' />
                    )}
                  </div>

                  {/* Text */}
                  <div className='min-w-0'>
                    <p className={`text-sm font-semibold leading-tight ${step.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {meta.title}
                    </p>
                    {!step.done && (
                      <p className='text-[11px] text-gray-500 leading-snug mt-0.5'>{meta.value}</p>
                    )}
                  </div>

                  {/* CTA */}
                  {!step.done && (
                    step.id === 'tenant' && onInviteTenant ? (
                      <button
                        onClick={onInviteTenant}
                        className={`mt-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${col.cta}`}
                      >
                        {meta.cta}
                      </button>
                    ) : (
                      <Link
                        href={meta.href}
                        className={`mt-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${col.cta}`}
                      >
                        {meta.cta}
                      </Link>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Early upgrade offer footer */}
          {showEarlyOffer && (
            <div className='flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-amber-50/60'>
              <Sparkles className='h-4 w-4 text-amber-500 flex-shrink-0' />
              <p className='text-xs text-amber-800 flex-1'>
                <span className='font-semibold'>Upgrade this week and get 10% off your first month.</span>
                {' '}Use code <span className='font-mono font-bold'>EARLY10</span> at checkout.
              </p>
              <Link
                href='/admin/subscription'
                className='flex-shrink-0 text-xs font-semibold text-amber-700 bg-white border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors'
              >
                See plans
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
