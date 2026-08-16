'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserCheck, UserPlus, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface JoinClientProps {
  code: string;
  landlordName: string;
  propertyName: string | null;
  propertySlug: string | null;
}

/**
 * Shown to a tenant who scanned a landlord QR code.
 *
 * Two paths:
 *  1. Existing tenant  — calls /api/onboarding/existing-tenant with the code,
 *     marks onboarding complete, then sends them straight to the dashboard.
 *  2. New tenant       — sends them to /sign-up with the code + property
 *     embedded as query params so the sign-up flow knows to skip onboarding.
 */
export default function JoinClient({ code, landlordName, propertyName, propertySlug }: JoinClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleExistingTenant() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/existing-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Prefer property returned by API (from invite code), fall back to prop
        const resolvedSlug: string | null = data.propertySlug ?? propertySlug;
        const dest = resolvedSlug
          ? `/user/dashboard?property=${encodeURIComponent(resolvedSlug)}`
          : '/user/dashboard';
        router.push(dest);
      } else if (res.status === 401) {
        // Not signed in — send to sign-in with a callback back here
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(`/join/${code}`)}`);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Build the sign-up URL so the new tenant skips the role-picker onboarding
  const signUpParams = new URLSearchParams({
    role: 'tenant',
    inviteCode: code,
    skipOnboarding: 'true',
  });
  if (propertySlug) signUpParams.set('propertySlug', propertySlug);
  const signUpUrl = `/sign-up?${signUpParams.toString()}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900/20 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 mx-auto">
            <Home className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">You've been invited</h1>
          <p className="text-slate-400">
            <span className="text-white font-medium">{landlordName}</span> invited you to manage your
            tenancy online.
          </p>
          {propertyName && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <Home className="h-3.5 w-3.5" />
              {propertyName}
            </div>
          )}
        </div>

        {/* Choice cards */}
        <div className="space-y-3">
          {/* Existing tenant path */}
          <button
            onClick={handleExistingTenant}
            disabled={loading}
            className="w-full text-left rounded-2xl border border-white/10 bg-slate-900/60 p-5 hover:border-blue-500/40 hover:bg-slate-900 transition-all disabled:opacity-50"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                {loading ? (
                  <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                ) : (
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-white">I already have an account</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  Sign in and connect to {landlordName} — skip any extra setup.
                </p>
              </div>
            </div>
          </button>

          {/* New tenant path */}
          <Link href={signUpUrl} className="block">
            <div className="w-full text-left rounded-2xl border border-white/10 bg-slate-900/60 p-5 hover:border-blue-500/40 hover:bg-slate-900 transition-all">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">I'm new — create an account</p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Takes 2 minutes. You'll be linked to {landlordName} automatically.
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-slate-600">
          By continuing you agree to our{' '}
          <Link href="/terms" className="text-slate-400 hover:text-white underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
