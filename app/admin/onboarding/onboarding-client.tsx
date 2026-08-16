'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2, Users, CreditCard, ArrowRight, Sparkles,
  Tag, GraduationCap, Zap, CheckCircle2, ChevronRight,
} from 'lucide-react';

interface Props {
  firstName: string;
  hasLeaseDocuments: boolean;
  hasStripeConnect: boolean;
  /** Days remaining in trial; -1 means already paying */
  trialDaysLeft: number;
}

type Path = 'fresh' | 'existing';

const STEPS = [
  {
    id: 'property',
    icon: Building2,
    color: 'emerald' as const,
    title: 'Add your first property',
    subtitle: 'See your rent collected, occupancy rate, and cash flow — all live on your dashboard.',
    why: 'This unlocks everything. Your full dashboard, rent tracking, maintenance queue, and analytics go live the moment you add one property.',
    cta: 'Add property',
    href: '/admin/dashboard/properties/new',
    existingTitle: 'Add your existing property',
    existingSubtitle: 'Import your portfolio in minutes — units, rent amounts, and addresses in one go.',
    existingHref: '/admin/import',
    existingCta: 'Import property',
  },
  {
    id: 'tenant',
    icon: Users,
    color: 'blue' as const,
    title: 'Invite a tenant',
    subtitle: 'Tenants get a secure link to pay rent online, sign leases, and submit maintenance requests.',
    why: 'One invite turns off "did you send the rent?" texts forever. Tenants pay through their portal, you get notified automatically.',
    cta: 'Invite tenant',
    href: '/admin/tenants/add',
    existingTitle: 'Invite your existing tenants',
    existingSubtitle: 'Send a bulk invite to all your current tenants so they can start paying online immediately.',
    existingHref: '/admin/tenants/add',
    existingCta: 'Invite tenants',
  },
  {
    id: 'bank',
    icon: CreditCard,
    color: 'violet' as const,
    title: 'Connect your bank account',
    subtitle: 'Link your bank once and rent payments deposit straight to you — no manual transfers.',
    why: 'This is what closes the loop. Tenant pays → money moves to your account automatically, with a full audit trail.',
    cta: 'Connect bank',
    href: '/admin/payouts',
    existingTitle: 'Connect your bank account',
    existingSubtitle: 'Set up once and every payment — existing and future — starts depositing automatically.',
    existingHref: '/admin/payouts',
    existingCta: 'Connect bank',
  },
] as const;

const COLOR_CLASSES = {
  emerald: {
    icon: 'bg-emerald-100 text-emerald-600',
    badge: 'bg-emerald-500',
    border: 'border-emerald-200 bg-emerald-50/40',
    cta: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    ring: 'ring-emerald-300',
    num: 'bg-emerald-600 text-white',
  },
  blue: {
    icon: 'bg-blue-100 text-blue-600',
    badge: 'bg-blue-500',
    border: 'border-blue-200 bg-blue-50/40',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
    ring: 'ring-blue-300',
    num: 'bg-blue-600 text-white',
  },
  violet: {
    icon: 'bg-violet-100 text-violet-600',
    badge: 'bg-violet-500',
    border: 'border-violet-200 bg-violet-50/40',
    cta: 'bg-violet-600 hover:bg-violet-700 text-white',
    ring: 'ring-violet-300',
    num: 'bg-violet-600 text-white',
  },
};

