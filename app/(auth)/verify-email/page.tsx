'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/actions/auth.actions';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Email verification landing page (link from the email).
 *
 * Reads `?token=...` and verifies the user's email. On success we send
 * the user to a sensible dashboard:
 *  - if they were sent here from a `?next=` parameter (the verify-email
 *    gate uses this), redirect to that page.
 *  - if the user came from the free lease builder (pf_lc in sessionStorage),
 *    send them back to /admin/onboarding/from-lease?lc=... so their property
 *    is auto-created from the lease they built.
 *  - else if they're a signed-in user, route by role:
 *      contractor → /contractor-dashboard
 *      landlord/admin → /admin/overview
 *      agent → /agent-dashboard
 *  - else fall back to /sign-in?verified=true so they can authenticate
 *    and pick up where they left off.
 *
 * The previous version always sent users to /sign-in, which forced an
 * extra round-trip even when they were already authenticated.
 */
export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const next = searchParams.get('next');

  // Recover the lease-builder context blob from sessionStorage. This is set
  // by PublicLeaseSuccess when the user clicks "Start Free Trial" and
  // survives same-tab navigation, so clicking the verification link from
  // the same browser tab will still find it here.
  const [leaseContext, setLeaseContext] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('pf_lc');
      if (stored) setLeaseContext(stored);
    } catch { /* incognito / SSR — non-fatal */ }
  }, []);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [destination, setDestination] = useState<string>('/sign-in?verified=true');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      const result = await verifyEmail(token);

      if (result.success) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');

        // Resolve the redirect destination on the client. We can't read the
        // session from a server component here without overcomplicating
        // things, so we lean on `next=` + `result.role` (returned by the
        // verifyEmail action when available).
        //
        // leaseContext is read asynchronously by a useEffect so it may not
        // be populated yet — re-read from sessionStorage inline here to be
        // sure we don't miss it.
        let lc = leaseContext;
        try { lc = lc || sessionStorage.getItem('pf_lc') || null; } catch { /* noop */ }

        const resolved = await resolveDestination({
          next,
          role: (result as any)?.role as string | undefined,
          leaseContext: lc,
        });
        setDestination(resolved);

        // Auto-redirect after a short pause so the user sees the success
        // state. Don't auto-redirect on error — they should read it.
        setTimeout(() => {
          window.location.href = resolved;
        }, 1200);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center'>
        {status === 'loading' && (
          <>
            <Loader className='w-12 h-12 mx-auto animate-spin text-primary mb-4' />
            <h1 className='text-xl font-semibold mb-2'>Verifying Email</h1>
            <p className='text-gray-600'>Please wait while we verify your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className='w-12 h-12 mx-auto text-green-500 mb-4' />
            <h1 className='text-xl font-semibold mb-2'>Email Verified!</h1>
            <p className='text-gray-600 mb-6'>{message}</p>
            <Button asChild className='w-full'>
              <Link href={destination}>Continue</Link>
            </Button>
            <p className='text-xs text-gray-400 mt-3'>Redirecting you automatically…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className='w-12 h-12 mx-auto text-red-500 mb-4' />
            <h1 className='text-xl font-semibold mb-2'>Verification Failed</h1>
            <p className='text-gray-600 mb-6'>{message}</p>
            <Button asChild className='w-full'>
              <Link href='/sign-up'>Back to Sign Up</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Resolve where to send the user after a successful verification.
 * 1. honor `?next=` if present and same-origin
 * 2. if the user came from the free lease builder (leaseContext blob present),
 *    send them to the smart-setup page so their property is auto-created.
 * 3. if user hasn't completed onboarding (no role selected), send to role picker
 * 4. otherwise pick a dashboard by their server-known role
 * 5. fall back to /sign-in
 */
async function resolveDestination(args: {
  next: string | null;
  role: string | undefined;
  leaseContext?: string | null;
}): Promise<string> {
  // Same-origin allowlist for `next` to prevent open redirects.
  if (args.next && args.next.startsWith('/') && !args.next.startsWith('//')) {
    return args.next;
  }

  // If the user came from the free lease builder, route them to the smart
  // setup page so their property is auto-created from the lease they built.
  // This is the fix for the case where the user clicks the verification link
  // from their email and the lc= URL param was not threaded through.
  if (args.leaseContext) {
    return `/admin/onboarding/from-lease?lc=${encodeURIComponent(args.leaseContext)}`;
  }

  // If user has role 'user' (no specific role selected yet), send them to
  // the role picker at /onboarding so they can choose their path
  if (args.role === 'user' || !args.role) {
    return '/onboarding';
  }

  switch (args.role) {
    case 'contractor':
    case 'contractor_employee':
      return '/contractor-dashboard';
    case 'landlord':
    case 'property_manager':
    case 'admin':
    case 'superAdmin':
      return '/admin/overview';
    case 'agent':
      return '/agent-dashboard';
    case 'tenant':
      return '/tenant-portal';
    case 'homeowner':
      return '/homeowner';
    default:
      return '/sign-in?verified=true';
  }
}
