'use client';

import Link from 'next/link';
import { Zap, Bell, Clock, BadgeCheck } from 'lucide-react';

/**
 * Shown on the Financial Settings page for Starter-tier landlords.
 * Surfaces the automatic rent reminders upsell at exactly the right moment —
 * when they're already thinking about rent automation.
 */
export function RentReminderUpsellCard() {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Bell className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Automatic Rent Reminders</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Pro
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Tenants get an email reminder 3 days before rent is due — automatically, every month, without you doing anything.
          </p>
        </div>
      </div>

      {/* What it does */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: Clock,
            title: '3 days before due',
            desc: 'A friendly reminder goes out automatically on your schedule.',
          },
          {
            icon: Zap,
            title: 'Zero effort from you',
            desc: 'Set it once when you set up your lease. It runs every month.',
          },
          {
            icon: BadgeCheck,
            title: 'Fewer late payments',
            desc: 'Landlords report significantly fewer overdue payments after enabling reminders.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-violet-400 flex-shrink-0" />
              <p className="text-xs font-bold text-white">{title}</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-white/10">
        <p className="text-xs text-slate-400">
          Available on <span className="font-semibold text-white">Pro ($99/mo)</span> and Enterprise plans.
          Upgrade in 30 seconds — your existing setup carries over.
        </p>
        <Link
          href="/admin/billing"
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}
