'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Check,
  Zap,
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

export default function ContractorSubscriptionClient({
  userName,
}: ContractorSubscriptionClientProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      setError('Checkout was canceled. Click below to try again.');
    }
  }, [searchParams]);

  // Fire Meta Pixel Lead + CompleteRegistration once on mount.
  useEffect(() => {
    trackMetaEvent('CompleteRegistration', {
      content_name: 'contractor_signup',
      status: 'account_created',
    });
    trackMetaEvent('Lead', {
      content_category: 'contractor',
      content_name: 'contractor_trial_started',
      value: 99,
      currency: 'USD',
    });
    trackRedditEvent('SignUp', { currency: 'USD', value: 99 });
    trackRedditEvent('Lead', { currency: 'USD', value: 99 });
  }, []);

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);

    trackMetaEvent('InitiateCheckout', {
      content_ids: 'pro',
      content_name: 'contractor_pro',
      content_category: 'contractor_subscription',
      value: 99,
      currency: 'USD',
    });
    trackRedditEvent('AddToCart', {
      currency: 'USD',
      value: 99,
      itemCount: 1,
      products: [{ id: 'pro', name: 'contractor_pro', category: 'contractor_subscription' }],
    });

    try {
      const response = await fetch('/api/contractor/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.message || 'Failed to start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-3xl w-full space-y-8">
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
            Your account is ready
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Start your 14-day free trial. No credit card required.
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

        {/* Single plan card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-orange-500/40 bg-slate-900/60 backdrop-blur-sm overflow-hidden"
        >
          {/* Card header */}
          <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border-b border-white/5 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-500/20 p-2.5 border border-orange-500/30">
                <Zap className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Unlimited Plan</h2>
                <p className="text-sm text-slate-400">Everything for your business</p>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">$99</span>
              <span className="text-slate-400">/month</span>
            </div>
          </div>

          {/* Features grid */}
          <div className="px-8 py-8">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
              {[
                {
                  title: 'Jobs & Invoicing',
                  items: ['Unlimited jobs & work orders', 'Invoicing & estimates', 'E-sign contracts', 'Online payments (Stripe)'],
                },
                {
                  title: 'Team & Scheduling',
                  items: ['Unlimited team members', 'Scheduling & dispatch', 'GPS time tracking', 'Payroll & direct deposit'],
                },
                {
                  title: 'Clients & Growth',
                  items: ['CRM & customer portal', 'Lead management & pipeline', 'Marketplace listing', 'Branded subdomain'],
                },
                {
                  title: 'Operations',
                  items: ['Inventory & equipment', 'Subcontractor management', 'QuickBooks sync', 'API & integrations'],
                },
              ].map((group) => (
                <div key={group.title} className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">{group.title}</h4>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                        <div className="mt-0.5 rounded-full p-0.5 bg-emerald-500/20 text-emerald-400 shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <button
                onClick={handleStartTrial}
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl font-bold text-base bg-gradient-to-r from-rose-500 to-orange-400 text-white hover:from-rose-400 hover:to-orange-300 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Start 14-Day Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">
                No credit card required. Cancel anytime from your dashboard.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 pt-2"
        >
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Bank-level encryption</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>No contracts or setup fees</span>
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
