'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, UserPlus } from 'lucide-react';

/**
 * /contractor/invite?token=xxx
 *
 * Landing page for employees who click an invite link.
 * If signed in → auto-accept. If not → redirect to sign-up with invite param.
 */
export default function InviteAcceptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = searchParams.get('token');

  const [state, setState] = useState<'loading' | 'accepting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('No invite token provided.');
      return;
    }

    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      // Redirect to sign-up with the invite token
      router.push(`/sign-up?invite=${token}`);
      return;
    }

    // User is authenticated — accept the invite
    acceptInvite();
  }, [token, sessionStatus]);

  async function acceptInvite() {
    setState('accepting');
    try {
      const res = await fetch('/api/contractor/team/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setState('success');
        setMessage(data.message);
        // Redirect to contractor dashboard after 2 seconds
        setTimeout(() => router.push('/contractor-dashboard'), 2000);
      } else {
        setState('error');
        setMessage(data.error || 'Failed to accept invite');
      }
    } catch {
      setState('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">Invalid invite link</p>
            <p className="text-sm text-muted-foreground mt-2">This link is missing the invite token.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <UserPlus className="h-10 w-10 text-blue-600 mx-auto mb-2" />
          <CardTitle>Team Invite</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {(state === 'loading' || state === 'accepting') && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-muted-foreground">
                {state === 'loading' ? 'Checking your session...' : 'Accepting invite...'}
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="text-lg font-semibold text-emerald-700">{message}</p>
              <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-lg font-semibold text-red-700">{message}</p>
              <Button variant="outline" onClick={() => router.push('/sign-in')} className="mt-4">
                Go to Sign In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
