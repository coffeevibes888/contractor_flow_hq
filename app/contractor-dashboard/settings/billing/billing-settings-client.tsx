'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  MapPin,
  Receipt,
  Download,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Save,
  Building2,
  AlertCircle,
} from 'lucide-react';

interface PaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface Invoice {
  id: string;
  date: number;
  amount: number;
  status: string;
  pdfUrl: string | null;
}

interface BillingSettingsClientProps {
  stripeCustomerId: string | null;
  paymentMethod: PaymentMethod | null;
  invoices: Invoice[];
  billingAddress: Record<string, string> | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
}

const BRAND_ICONS: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
};

export default function BillingSettingsClient({
  stripeCustomerId,
  paymentMethod,
  invoices,
  billingAddress,
  subscriptionTier,
  subscriptionStatus,
  currentPeriodEnd,
}: BillingSettingsClientProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const [addressForm, setAddressForm] = useState({
    name: billingAddress?.name || '',
    line1: billingAddress?.line1 || '',
    line2: billingAddress?.line2 || '',
    city: billingAddress?.city || '',
    state: billingAddress?.state || '',
    postalCode: billingAddress?.postalCode || '',
    country: billingAddress?.country || 'US',
  });

  const handleUpdatePaymentMethod = async () => {
    setUpdatingPayment(true);
    try {
      const res = await fetch('/api/contractor/subscription/payment-method', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || 'Failed to open billing portal');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleSaveAddress = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/contractor/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'billingAddress', ...addressForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const tierLabels: Record<string, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
  const tierPrices: Record<string, string> = { starter: '$39', pro: '$99', enterprise: '$199' };
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    trialing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    past_due: 'bg-red-500/20 text-red-300 border-red-500/30',
    canceled: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Billing</h1>
          <p className="text-slate-400 mt-1">Manage your payment method, billing address, and download invoices</p>
        </div>

        {/* Feedback */}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-300 text-sm"
          >
            <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm"
          >
            <AlertCircle className="h-4 w-4" /> {error}
          </motion.div>
        )}

        {/* Current Plan Summary */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-rose-400" /> Current Plan
          </h2>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{tierLabels[subscriptionTier] || 'Starter'} Plan</p>
              <p className="text-slate-400 text-sm mt-0.5">
                {tierPrices[subscriptionTier] || '$39'}/month
                {currentPeriodEnd && (
                  <span> · Next billing {new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${statusColors[subscriptionStatus] || statusColors.active}`}>
                {subscriptionStatus === 'trialing' ? 'Trial' : subscriptionStatus.replace('_', ' ')}
              </span>
              <a
                href="/contractor-dashboard/settings/subscription"
                className="text-sm text-rose-400 hover:text-rose-300 underline underline-offset-2"
              >
                Manage Plan →
              </a>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-rose-400" /> Payment Method
          </h2>

          {paymentMethod ? (
            <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-16 bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg flex items-center justify-center border border-white/10">
                  <span className="text-2xl">{BRAND_ICONS[paymentMethod.brand] || '💳'}</span>
                </div>
                <div>
                  <p className="text-white font-semibold capitalize">
                    {paymentMethod.brand} •••• {paymentMethod.last4}
                  </p>
                  <p className="text-slate-400 text-sm">
                    Expires {paymentMethod.expMonth.toString().padStart(2, '0')} / {paymentMethod.expYear}
                  </p>
                </div>
              </div>
              <button
                onClick={handleUpdatePaymentMethod}
                disabled={updatingPayment}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-50"
              >
                {updatingPayment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                Update
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-dashed border-white/10">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-slate-600" />
                <div>
                  <p className="text-white font-medium">No payment method on file</p>
                  <p className="text-slate-500 text-sm">{stripeCustomerId ? 'Click "Add Card" to add one' : 'Complete your subscription to add a card'}</p>
                </div>
              </div>
              {stripeCustomerId && (
                <button
                  onClick={handleUpdatePaymentMethod}
                  disabled={updatingPayment}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {updatingPayment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                  Add Card
                </button>
              )}
            </div>
          )}
        </div>

        {/* Billing Address */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-rose-400" /> Billing Address
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm text-slate-400 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Name / Company</label>
              <input
                value={addressForm.name}
                onChange={(e) => setAddressForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                placeholder="Business or personal name"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm text-slate-400">Address Line 1</label>
              <input
                value={addressForm.line1}
                onChange={(e) => setAddressForm(p => ({ ...p, line1: e.target.value }))}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                placeholder="123 Main St"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm text-slate-400">Address Line 2 (optional)</label>
              <input
                value={addressForm.line2}
                onChange={(e) => setAddressForm(p => ({ ...p, line2: e.target.value }))}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                placeholder="Suite, unit, etc."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">City</label>
              <input
                value={addressForm.city}
                onChange={(e) => setAddressForm(p => ({ ...p, city: e.target.value }))}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                placeholder="Dallas"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-slate-400">State</label>
                <input
                  value={addressForm.state}
                  onChange={(e) => setAddressForm(p => ({ ...p, state: e.target.value }))}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                  placeholder="TX"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-slate-400">ZIP Code</label>
                <input
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm(p => ({ ...p, postalCode: e.target.value }))}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
                  placeholder="75201"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleSaveAddress}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Address
          </button>
        </div>

        {/* Invoice History */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Download className="h-5 w-5 text-rose-400" /> Invoice History
          </h2>
          {invoices.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No invoices yet. They'll appear here after your trial ends.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        {new Date(inv.date * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-slate-400 text-xs">${inv.amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                      inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                    }`}>
                      {inv.status}
                    </span>
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
