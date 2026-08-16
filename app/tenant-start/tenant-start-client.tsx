'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowLeft,
  Home,
  Search,
  CheckCircle2,
  Loader2,
  KeyRound,
  Mail,
  Phone,
  MapPin,
  User,
  Building2,
  Sparkles,
  ShieldCheck,
  Bell,
  CreditCard,
  Wrench,
  Shield,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LandlordResult {
  found: boolean;
  method?: 'invite_code' | 'email' | 'phone';
  inviteCode?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  landlordName?: string;
  propertyName?: string | null;
  propertySlug?: string | null;
  error?: string;
}

// ─── Slide animation ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const STEPS = ['account', 'landlord', 'address', 'done'] as const;
type Step = (typeof STEPS)[number];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const labels = ['Account', 'Landlord', 'Address'];
  const activeIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-all duration-300 ${
              i < activeIdx
                ? 'bg-emerald-500 text-white'
                : i === activeIdx
                ? 'bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/30'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            {i < activeIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={`text-xs font-medium hidden sm:block ${
              i === activeIdx ? 'text-slate-800' : i < activeIdx ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            {label}
          </span>
          {i < labels.length - 1 && (
            <div
              className={`h-px w-8 sm:w-12 rounded-full transition-all duration-500 ${
                i < activeIdx ? 'bg-emerald-400' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Account ─────────────────────────────────────────────────────────

interface AccountData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
}

function AccountStep({
  data,
  onChange,
  onNext,
}: {
  data: AccountData;
  onChange: (d: Partial<AccountData>) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Partial<AccountData>>({});

  function validate() {
    const e: Partial<AccountData> = {};
    if (!data.name.trim()) e.name = 'Name is required';
    if (!data.email.includes('@')) e.email = 'Valid email required';
    if (data.phone.replace(/\D/g, '').length < 10) e.phone = 'Valid phone required';
    if (data.password.length < 8) e.password = 'At least 8 characters';
    if (data.password !== data.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
        <p className="text-slate-500 text-sm">Free to join. Takes less than 2 minutes.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full Name" icon={<User className="h-4 w-4" />} error={errors.name}>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Jane Smith"
            className={inputCls(errors.name)}
          />
        </Field>
        <Field label="Phone Number" icon={<Phone className="h-4 w-4" />} error={errors.phone}>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="(555) 123-4567"
            className={inputCls(errors.phone)}
          />
        </Field>
      </div>

      <Field label="Email Address" icon={<Mail className="h-4 w-4" />} error={errors.email}>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="you@example.com"
          className={inputCls(errors.email)}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Password" icon={<KeyRound className="h-4 w-4" />} error={errors.password}>
          <input
            type="password"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="At least 8 characters"
            className={inputCls(errors.password)}
          />
        </Field>
        <Field label="Confirm Password" icon={<KeyRound className="h-4 w-4" />} error={errors.confirm}>
          <input
            type="password"
            value={data.confirm}
            onChange={(e) => onChange({ confirm: e.target.value })}
            placeholder="Repeat password"
            className={inputCls(errors.confirm)}
          />
        </Field>
      </div>

      <button
        onClick={() => validate() && onNext()}
        className="w-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:scale-[1.02] transition-all"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Step 2: Find Your Landlord ───────────────────────────────────────────────

function LandlordStep({
  onNext,
  onBack,
  onResult,
}: {
  onNext: () => void;
  onBack: () => void;
  onResult: (r: LandlordResult) => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, startLoading] = useTransition();
  const [result, setResult] = useState<LandlordResult | null>(null);
  const [error, setError] = useState('');

  async function lookup() {
    if (!query.trim()) {
      setError("Enter your landlord's email, phone, or invite code");
      return;
    }
    setError('');
    setResult(null);

    startLoading(async () => {
      const res = await fetch('/api/public/lookup-landlord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data: LandlordResult = await res.json();
      setResult(data);
      if (data.found) onResult(data);
    });
  }

  const methodIcon =
    result?.method === 'invite_code'
      ? <KeyRound className="h-4 w-4 text-violet-500" />
      : result?.method === 'email'
      ? <Mail className="h-4 w-4 text-cyan-500" />
      : <Phone className="h-4 w-4 text-emerald-500" />;

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Connect to Your Landlord</h2>
        <p className="text-slate-500 text-sm">
          Enter your landlord&apos;s email, phone number, or the invite code they gave you.
        </p>
      </div>

      {/* Input type hints */}
      <div className="flex gap-2 flex-wrap justify-center">
        {[
          { icon: <KeyRound className="h-3.5 w-3.5 text-violet-500" />, label: 'Invite Code' },
          { icon: <Mail className="h-3.5 w-3.5 text-cyan-500" />, label: 'Email' },
          { icon: <Phone className="h-3.5 w-3.5 text-emerald-500" />, label: 'Phone' },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium"
          >
            {icon}
            {label}
          </span>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setResult(null); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="e.g. AB12CD34, john@example.com, (555) 123-4567"
          className="w-full bg-white border border-slate-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition-all text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              result.found
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            {result.found ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-slate-900 font-semibold text-sm">
                    Found: <span className="text-emerald-700">{result.landlordName}</span>
                  </p>
                  {result.propertyName && (
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {result.propertyName}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                    {methodIcon}
                    Matched via {result.method?.replace('_', ' ')}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-500 text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-red-700 font-semibold text-sm">No landlord found</p>
                  <p className="text-red-500 text-xs">
                    Double-check the email, phone, or invite code. Ask your landlord to share their code from their dashboard.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-shrink-0 h-12 w-12 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {!result?.found ? (
          <button
            onClick={lookup}
            disabled={loading}
            className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 disabled:opacity-60 text-white font-bold py-3 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:scale-[1.02] transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Searching…' : 'Search'}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold py-3 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"
          >
            Connected — Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-center text-slate-400 text-xs">
        Don&apos;t have this yet?{' '}
        <button
          onClick={() => { onResult({ found: false }); onNext(); }}
          className="text-slate-500 underline hover:text-slate-700 transition-colors"
        >
          Skip and connect later
        </button>
      </p>
    </div>
  );
}

// ─── Step 3: Rental Address ───────────────────────────────────────────────────

interface AddressData {
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
}

function AddressStep({
  data,
  onChange,
  onNext,
  onBack,
  landlordName,
}: {
  data: AddressData;
  onChange: (d: Partial<AddressData>) => void;
  onNext: () => void;
  onBack: () => void;
  landlordName?: string;
}) {
  const [errors, setErrors] = useState<Partial<AddressData>>({});

  function validate() {
    const e: Partial<AddressData> = {};
    if (!data.street.trim()) e.street = 'Street address is required';
    if (!data.city.trim()) e.city = 'City is required';
    if (!data.state.trim()) e.state = 'State is required';
    if (!data.zip.trim()) e.zip = 'ZIP code is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Where do you rent?</h2>
        <p className="text-slate-500 text-sm">
          {landlordName
            ? `Enter the address of the property you rent from ${landlordName}.`
            : 'Enter the address of your rental property.'}
        </p>
      </div>

      <Field label="Street Address" icon={<MapPin className="h-4 w-4" />} error={errors.street}>
        <input
          type="text"
          value={data.street}
          onChange={(e) => onChange({ street: e.target.value })}
          placeholder="123 Main Street"
          className={inputCls(errors.street)}
        />
      </Field>

      <Field label="Unit / Apt (optional)" icon={<Building2 className="h-4 w-4" />}>
        <input
          type="text"
          value={data.unit}
          onChange={(e) => onChange({ unit: e.target.value })}
          placeholder="Apt 4B"
          className={inputCls()}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="City" icon={<Home className="h-4 w-4" />} error={errors.city}>
          <input
            type="text"
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Chicago"
            className={inputCls(errors.city)}
          />
        </Field>
        <Field label="State" icon={<MapPin className="h-4 w-4" />} error={errors.state}>
          <input
            type="text"
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
            placeholder="IL"
            maxLength={2}
            className={`${inputCls(errors.state)} uppercase`}
          />
        </Field>
      </div>

      <Field label="ZIP Code" icon={<MapPin className="h-4 w-4" />} error={errors.zip}>
        <input
          type="text"
          value={data.zip}
          onChange={(e) => onChange({ zip: e.target.value })}
          placeholder="60601"
          maxLength={10}
          className={inputCls(errors.zip)}
        />
      </Field>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-shrink-0 h-12 w-12 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => validate() && onNext()}
          className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold py-3 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:scale-[1.02] transition-all"
        >
          Complete Sign Up
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function DoneStep({
  landlordName,
  submitting,
  submitError,
  onRetry,
}: {
  landlordName?: string;
  submitting: boolean;
  submitError: string;
  onRetry: () => void;
}) {
  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-500 text-sm">Creating your account…</p>
      </div>
    );
  }

  if (submitError) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
          <span className="text-red-500 text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">{submitError}</p>
        <button
          onClick={onRetry}
          className="rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-medium px-6 py-2.5 text-sm transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25"
      >
        <CheckCircle2 className="h-10 w-10 text-white" />
      </motion.div>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">You&apos;re all set!</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">
          {landlordName
            ? `Your account is connected to ${landlordName}. Check your email to verify your account.`
            : 'Your account is ready. Check your email to verify, then sign in.'}
        </p>
      </div>

      <div className="space-y-2 text-left max-w-xs mx-auto">
        {[
          { icon: <Bell className="h-4 w-4 text-violet-500" />, text: 'Get rent due reminders' },
          { icon: <CreditCard className="h-4 w-4 text-cyan-500" />, text: 'Pay rent online — no fees' },
          { icon: <Wrench className="h-4 w-4 text-amber-500" />, text: 'Submit maintenance requests' },
          { icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />, text: 'View leases & documents' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            {icon}
            <span className="text-slate-700 text-sm">{text}</span>
          </div>
        ))}
      </div>

      <Link
        href="/sign-in"
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold px-8 py-3.5 shadow-lg shadow-violet-500/25 hover:scale-[1.02] transition-all"
      >
        Sign In to Your Dashboard
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ─── Shared Field wrapper ─────────────────────────────────────────────────────

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function inputCls(error?: string) {
  return `w-full bg-white border ${
    error ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-violet-400'
  } focus:ring-2 ${
    error ? 'focus:ring-red-500/20' : 'focus:ring-violet-500/20'
  } rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 outline-none transition-all text-sm`;
}

// ─── Feature benefits sidebar ─────────────────────────────────────────────────

const TENANT_BENEFITS = [
  {
    icon: <CreditCard className="h-5 w-5 text-violet-600" />,
    title: 'Pay Rent Online',
    desc: 'One-click rent payments. No checks, no late trips to the office.',
  },
  {
    icon: <Wrench className="h-5 w-5 text-cyan-600" />,
    title: 'Maintenance Requests',
    desc: 'Submit and track repairs right from your phone.',
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
    title: 'Digital Leases',
    desc: 'Read, sign, and store your lease — always at your fingertips.',
  },
  {
    icon: <Bell className="h-5 w-5 text-amber-500" />,
    title: 'Smart Reminders',
    desc: 'Automatic reminders before rent is due. Never miss a payment.',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TenantStartClient() {
  const [step, setStep] = useState<Step>('account');
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [account, setAccount] = useState<AccountData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });

  const [landlordResult, setLandlordResult] = useState<LandlordResult | null>(null);

  const [address, setAddress] = useState<AddressData>({
    street: '',
    unit: '',
    city: '',
    state: '',
    zip: '',
  });

  function go(next: Step, dir = 1) {
    setDirection(dir);
    setStep(next);
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError('');
    go('done');

    try {
      const fullAddress = [address.street, address.unit, address.city, address.state, address.zip]
        .filter(Boolean)
        .join(', ');

      const res = await fetch('/api/tenant-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          email: account.email,
          phoneNumber: account.phone,
          password: account.password,
          confirmPassword: account.confirm,
          role: 'tenant',
          inviteCode: landlordResult?.inviteCode || '',
          propertySlug: landlordResult?.propertySlug || '',
          landlordEmail: landlordResult?.landlordEmail || '',
          landlordPhone: landlordResult?.landlordPhone || '',
          rentalAddress: fullAddress,
          skipOnboarding: true,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setSubmitError(result.message || result.error || 'Sign up failed. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white antialiased">

      {/* ── Background glow (matches /start page) ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 right-0 w-[90%] h-[90%] bg-gradient-to-bl from-violet-50/60 via-cyan-50/40 to-transparent rounded-bl-[120px]" />
        <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-violet-100/30 rounded-full blur-[100px]" />
        <div className="absolute top-40 right-40 w-80 h-80 bg-cyan-100/25 rounded-full blur-[80px]" />
      </div>

      {/* ── Nav ── */}
      <header className="relative z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.svg" alt="Property Flow HQ" width={36} height={36} priority />
            <span className="font-bold text-slate-900">Property Flow HQ</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              href="/sign-in"
              className="font-semibold text-violet-600 hover:text-violet-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-20 md:pt-20">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ── Left: hero copy + benefits ── */}
          <div className="space-y-8 text-center md:text-left">

            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> Your Tenant Portal — Always Free
              </span>

              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08]">
                <span className="block bg-gradient-to-r from-violet-700 to-violet-500 bg-clip-text text-transparent">
                  Pay Rent.
                </span>
                <span className="block bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                  Request Repairs.
                </span>
                <span className="block bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                  Sign Leases.
                </span>
              </h1>

              <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-md mx-auto md:mx-0">
                Your landlord uses Property Flow HQ to manage their properties. Sign up below to connect to their account, pay rent online, and handle everything from one place.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid gap-3 max-w-md mx-auto md:mx-0">
              {TENANT_BENEFITS.map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm p-4 text-left"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold text-sm">{title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust note */}
            <div className="flex items-center gap-2 text-slate-400 text-xs justify-center md:justify-start">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Your data is encrypted &amp; never sold · Tenant accounts are always free
            </div>
          </div>

          {/* ── Right: Step form card ── */}
          <div className="w-full">
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-violet-500/10 ring-1 ring-violet-100/50 p-6 sm:p-8">
              {step !== 'done' && <StepDots current={step} />}

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                >
                  {step === 'account' && (
                    <AccountStep
                      data={account}
                      onChange={(d) => setAccount((p) => ({ ...p, ...d }))}
                      onNext={() => go('landlord')}
                    />
                  )}

                  {step === 'landlord' && (
                    <LandlordStep
                      onNext={() => go('address')}
                      onBack={() => go('account', -1)}
                      onResult={setLandlordResult}
                    />
                  )}

                  {step === 'address' && (
                    <AddressStep
                      data={address}
                      onChange={(d) => setAddress((p) => ({ ...p, ...d }))}
                      onNext={submit}
                      onBack={() => go('landlord', -1)}
                      landlordName={landlordResult?.landlordName}
                    />
                  )}

                  {step === 'done' && (
                    <DoneStep
                      landlordName={landlordResult?.landlordName}
                      submitting={submitting}
                      submitError={submitError}
                      onRetry={() => go('address', -1)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {step !== 'done' && (
              <p className="text-center text-slate-400 text-xs mt-4">
                Free forever for tenants · No credit card needed ·{' '}
                <Link href="/privacy" className="hover:text-slate-600 underline transition-colors">
                  Privacy Policy
                </Link>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
