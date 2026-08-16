'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Check,
  Zap,
  Building2,
  Crown,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { YEARLY_DISCOUNT_PERCENT, getYearlyMonthlyEquivalent, getYearlyPrice } from '@/lib/config/subscription-tiers';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(39),
    description: 'Perfect for small landlords.',
    unitLimit: 'Up to 24 units',
    icon: Building2,
    popular: false,
    comingSoon: false,
    features: [
      { name: 'Up to 24 units', included: true },
      { name: 'Online rent collection', included: true },
      { name: 'Custom Subdomain (yourname.propertyflowhq.com)', included: true },
      { name: 'Maintenance Ticket System', included: true },
      { name: 'Digital leases with E-Sign', included: true },
      { name: 'Contractor Marketplace', included: true },
      { name: 'Basic Reporting', included: true },
      { name: 'Automated Application Process', included: true },
      { name: 'Free Lease Builder', included: true },
      { name: 'ID & Paystub Scanner', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-300',
    iconColorLight: 'text-blue-500',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(99),
    description: 'For growing landlords. The only tool that scales with you.',
    unitLimit: 'Up to 150 units',
    icon: Zap,
    popular: true,
    comingSoon: false,
    features: [
      { name: 'Everything in Starter', included: true },
      { name: 'Up to 150 units', included: true },
      { name: 'QuickBooks & TurboTax integration', included: true },
      { name: 'Automatic rent reminders', included: true },
      { name: 'Auto late fee charges', included: true },
      { name: 'Up to 5 team members', included: true },
      { name: 'Team management & Slack-like chat', included: true },
      { name: 'Advanced analytics & Reporting', included: true },
      { name: 'Priority support', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-300',
    iconColorLight: 'text-violet-500',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(199),
    description: 'Full-scale property management operations.',
    unitLimit: 'Unlimited units',
    icon: Crown,
    popular: false,
    comingSoon: false,
    features: [
      { name: 'Unlimited Units', included: true },
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Advanced roles & permissions', included: true },
      { name: 'Shift scheduling & calendar', included: true },
      { name: 'Time tracking with GPS', included: true },
      { name: 'Timesheet approval workflow', included: true },
      { name: 'Performance reports', included: true },
      { name: 'Priority 24/7 support', included: true },
      { name: 'Dedicated account manager', included: true },
      { name: 'API access & webhooks', included: true },
      { name: 'Multi-property dashboard', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    iconColorLight: 'text-amber-500',
  },
];

const contractorTiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(39),
    description: 'Perfect for solo contractors & one-man operations just getting organized.',
    unitLimit: 'Solo operator',
    icon: Building2,
    popular: false,
    comingSoon: false,
    features: [
      { name: 'Unlimited job & work order management', included: true },
      { name: 'Professional invoicing & estimates', included: true },
      { name: 'Online payment collection (Stripe)', included: true },
      { name: 'Client & contact management (CRM)', included: true },
      { name: 'Your own branded subdomain profile', included: true },
      { name: 'Contractor Marketplace listing', included: true },
      { name: 'Photo & document uploads per job', included: true },
      { name: 'Basic job cost tracking', included: true },
      { name: 'Automated invoice payment reminders', included: true },
      { name: 'Mobile-friendly — works on any device', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-300',
    iconColorLight: 'text-rose-500',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(99),
    description: 'Built for growing crews of 2–20. Run your entire operation from one place.',
    unitLimit: 'Up to 20 team members',
    icon: Zap,
    popular: true,
    comingSoon: false,
    features: [
      { name: 'Everything in Starter', included: true },
      { name: 'Up to 20 team members', included: true },
      { name: 'Team scheduling & job assignment', included: true },
      { name: 'GPS time clock & timesheet approvals', included: true },
      { name: 'Inventory & equipment tracking', included: true },
      { name: 'Lead management & pipeline', included: true },
      { name: 'QuickBooks & accounting sync', included: true },
      { name: 'Advanced profit & loss reporting', included: true },
      { name: 'Multi-trade job management', included: true },
      { name: 'Team Slack-like internal chat', included: true },
      { name: 'Priority support', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-300',
    iconColorLight: 'text-orange-500',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    yearlyMonthlyPrice: getYearlyMonthlyEquivalent(199),
    description: 'For large contractors & multi-trade companies scaling to 100+ employees.',
    unitLimit: 'Unlimited team members',
    icon: Crown,
    popular: false,
    comingSoon: false,
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Payroll processing & direct deposit', included: true },
      { name: 'Advanced roles, permissions & divisions', included: true },
      { name: 'Multi-location & multi-trade dashboard', included: true },
      { name: 'Subcontractor management & payments', included: true },
      { name: 'Client portal with job status updates', included: true },
      { name: 'Performance & productivity reports', included: true },
      { name: 'Custom branding & white-label options', included: true },
      { name: 'Dedicated account manager', included: true },
      { name: 'API access & third-party integrations', included: true },
      { name: 'Priority 24/7 support', included: true },
    ],
    cta: 'Start Now',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    iconColorLight: 'text-amber-500',
  },
];

export default function PricingSection({ variant = 'pm' }: { variant?: 'pm' | 'contractor' }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const isContractor = variant === 'contractor';
  const isYearly = billingInterval === 'yearly';

  const handleTierClick = async (tierId: string) => {
    setLoadingTier(tierId);

    if (status === 'authenticated' && session?.user) {
      if (isContractor) {
        router.push(`/sign-up?role=contractor&plan=${tierId}&interval=${billingInterval}`);
      } else if (session.user.role === 'admin' || session.user.role === 'landlord') {
        router.push(`/onboarding/landlord/subscription?plan=${tierId}&interval=${billingInterval}`);
      } else {
        router.push(`/sign-up?role=landlord&plan=${tierId}&interval=${billingInterval}`);
      }
    } else {
      router.push(isContractor ? `/sign-up?role=contractor&plan=${tierId}&interval=${billingInterval}` : `/sign-up?role=landlord&plan=${tierId}&interval=${billingInterval}`);
    }

    setLoadingTier(null);
  };

  return (
    <section id="pricing" className="w-full py-20 md:py-28 px-4 relative overflow-hidden scroll-mt-20">
      {/* Background effects */}
      <div className="absolute inset-0" />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] ${isContractor ? 'bg-orange-200/30' : 'bg-violet-500/10'} rounded-full blur-3xl`} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 mb-16 animate-in fade-in duration-700">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-slate-900 text-sm font-medium border border-black bg-white">
            <Sparkles className={`h-4 w-4 ${isContractor ? 'text-rose-500' : 'text-blue-600'}`} />
            <span className='text-black font-bold'>Simple, Transparent Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-black">
            {isContractor ? 'Start at Just $39/month. Built for Contractors.' : 'Start at Just $39/month. Scales as You Grow.'}
          </h2>
          <p className="text-lg text-black font-semibold max-w-2xl mx-auto">
            {isContractor ? 'Everything you need to run your business — jobs, invoices, team, and more.' : "Finally an Automation Tool that saves you time and money. Let's face it your time is valuable."}
          </p>

          {/* Billing Interval Toggle */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span className={`text-sm font-semibold ${!isYearly ? 'text-black' : 'text-black/50'}`}>Monthly</span>
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
            <span className={`text-sm font-semibold ${isYearly ? 'text-black' : 'text-black/50'}`}>Yearly</span>
            {isYearly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                Save {YEARLY_DISCOUNT_PERCENT}%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6 max-w-6xl mx-auto">
          {(isContractor ? contractorTiers : tiers).map((tier, index) => {
            const Icon = tier.icon;
            const isPopular = tier.popular;

            return (
              <div
                key={tier.id}
                className={`relative group rounded-2xl border shadow-xl p-8 flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom hover:scale-105 ${
                  isContractor
                    ? 'bg-gradient-to-br from-orange-50 via-white to-rose-50 border-orange-200/60'
                    : 'bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 border-black shadow-2xl'
                } ${isPopular ? 'scale-105 lg:scale-110 z-10' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className={`bg-gradient-to-r ${isContractor ? 'from-rose-500 to-orange-500 shadow-rose-500/50' : 'from-violet-500 to-purple-500 shadow-violet-500/50'} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5`}>
                      <Zap className="h-3 w-3" />
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Tier header */}
                <div className={`flex items-center gap-3 mb-4 ${isPopular ? 'pt-2' : ''}`}>
                  <div className={`rounded-xl ${tier.iconBg} p-3 border ${isContractor ? 'border-orange-200' : 'border-white/20'}`}>
                    <Icon className={`h-6 w-6 ${isContractor ? tier.iconColorLight : 'text-white'}`} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${isContractor ? 'text-black' : 'text-white'}`}>{tier.name}</h3>
                    <p className={`text-xs font-semibold ${isContractor ? 'text-black/60' : 'text-white'}`}>{tier.unitLimit}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {tier.price !== null ? (
                    isYearly ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-4xl font-bold ${isContractor ? 'text-black' : 'text-white'}`}>
                            ${getYearlyPrice(tier.price).toFixed(2)}
                          </span>
                          <span className={`font-semibold ${isContractor ? 'text-black/60' : 'text-white'}`}>/year</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`text-sm line-through ${isContractor ? 'text-black/40' : 'text-white/40'}`}>
                            ${(tier.price * 12).toFixed(2)}/yr
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isContractor ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            Save ${((tier.price * 12) - getYearlyPrice(tier.price)).toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-bold ${isContractor ? 'text-black' : 'text-white'}`}>${tier.price}</span>
                        <span className={`font-semibold ${isContractor ? 'text-black/60' : 'text-white'}`}>/month</span>
                      </div>
                    )
                  ) : (
                    <div className={`text-2xl font-bold ${isContractor ? 'text-black' : 'text-white'}`}>Custom Pricing</div>
                  )}
                </div>

                <p className={`text-sm font-semibold mb-6 ${isContractor ? 'text-black/70' : 'text-white'}`}>{tier.description}</p>

                {/* CTA Button */}
                <button
                  onClick={() => !tier.comingSoon && handleTierClick(tier.id)}
                  disabled={loadingTier === tier.id || tier.comingSoon}
                  className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 mb-8 ${
                    tier.comingSoon
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : isContractor
                      ? isPopular
                        ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-400 hover:to-orange-400 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105'
                        : tier.id === 'enterprise'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                          : 'bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-500/20 hover:scale-105'
                    : isPopular
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-400 hover:to-purple-400 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105'
                    : tier.id === 'enterprise'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                    : tier.id === 'starter'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-400 hover:to-cyan-400 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105'
                      : 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-900'
                  }`}
                >
                  {loadingTier === tier.id ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : tier.comingSoon ? (
                    <>
                      {tier.cta}
                    </>
                  ) : (
                    <>
                      {tier.cta}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Features list */}
                <div className="flex-1">
                  <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${isContractor ? 'text-black' : 'text-white'}`}>
                    What&apos;s included
                  </p>
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li 
                        key={i} 
                        className={`flex items-start gap-3 text-sm ${
                          feature.included 
                            ? isContractor ? 'text-black font-semibold' : 'text-white font-semibold'
                            : isContractor ? 'text-black/40' : 'text-white/60'
                        }`}
                      >
                        <div className={`mt-0.5 rounded-full p-0.5 ${
                          feature.included 
                            ? isContractor ? 'bg-orange-100 text-orange-600' : 'bg-white/20 text-white'
                            : isContractor ? 'bg-black/5 text-black/30' : 'bg-white/10 text-white/40'
                        }`}>
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className={feature.included ? '' : 'line-through'}>{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Trust strip + cancel-anytime row ── */}
        <div className="mt-14 flex flex-col items-center gap-6">
          {/* Cancel anytime / no contract / trial pill */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: '✓', text: '14-day free trial' },
              { icon: '✓', text: 'Cancel anytime' },
              { icon: '✓', text: 'No contracts' },
              { icon: '✓', text: 'No setup fees' },
            ].map((item) => (
              <span
                key={item.text}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold ${
                  isContractor
                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                    : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                }`}
              >
                <span className="text-emerald-500 font-bold">{item.icon}</span>
                {item.text}
              </span>
            ))}
          </div>

          {/* Security / trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-2xl">
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span className="text-xs font-semibold">256-bit SSL</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              <span className="text-xs font-semibold">PCI Compliant · Stripe</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="text-xs font-semibold">Bank-level security</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-xs font-semibold">99.9% uptime</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
