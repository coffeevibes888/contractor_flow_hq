/**
 * AccountingUpsellBanner — Slim inline banner placed on pages where the user
 * has access but there are higher-tier features above them.
 *
 * Used on:
 *  - Accounting hub (shows what the next tier unlocks)
 *  - Analytics page (nudges Starter → Pro, Pro → Enterprise)
 *  - Any page that wants a contextual upsell nudge
 *
 * Usage:
 *   <AccountingUpsellBanner
 *     currentTier="starter"
 *     message="Upgrade to Pro to unlock P&L, Balance Sheet, Tenant Ledger, and more."
 *     upgradeHref="/admin/settings/subscription?upgrade=pro"
 *   />
 */

import Link from 'next/link';
import { Crown, ArrowRight, Sparkles } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/config/subscription-tiers';

interface AccountingUpsellBannerProps {
  /** The user's current plan — controls the colour palette */
  currentTier: SubscriptionTier;
  /** The benefit-first message to show in the banner */
  message: string;
  /** Where the "Upgrade" button links to */
  upgradeHref: string;
  /** Optional label for the upgrade button (defaults to "Upgrade") */
  upgradeLabel?: string;
}

export default function AccountingUpsellBanner({
  currentTier,
  message,
  upgradeHref,
  upgradeLabel,
}: AccountingUpsellBannerProps) {
  // Starter → Pro nudge: amber palette
  // Pro → Enterprise nudge: violet palette
  const isToEnterprise = currentTier === 'pro';

  const wrapperClass = isToEnterprise
    ? 'bg-violet-50 border-violet-200'
    : 'bg-amber-50 border-amber-200';
  const iconClass = isToEnterprise ? 'text-violet-600' : 'text-amber-600';
  const textClass = isToEnterprise ? 'text-violet-900' : 'text-amber-900';
  const mutedClass = isToEnterprise ? 'text-violet-800/80' : 'text-amber-800/80';
  const buttonClass = isToEnterprise
    ? 'bg-violet-600 hover:bg-violet-700 text-white'
    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white';

  const nextTierName = isToEnterprise ? 'Enterprise' : 'Pro';
  const label = upgradeLabel ?? `Upgrade to ${nextTierName}`;

  return (
    <div className={`rounded-xl border ${wrapperClass} px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3`}>
      {/* Icon + message */}
      <div className='flex items-start gap-3 flex-1 min-w-0'>
        <div className={`mt-0.5 shrink-0 ${iconClass}`}>
          <Sparkles className='h-4 w-4' />
        </div>
        <p className={`text-sm leading-relaxed ${mutedClass}`}>
          <span className={`font-semibold ${textClass}`}>
            <Crown className='h-3 w-3 inline mr-1 mb-0.5' />
            {nextTierName} feature:
          </span>{' '}
          {message}
        </p>
      </div>

      {/* CTA */}
      <Link
        href={upgradeHref}
        className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${buttonClass}`}
      >
        {label}
        <ArrowRight className='h-3.5 w-3.5' />
      </Link>
    </div>
  );
}
