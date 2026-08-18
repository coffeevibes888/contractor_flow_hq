'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  KeyRound,
  Mail,
  Phone,
  User,
  Sparkles,
  Clock,
  Calendar,
  MapPin,
  Shield,
  DollarSign,
  Hammer,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

const STEPS = ['account', 'invite', 'done'] as const;
type Step = (typeof STEPS)[number];

interface AccountData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
}

// ─── Slide animation ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeStartClient() {
  const [step, setStep] = useState<Step>('account');
  const [direction, setDirection] = useState(1);

  const [account, setAccount] = useState<AccountData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [inviteToken, setInviteToken] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const goTo = (target: Step) => {
    const currentIdx = STEPS.indexOf(step);
    const targetIdx = STEPS.indexOf(target);
    setDirection(targetIdx > currentIdx ? 1 : -1);
    setStep(target);
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError('');
    goTo('done');

    try {
      const res = await fetch('/api/employee-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name.trim(),
          email: account.email.trim().toLowerCase(),
          phoneNumber: account.phone,
          password: account.password,
          confirmPassword: account.confirm,
          inviteToken: inviteToken.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.message || json.error || 'Something went wrong.');
        return;
      }

      setCompanyName(json.companyName || '');
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Hammer className="h-6 w-6 text-orange-500" />
            <span className="font-bold text-slate-900">Contractor Flow HQ</span>
          </Link>
          <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Already have an account? Sign In
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid lg:grid-cols-5 gap-10 items-start">
          {/* Left — Hero (hidden on mobile) */}
          <div className="hidden lg:flex lg:col-span-2 flex-col gap-6 sticky top-24">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                Free for Team Members
              </div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                Your schedule, hours, and team — all in one place.
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                Your employer uses Contractor Flow HQ to manage the business. Join in under 2 minutes to access your schedule, clock in/out, request time off, and communicate with the team.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              {[
                { icon: <Clock className="h-4 w-4 text-orange-500" />, text: 'GPS clock in/out from your phone' },
                { icon: <Calendar className="h-4 w-4 text-blue-500" />, text: 'View your schedule & assigned jobs' },
                { icon: <DollarSign className="h-4 w-4 text-emerald-500" />, text: 'Track hours & view pay stubs' },
                { icon: <MapPin className="h-4 w-4 text-violet-500" />, text: 'One-tap directions to job sites' },
                { icon: <Shield className="h-4 w-4 text-rose-500" />, text: 'Request time off & swap shifts' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                  {icon}
                  <span className="text-slate-700 text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Form card */}
          <div className="lg:col-span-3 w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 relative overflow-hidden">
              {/* Step dots */}
              <StepDots current={step} />

              {/* Animated step content */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  {step === 'account' && (
                    <AccountStep
                      data={account}
                      onChange={(d) => setAccount((prev) => ({ ...prev, ...d }))}
                      onNext={() => goTo('invite')}
                    />
                  )}
                  {step === 'invite' && (
                    <InviteStep
                      token={inviteToken}
                      onChange={setInviteToken}
                      onNext={submit}
                      onBack={() => goTo('account')}
                    />
                  )}
                  {step === 'done' && (
                    <DoneStep
                      companyName={companyName}
                      submitting={submitting}
                      submitError={submitError}
                      onRetry={submit}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Dots ────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const labels = ['Account', 'Invite Code'];
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
                ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            {i < activeIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${i === activeIdx ? 'text-slate-800' : i < activeIdx ? 'text-emerald-600' : 'text-slate-400'}`}>
            {label}
          </span>
          {i < labels.length - 1 && (
            <div className={`h-px w-8 sm:w-12 rounded-full transition-all duration-500 ${i < activeIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Account ──────────────────────────────────────────────────────────

function AccountStep({ data, onChange, onNext }: { data: AccountData; onChange: (d: Partial<AccountData>) => void; onNext: () => void }) {
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
        <p className="text-slate-500 text-sm">Free for all team members. Takes 2 minutes.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full Name" icon={<User className="h-4 w-4" />} error={errors.name}>
          <input type="text" value={data.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="John Smith" className={inputCls(errors.name)} />
        </Field>
        <Field label="Phone Number" icon={<Phone className="h-4 w-4" />} error={errors.phone}>
          <input type="tel" value={data.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="(555) 123-4567" className={inputCls(errors.phone)} />
        </Field>
      </div>

      <Field label="Email Address" icon={<Mail className="h-4 w-4" />} error={errors.email}>
        <input type="email" value={data.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="you@example.com" className={inputCls(errors.email)} />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Password" error={errors.password}>
          <input type="password" value={data.password} onChange={(e) => onChange({ password: e.target.value })} placeholder="••••••••" className={inputCls(errors.password)} />
        </Field>
        <Field label="Confirm Password" error={errors.confirm}>
          <input type="password" value={data.confirm} onChange={(e) => onChange({ confirm: e.target.value })} placeholder="••••••••" className={inputCls(errors.confirm)} />
        </Field>
      </div>

      <button
        onClick={() => validate() && onNext()}
        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:scale-[1.02] transition-all"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-orange-600 hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}

// ─── Step 2: Invite Code ──────────────────────────────────────────────────────

function InviteStep({ token, onChange, onNext, onBack }: { token: string; onChange: (v: string) => void; onNext: () => void; onBack: () => void }) {
  const [error, setError] = useState('');

  function validate() {
    if (!token.trim()) { setError('Invite code is required. Check your email from your employer.'); return false; }
    setError('');
    return true;
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Enter your invite code</h2>
        <p className="text-slate-500 text-sm">Your employer sent you an invite via email or text. Paste the code below.</p>
      </div>

      <Field label="Invite Code" icon={<KeyRound className="h-4 w-4" />} error={error}>
        <input
          type="text"
          value={token}
          onChange={(e) => { onChange(e.target.value); if (error) setError(''); }}
          placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
          className={inputCls(error)}
        />
      </Field>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
        <p className="font-medium text-slate-700">Where to find your invite code:</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-500">
          <li>Check your email for a message from your employer</li>
          <li>The code is in the invite link (after <code className="bg-slate-200 px-1 rounded">?token=</code>)</li>
          <li>Ask your employer to resend it from their dashboard</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-shrink-0 h-12 w-12 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => validate() && onNext()}
          className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-3 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:scale-[1.02] transition-all"
        >
          Join Team
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Done ─────────────────────────────────────────────────────────────

function DoneStep({ companyName, submitting, submitError, onRetry }: { companyName: string; submitting: boolean; submitError: string; onRetry: () => void }) {
  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        <p className="text-slate-500 text-sm">Creating your account & linking to team…</p>
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
        className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto shadow-xl shadow-orange-500/25"
      >
        <CheckCircle2 className="h-10 w-10 text-white" />
      </motion.div>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">You&apos;re on the team!</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">
          {companyName
            ? `Welcome to ${companyName}. Check your email to verify, then sign in.`
            : 'Your account is linked. Check your email to verify, then sign in.'}
        </p>
      </div>

      <div className="space-y-2 text-left max-w-xs mx-auto">
        {[
          { icon: <Clock className="h-4 w-4 text-orange-500" />, text: 'GPS clock in/out' },
          { icon: <Calendar className="h-4 w-4 text-blue-500" />, text: 'View schedule & jobs' },
          { icon: <DollarSign className="h-4 w-4 text-emerald-500" />, text: 'Track hours & pay' },
          { icon: <Shield className="h-4 w-4 text-violet-500" />, text: 'Request time off' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            {icon}
            <span className="text-slate-700 text-sm">{text}</span>
          </div>
        ))}
      </div>

      <Link
        href="/sign-in"
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold px-8 py-3.5 shadow-lg shadow-orange-500/25 hover:scale-[1.02] transition-all"
      >
        Sign In to Your Dashboard
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function Field({ label, icon, error, children }: { label: string; icon?: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function inputCls(error?: string) {
  return `w-full border ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all`;
}
