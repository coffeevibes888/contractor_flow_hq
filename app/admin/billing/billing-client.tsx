'use client';

import { useState, useEffect } from 'react';
import {
  Check,
  Zap,
  Building2,
  Crown,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Lock,
  ShieldCheck,
  CreditCard,
  BadgeCheck,
  CheckCircle2,
} from 'lucide-react';
import { YEARLY_DISCOUNT_PERCENT, getYearlyPrice } from '@/lib/config/subscription-tiers';
import { trackMetaEvent } from '@/lib/analytics/meta-pixel';
import { trackRedditEvent } from '@/lib/analytics/reddit-pixel';

interface BillingClientProps {
  userName: string;
  hasPaidPlan: boolean;
  daysLeft: number;
  trialEndDate: string | null;
  currentTier: string | null;
  reason: string | null;
  canceledCheckout: boolean;
  propertiesCount: number;
  /** Name of the first property — used to personalise the trial-ended headline */
  firstPropertyName: string | null;
}

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    description: 'Perfect for small landlords.',
    unitLimit: 'Up to 24 units',
    icon: Building2,
    popular: false,
    features: [
      { name: 'Up to 24 units', included: true },
      { name: 'Online rent collection', included: true },
      { name: 'Custom subdomain portal', included: true },
      { name: 'Maintenance ticket system', included: true },
      { name: 'Digital leases with E-Sign', included: true },
      { name: 'Unlimited leases & applications', included: true },
      { name: 'Free Lease Builder', included: true },
      { name: 'ID & Paystub Scanner', included: true },
    ],
    cta: 'Choose Starter',
    iconBg: 'bg-blue-500/20',
    buttonClass: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-400 hover:to-cyan-400 shadow-lg shadow-blue-500/30',
    cardClass: 'bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 border-black shadow-2xl',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    description: 'For growing portfolios.',
    unitLimit: 'Up to 150 units',
    icon: Zap,
    popular: true,
    features: [
      { name: 'Everything in Starter', included: true },
      { name: 'Up to 150 units', included: true },
      { name: 'QuickBooks & TurboTax integration', included: true },
      { name: 'Automatic rent reminders', included: true },
      { name: 'Auto late fee charges', included: true },
      { name: 'Up to 5 team members', included: true },
      { name: 'Team management & chat', included: true },
      { name: 'Advanced analytics', included: true },
    ],
    cta: 'Choose Pro',
    iconBg: 'bg-violet-500/20',
    buttonClass: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-400 hover:to-purple-400 shadow-lg shadow-violet-500/30',
    cardClass: 'bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 border-black shadow-2xl',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    description: 'Full-scale operations.',
    unitLimit: 'Unlimited units',
    icon: Crown,
    popular: false,
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited units & team members', included: true },
      { name: 'Shift scheduling & GPS time clock', included: true },
      { name: 'Timesheet approval workflow', included: true },
      { name: 'Team payroll processing', included: true },
      { name: 'Custom branding', included: true },
      { name: 'API access & webhooks', included: true },
      { name: 'Dedicated account manager', included: true },
    ],
    cta: 'Choose Enterprise',
    iconBg: 'bg-amber-500/20',
    buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30',
    cardClass: 'bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 border-black shadow-2xl',
  },
];

