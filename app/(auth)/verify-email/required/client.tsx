'use client';

import { useEffect, useState } from 'react';
import { Mail, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendVerificationEmailToken } from '@/lib/actions/auth.actions';
import { signOutUser } from '@/lib/actions/user.actions';

interface Props {
  email: string;
  next: string;
  /** True when the account was just created — sign-up already sent a
   *  verification email so we skip the auto-send on mount to avoid duplicates. */
  justSignedUp?: boolean;
}

const COOLDOWN_SECONDS = 30;

/**
 * Client portion of the verify-email gate. Server component handles auth
 * + the "already verified" short-circuit; this just owns the resend
 * button + cooldown timer.
 */
export default function VerifyEmailRequiredClient({ email, next, justSignedUp = false }: Props) {
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  // If sign-up just sent one, show "sent" state immediately without firing again.
  const [sentOnce, setSentOnce] = useState(justSignedUp);
  const [error, setError] = useState<string | null>(null);

  // Auto-send only when the user didn't just sign up (sign-up already sent one).
  // For returning visits (e.g. they closed the tab and came back), still auto-send.
  // Always pass `next` so the link in the email lands on the right page.
  useEffect(() => {
    if (justSignedUp) return; // already sent at sign-up
    let cancelled = false;
    (async () => {
      setSending(true);
      try {
        await sendVerificationEmailToken(email, next);
        if (!cancelled) {
          setSentOnce(true);
          setCooldown(COOLDOWN_SECONDS);
        }
      } catch {
        if (!cancelled) setError('Could not send the verification email. Try again in a moment.');
      } finally {
        if (!cancelled) setSending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendVerificationEmailToken(email, next);
      setSentOnce(true);
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setError('Could not send the verification email. Try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 px-4'>
      <div className='bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full'>
        <div className='flex flex-col items-center text-center'>
          <div className='h-16 w-16 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center mb-5'>
            <Mail className='h-8 w-8 text-violet-600' />
          </div>
          <h1 className='text-2xl font-bold text-slate-900 mb-2'>Verify your email</h1>
          <p className='text-slate-600 text-sm mb-1'>
            Your trial is active — we just need to make sure we can reach you.
          </p>
          <p className='text-slate-900 font-semibold text-sm mb-6'>{email}</p>

          {sentOnce ? (
            <div className='flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-5 w-full justify-center'>
              <CheckCircle className='h-4 w-4 shrink-0' />
              <span>Verification email sent. Check your inbox.</span>
            </div>
          ) : null}

          {error ? (
            <div className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5 w-full text-center'>
              {error}
            </div>
          ) : null}

          <Button
            onClick={handleResend}
            disabled={cooldown > 0 || sending}
            className='w-full mb-3'
            variant='default'
          >
            {sending ? (
              <>
                <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                Sending…
              </>
            ) : cooldown > 0 ? (
              <>Resend in {cooldown}s</>
            ) : (
              <>
                <RefreshCw className='h-4 w-4 mr-2' />
                Resend verification email
              </>
            )}
          </Button>

          <p className='text-xs text-slate-500 mb-6'>
            Click the link in the email to unlock your dashboard. You&apos;ll be redirected automatically.
          </p>

          <button
            onClick={handleSignOut}
            className='text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1'
          >
            Sign out and use a different email
            <ArrowRight className='h-3 w-3' />
          </button>
        </div>
      </div>
    </div>
  );
}
