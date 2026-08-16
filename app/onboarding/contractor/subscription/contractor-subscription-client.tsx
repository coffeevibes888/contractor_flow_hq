'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Check,
  Zap,
  Wrench,
  Crown,
  ArrowRight,
  Sparkles,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { trackMetaEvent } from '@/lib/analytics/meta-pixel';
import { trackRedditEvent } from '@/lib/analytics/reddit-pixel';

interface ContractorSubscriptionClientProps {
  userName: string;
}

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    description: 'Everything a solo contractor needs — jobs, invoicing, CRM, inventory & equipment.',
    unitLimit: 'Solo operator',
    icon: Wrench,
    popular: false,
    comingSoon: false,
    features: [
      'Unlimited job & work order management',
      'Professional invoicing & estimates',
      'Online payment collection (Stripe)',
      'Client & contact management (CRM)',
      'Inventory & equipment tracking',
      'Customer portal & communication history',
      'Marketing campaigns & referrals',
      'Your own branded subdomain profile',
      'Contractor Marketplace listing',
      'Photo & document uploads per job',
      'Automated invoice payment reminders',
      'Mobile-friendly — works on any device',
    ],
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-300',
    buttonStyle: 'bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-500/20',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    description: 'Everything in Starter plus team management, scheduling & priority support.',
    unitLimit: 'Up to 20 team members',
    icon: Zap,
    popular: true,
    comingSoon: false,
    features: [
      'Everything in Starter',
      'Up to 20 team members',
      'Team scheduling & job assignment',
      'GPS time clock & timesheet approvals',
      'Team Slack-like internal chat',
      'QuickBooks & accounting sync',
      'Advanced profit & loss reporting',
      'Subcontractor management',
      'Payroll integration',
      'Priority support',
    ],
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-300',
    buttonStyle:
      'bg-gradient-to-r from-rose-500 to-orange-400 text-white hover:from-rose-400 hover:to-orange-300 shadow-lg shadow-rose-500/30',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    description: 'Unlimited everything with full business operations suite.',
    unitLimit: 'Unlimited team members',
    icon: Crown,
    popular: false,
    comingSoon: false,
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Payroll processing & direct deposit',
      'Advanced roles, permissions & divisions',
      'Multi-location & multi-trade dashboard',
      'Custom branding & white-label options',
      'Performance & productivity reports',
      'Dedicated account manager',
      'API access & third-party integrations',
      'Priority 24/7 support',
    ],
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    buttonStyle:
      'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30',
  },
];

export default function ContractorSubscriptionClient({
  userName,
}: ContractorSubscriptionClientProps) {
  const searchParams = useSearchParams();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestedPlan = searchParams.get('plan');

  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      setError('Checkout was canceled. Please select a plan to continue.');
    }
  }, [searchParams]);

  // Fire Meta Pixel Lead + CompleteRegistration once on mount.
  // The actual Purchase event is fired server-side from the Stripe webhook.
  useEffect(() => {
    trackMetaEvent('CompleteRegistration', {
      content_name: 'contractor_signup',
      status: 'account_created',
    });
    trackMetaEvent('Lead', {
      content_category: 'contractor',
      content_name: 'contractor_trial_started',
      value: 39,
      currency: 'USD',
    });
    // Reddit equivalents
    trackRedditEvent('SignUp', {
      currency: 'USD',
      value: 39,
    });
    trackRedditEvent('Lead', {
      currency: 'USD',
      value: 39,
    });
  }, []);

  const handleSelectPlan = async (tierId: string) => {
    setLoadingTier(tierId);
    setError(null);

    const tierMeta = tiers.find((t) => t.id === tierId);
    trackMetaEvent('InitiateCheckout', {
      content_ids: tierId,
      content_name: `contractor_${tierId}`,
      content_category: 'contractor_subscription',
      value: tierMeta?.price ?? 39,
      currency: 'USD',
    });
    trackRedditEvent('AddToCart', {
      currency: 'USD',
      value: tierMeta?.price ?? 39,
      itemCount: 1,
      products: [{ id: tierId, name: `contractor_${tierId}`, category: 'contractor_subscription' }],
    });

    try {
      const response = await fetch('/api/contractor/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.message || 'Failed to start checkout. Please try again.');
        setLoadingTier(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoadingTier(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500/20 to-orange-500/20 px-4 py-1.5 text-sm font-medium text-rose-300 ring-1 ring-rose-500/30">
            <Sparkles className="h-4 w-4" />
            Welcome, {userName.split(' ')[0]}!
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {suggestedPlan ? 'Review your plan selection' : 'Choose your plan'}
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {suggestedPlan
              ? 'Take a moment to review all plans. You can upgrade or downgrade anytime.'
              : '14-day free trial — no charge until day 15. Cancel anytime, no contracts.'}
          </p>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center text-red-300 flex items-center justify-center gap-2"
          >
            <AlertCircle className="h-5 w-5" />
            {error}
          </motion.div>
        )}

        {/* Pricing Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          {tiers.map((tier, index) => {
            const Icon = tier.icon;
            const isPopular = tier.popular;
            const isLoading = loadingTier === tier.id;
            const isSuggested = suggestedPlan === tier.id;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className={`relative group rounded-2xl border bg-slate-900/60 backdrop-blur-sm p-6 flex flex-col transition-all duration-300 ${
                  isSuggested
                    ? 'border-rose-500/70 hover:border-rose-500 ring-2 ring-rose-500/30 scale-105'
                    : isPopular
                    ? 'border-orange-500/50 hover:border-orange-500 ring-1 ring-orange-500/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Suggested or Popular badge */}
                {isSuggested ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-rose-500/50 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      YOUR SELECTION
                    </div>
                  </div>
                ) : isPopular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-rose-500 to-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-rose-500/50 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      MOST POPULAR
                    </div>
                  </div>
                ) : null}

                {/* Tier header */}
                <div className={`flex items-center gap-3 mb-3 ${isPopular ? 'pt-2' : ''}`}>
                  <div className={`rounded-xl ${tier.iconBg} p-2.5 border border-white/10`}>
                    <Icon className={`h-5 w-5 ${tier.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    <p className="text-xs text-slate-400">{tier.unitLimit}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">${tier.price}</span>
                    <span className="text-slate-400 text-sm">/month</span>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mb-4">{tier.description}</p>

                {/* CTA Button */}
                <button
                  onClick={() => !tier.comingSoon && handleSelectPlan(tier.id)}
                  disabled={loadingTier !== null || tier.comingSoon}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 mb-5 disabled:opacity-50 disabled:cursor-not-allowed ${tier.buttonStyle}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : tier.comingSoon ? (
                    <>Coming Soon</>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Features list */}
                <div className="flex-1">
                  <ul className="space-y-2">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <div
                          className={`mt-0.5 rounded-full p-0.5 ${
                            isPopular
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 pt-4"
        >
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>No setup fees</span>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-sm text-slate-500"
        >
          Questions?{' '}
          <a href="/contact" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
            Talk to our team
          </a>
        </motion.p>
      </div>
    </main>
  );
}