export default function OnboardingClient({
  firstName,
  hasLeaseDocuments,
  hasStripeConnect,
  trialDaysLeft,
}: Props) {
  // If they already used the lease builder, default to "existing tenants" path
  const [path, setPath] = useState<Path>(hasLeaseDocuments ? 'existing' : 'fresh');
  const [expandedStep, setExpandedStep] = useState<string | null>('property');

  const isAlreadyPaying = trialDaysLeft === -1;
  const showEarlyOffer = !isAlreadyPaying && trialDaysLeft >= 7;

  return (
    <main className='min-h-screen bg-slate-50 px-4 py-10 md:py-14'>
      <div className='max-w-2xl mx-auto space-y-8'>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className='text-center space-y-3'>
          <p className='text-xs font-semibold tracking-[0.25em] uppercase text-emerald-600'>
            Welcome, {firstName}
          </p>
          <h1 className='text-3xl md:text-4xl font-bold text-slate-900 leading-tight'>
            {path === 'existing'
              ? 'Let\'s move your portfolio online'
              : 'Let\'s get your first rent payment coming in'}
          </h1>
          <p className='text-slate-500 text-sm max-w-lg mx-auto'>
            {path === 'existing'
              ? 'Three steps and your tenants can start paying online, with every payment depositing straight to your bank.'
              : 'Follow these three steps and PropertyFlow handles the rest — reminders, tracking, deposits, everything.'}
          </p>
        </div>

        {/* ── Path selector ─────────────────────────────────────────────── */}
        <div className='flex gap-3 p-1 bg-slate-200 rounded-xl'>
          <button
            type='button'
            onClick={() => setPath('fresh')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              path === 'fresh'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            I'm starting fresh
          </button>
          <button
            type='button'
            onClick={() => setPath('existing')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              path === 'existing'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            I have existing tenants
          </button>
        </div>

        {/* ── Early upgrade offer ───────────────────────────────────────── */}
        {showEarlyOffer && (
          <div className='flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3'>
            <Tag className='h-4 w-4 text-amber-600 flex-shrink-0' />
            <p className='text-sm text-amber-800 flex-1'>
              <span className='font-semibold'>Upgrade this week — get 10% off your first month.</span>
              {' '}Use code{' '}
              <span className='font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded text-xs'>EARLY10</span>
              {' '}at checkout.
            </p>
            <Link
              href='/admin/subscription'
              className='flex-shrink-0 text-xs font-semibold text-amber-700 bg-white border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap'
            >
              See plans →
            </Link>
          </div>
        )}

        {/* ── Steps ─────────────────────────────────────────────────────── */}
        <div className='space-y-3'>
          {STEPS.map((step, idx) => {
            const col = COLOR_CLASSES[step.color];
            const Icon = step.icon;
            const isOpen = expandedStep === step.id;
            const title = path === 'existing' ? step.existingTitle : step.title;
            const subtitle = path === 'existing' ? step.existingSubtitle : step.subtitle;
            const href = path === 'existing' ? step.existingHref : step.href;
            const cta = path === 'existing' ? step.existingCta : step.cta;

            return (
              <div
                key={step.id}
                className={`rounded-2xl border-2 bg-white overflow-hidden transition-all ${
                  isOpen ? col.border + ' shadow-sm' : 'border-slate-200'
                }`}
              >
                <button
                  type='button'
                  onClick={() => setExpandedStep(isOpen ? null : step.id)}
                  className='w-full flex items-center gap-4 p-5 text-left'
                >
                  {/* Step number */}
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isOpen ? col.num : 'bg-slate-100 text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Icon */}
                  <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${col.icon}`}>
                    <Icon className='h-5 w-5' />
                  </div>

                  {/* Text */}
                  <div className='flex-1 min-w-0 text-left'>
                    <p className='font-semibold text-slate-900 text-sm leading-tight'>{title}</p>
                    {!isOpen && (
                      <p className='text-xs text-slate-500 mt-0.5 leading-snug line-clamp-1'>{subtitle}</p>
                    )}
                  </div>

                  <ChevronRight className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                  <div className='px-5 pb-5 space-y-4'>
                    <p className='text-sm text-slate-600 leading-relaxed'>{subtitle}</p>

                    {/* "Why this matters" callout */}
                    <div className='flex gap-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3'>
                      <Zap className='h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5' />
                      <p className='text-xs text-slate-600 leading-relaxed'>{step.why}</p>
                    </div>

                    <Link
                      href={href}
                      className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors ${col.cta}`}
                    >
                      {cta} <ArrowRight className='h-4 w-4' />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Skip + explore ────────────────────────────────────────────── */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4 pt-2'>
          <Link
            href='/admin/overview'
            className='text-sm text-slate-400 hover:text-slate-600 transition-colors'
          >
            Skip for now and explore the dashboard
          </Link>

          {/* PM University */}
          <Link
            href='/admin/university'
            className='inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors'
          >
            <GraduationCap className='h-4 w-4' />
            PM University — guides &amp; tutorials
          </Link>
        </div>

        {/* ── How automation works ──────────────────────────────────────── */}
        <div className='rounded-2xl border border-slate-200 bg-white p-6 space-y-4'>
          <div className='flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-emerald-500' />
            <h2 className='text-sm font-bold text-slate-900'>How PropertyFlow automation works</h2>
          </div>
          <div className='space-y-3'>
            {[
              {
                icon: '📅',
                title: 'Automatic rent reminders',
                body: 'Tenants get an email/SMS 3 days before rent is due. You never have to ask.',
              },
              {
                icon: '💳',
                title: 'Online payments',
                body: 'Tenants pay by card or bank transfer through their portal. Funds hit your bank on the same schedule every month.',
              },
              {
                icon: '🔧',
                title: 'Maintenance on autopilot',
                body: 'Tenants submit requests, you assign them to a contractor, and the status updates automatically — no phone tag.',
              },
              {
                icon: '📊',
                title: 'Rent roll & reports',
                body: 'Your rent roll, occupancy, and P&L are always up to date. Export to PDF or connect QuickBooks in one click.',
              },
            ].map((item) => (
              <div key={item.title} className='flex gap-3'>
                <span className='text-lg flex-shrink-0 leading-none mt-0.5'>{item.icon}</span>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>{item.title}</p>
                  <p className='text-xs text-slate-500 mt-0.5 leading-relaxed'>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