export default function BillingClient({
  userName,
  hasPaidPlan,
  daysLeft,
  trialEndDate,
  currentTier,
  reason,
  canceledCheckout,
  propertiesCount,
  firstPropertyName,
}: BillingClientProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (canceledCheckout) {
      setError('Checkout was canceled. Select a plan below to continue.');
    }
    if (reason === 'trial_ended') {
      setError('Your free trial has ended. Add a card to keep access to your dashboard.');
    }
    if (reason === 'suspended') {
      setError('Your account has been suspended. Please select a plan to restore access.');
    }
  }, [canceledCheckout, reason]);

  const isYearly = billingInterval === 'yearly';

  const handleSelectPlan = async (tierId: string) => {
    setLoadingTier(tierId);
    setError(null);

    const tierMeta = tiers.find((t) => t.id === tierId);
    const planValue = tierMeta
      ? isYearly ? getYearlyPrice(tierMeta.price) : tierMeta.price
      : 39;

    trackMetaEvent('InitiateCheckout', {
      content_ids: [tierId],
      content_name: `landlord_${tierId}_${billingInterval}`,
      content_category: 'landlord_subscription',
      value: planValue,
      currency: 'USD',
    });
    trackRedditEvent('AddToCart', {
      currency: 'USD',
      value: planValue,
      itemCount: 1,
      products: [{ id: tierId, name: `landlord_${tierId}_${billingInterval}`, category: 'landlord_subscription' }],
    });

    try {
      const response = await fetch('/api/landlord/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId, billingInterval }),
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

  // If they already have a paid plan, show a simple confirmation instead of the picker
  if (hasPaidPlan) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You're all set</h1>
          <p className="text-gray-600">
            Your <span className="font-semibold capitalize">{currentTier ?? 'plan'}</span> subscription is active.
            To manage your plan or update your payment method, contact support.
          </p>
          <a
            href="/admin/overview"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-start px-4 py-8">
      <div className="max-w-5xl w-full space-y-6">

        {/* Header — personalised by property name, activation state, and days remaining */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
            {propertiesCount > 0 && firstPropertyName
              ? daysLeft > 0
                ? `Keep ${firstPropertyName} active`
                : `${firstPropertyName} is paused — restore access`
              : propertiesCount > 0
              ? daysLeft > 0
                ? 'Keep your setup active'
                : 'Your properties are paused — restore access'
              : 'Start collecting rent automatically'}
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            {daysLeft > 0 && propertiesCount > 0
              ? firstPropertyName
                ? `Subscribe before your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} to keep ${firstPropertyName} running — rent collection, e-signatures, and tenant portal stay active.`
                : `You've set up ${propertiesCount} ${propertiesCount === 1 ? 'property' : 'properties'}. Subscribe before your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} to keep everything running.`
              : daysLeft > 0 && propertiesCount === 0
              ? `You have ${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial. Add a property and subscribe to start collecting rent automatically.`
              : propertiesCount > 0
              ? firstPropertyName
                ? `Your trial has ended. Subscribe now to restore access to ${firstPropertyName} and keep rent collection running.`
                : `Your trial has ended. Subscribe now to restore access to your ${propertiesCount} ${propertiesCount === 1 ? 'property' : 'properties'} and keep rent collection running.`
              : 'Your free trial has ended. Subscribe to start collecting rent automatically.'}
          </p>

          {/* Billing interval toggle */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <span className={`text-sm font-semibold ${!isYearly ? 'text-black' : 'text-black/40'}`}>Monthly</span>
            <button
              onClick={() => setBillingInterval(isYearly ? 'monthly' : 'yearly')}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                isYearly ? 'bg-gradient-to-r from-violet-500 to-purple-500' : 'bg-black/20'
              }`}
              aria-label="Toggle billing interval"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  isYearly ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-semibold ${isYearly ? 'text-black' : 'text-black/40'}`}>Yearly</span>
            {isYearly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                Save {YEARLY_DISCOUNT_PERCENT}%
              </span>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center text-red-600 flex items-center justify-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          {tiers.map((tier, index) => {
            const Icon = tier.icon;
            const isPopular = tier.popular;
            const isLoading = loadingTier === tier.id;
            const isCurrent = currentTier === tier.id;

            return (
              <div
                key={tier.id}
                className={`relative group rounded-2xl border shadow-xl p-5 flex flex-col transition-all duration-300 hover:scale-[1.02] ${tier.cardClass} ${
                  isPopular ? 'scale-[1.03] lg:scale-105 z-10' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Badge */}
                {isCurrent ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      CURRENT PLAN
                    </div>
                  </div>
                ) : isPopular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      MOST POPULAR
                    </div>
                  </div>
                ) : null}

                {/* Tier header */}
                <div className={`flex items-center gap-3 mb-3 ${isPopular || isCurrent ? 'pt-2' : ''}`}>
                  <div className={`rounded-xl ${tier.iconBg} p-2.5 border border-white/20`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{tier.name}</h3>
                    <p className="text-xs text-white/80">{tier.unitLimit}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-2">
                  {isYearly ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">
                          ${getYearlyPrice(tier.price).toFixed(2)}
                        </span>
                        <span className="text-white/80 text-sm font-semibold">/year</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-sm line-through text-white/40">
                          ${(tier.price * 12).toFixed(2)}/yr
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          Save ${((tier.price * 12) - getYearlyPrice(tier.price)).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">${tier.price}</span>
                      <span className="text-white/80 text-sm font-semibold">/month</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-white/80 font-semibold mb-3">{tier.description}</p>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={loadingTier !== null}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed ${tier.buttonClass}`}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {tier.cta}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Features */}
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-2">What's included</p>
                  <ul className="space-y-1.5">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white font-semibold">
                        <div className="mt-0.5 rounded-full p-0.5 bg-white/20 text-white flex-shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {['Cancel anytime', 'No contracts', 'No setup fees', 'Stripe-secured'].map((text) => (
            <span
              key={text}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700"
            >
              <span className="text-emerald-500 font-bold">✓</span>
              {text}
            </span>
          ))}
        </div>

        {/* Security trust bar */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4 space-y-3">
          <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            Your payment information is 100% secure
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 text-slate-600">
              <Lock className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="text-xs font-semibold">256-bit SSL encryption</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <CreditCard className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs font-semibold">PCI-DSS compliant · Powered by Stripe</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
              <span className="text-xs font-semibold">Bank-level security</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <BadgeCheck className="h-4 w-4 text-cyan-500 flex-shrink-0" />
              <span className="text-xs font-semibold">99.9% uptime SLA</span>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 leading-relaxed max-w-xl mx-auto">
            Your card details are <strong className="text-slate-600">never stored on our servers</strong>. All payment
            information is processed by{' '}
            <a
              href="https://stripe.com/security"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Stripe
            </a>
            , a certified PCI Level 1 payment processor.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Questions?{' '}
          <a href="/contact" className="text-blue-600 hover:text-blue-700 underline underline-offset-2">
            Talk to our team
          </a>
        </p>
      </div>
    </main>
  );
}
