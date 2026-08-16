'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, UserPlus } from 'lucide-react';

type InviteState = 'loading' | 'accepting' | 'success' | 'error';

export default function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const token = searchParams.get('token');
  const acceptedRef = useRef(false);

  const [state, setState] = useState<InviteState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('No invite token provided.');
      return;
    }

    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      // Send them to sign-up with a callback that brings them right back here.
      // Sign-up flow stays untouched — it just honors the callbackUrl param
      // it already supports.
      const callback = `/accept-invite?token=${encodeURIComponent(token)}`;
      router.push(`/sign-up?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

    // Authenticated — accept the invite once.
    if (acceptedRef.current) return;
    acceptedRef.current = true;
    void acceptInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setMessage(data.message || 'Welcome aboard!');
        // Force a session refresh so the new role flows through, then go.
        setTimeout(() => {
          window.location.href = '/contractor-dashboard';
        }, 1500);
      } else {
        setState('error');
        setMessage(data.error || data.message || 'Failed to accept invite');
      }
    } catch {
      setState('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">Invalid invite link</p>
            <p className="text-sm text-muted-foreground mt-2">
              This link is missing the invite token.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <UserPlus className="h-10 w-10 text-blue-600 mx-auto mb-2" />
          <CardTitle>Team Invitation</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {(state === 'loading' || state === 'accepting') && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-muted-foreground">
                {state === 'loading'
                  ? 'Checking your session...'
                  : 'Accepting invite...'}
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="text-lg font-semibold text-emerald-700">{message}</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to your dashboard...
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-lg font-semibold text-red-700">{message}</p>
              <Link href="/sign-in">
                <Button variant="outline" className="mt-4">
                  Go to Sign In
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
