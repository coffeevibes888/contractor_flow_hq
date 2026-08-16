'use client';

/**
 * Modal that securely reveals the full PAN + CVV using Stripe Issuing
 * Elements. We never see the PAN client- or server-side — Stripe.js
 * renders the digits inside an iframe using a one-shot ephemeral key.
 *
 * Flow:
 *   1. User submits 2FA code → POST /api/cards/:id/details
 *   2. Server returns { ephemeralKey, cardId } (single-use, ~30s)
 *   3. We mount Stripe Issuing Elements with that key
 *   4. After 60s we tear down the iframe so secrets don't linger
 */

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe as StripeJs, StripeElements } from '@stripe/stripe-js';

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripeJs() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
    );
  }
  return stripePromise;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Internal IssuingCard.id (NOT the Stripe id). */
  cardId: string;
}

export function CardRevealModal({ open, onOpenChange, cardId }: Props) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'verify' | 'reveal'>('verify');
  const numberRef = useRef<HTMLDivElement | null>(null);
  const cvcRef = useRef<HTMLDivElement | null>(null);
  const expiryRef = useRef<HTMLDivElement | null>(null);

  // Reset on close.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setCode('');
      setError(null);
      setSubmitting(false);
      setPhase('verify');
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  const handleVerify = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === 'twofa_required') {
          setError(
            'You need to set up two-factor authentication first. Open Settings → Security.'
          );
        } else {
          setError(json.error || 'Could not verify.');
        }
        return;
      }

      // Mount Stripe Issuing Elements with the ephemeral key.
      const stripeJs = await getStripeJs();
      if (!stripeJs) {
        setError('Stripe.js failed to load.');
        return;
      }

      // Wait one tick so the refs exist after `setPhase('reveal')`.
      setPhase('reveal');
      window.setTimeout(() => {
        mountIssuingElements(
          stripeJs,
          json.cardId,
          json.ephemeralKey,
          numberRef.current!,
          cvcRef.current!,
          expiryRef.current!
        );
      }, 50);

      // Auto-tear-down after 60s.
      window.setTimeout(() => onOpenChange(false), 60_000);
    } catch (err: any) {
      setError(err?.message || 'Could not verify.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ShieldAlert className='h-4 w-4 text-sky-600' />
            Reveal full card details
          </DialogTitle>
          <DialogDescription>
            For your security, enter your authenticator code to display
            the full card number, CVV, and expiry. Details auto-hide
            after 60 seconds.
          </DialogDescription>
        </DialogHeader>

        {phase === 'verify' ? (
          <div className='space-y-3'>
            <Label htmlFor='card-reveal-code'>Two-factor code</Label>
            <Input
              id='card-reveal-code'
              autoFocus
              inputMode='numeric'
              autoComplete='one-time-code'
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder='123 456'
              className='tracking-widest text-center font-mono text-lg'
            />
            {error && <p className='text-sm text-rose-600'>{error}</p>}
          </div>
        ) : (
          <div className='space-y-4'>
            <div>
              <Label className='text-xs uppercase tracking-wide text-slate-500'>
                Card Number
              </Label>
              <div
                ref={numberRef}
                className='mt-1 rounded-md border border-slate-200 bg-white px-3 py-2.5 font-mono text-lg tabular-nums'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label className='text-xs uppercase tracking-wide text-slate-500'>
                  Expires
                </Label>
                <div
                  ref={expiryRef}
                  className='mt-1 rounded-md border border-slate-200 bg-white px-3 py-2.5 font-mono'
                />
              </div>
              <div>
                <Label className='text-xs uppercase tracking-wide text-slate-500'>
                  CVC
                </Label>
                <div
                  ref={cvcRef}
                  className='mt-1 rounded-md border border-slate-200 bg-white px-3 py-2.5 font-mono'
                />
              </div>
            </div>
            <p className='text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5'>
              Card details auto-hide after 60 seconds.
            </p>
          </div>
        )}

        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {phase === 'verify' ? 'Cancel' : 'Close'}
          </Button>
          {phase === 'verify' && (
            <Button
              onClick={handleVerify}
              disabled={!code || submitting}
              className='bg-sky-600 hover:bg-sky-700'
            >
              {submitting ? 'Verifying…' : 'Reveal'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Mount Stripe Issuing Elements into the three refs. Stripe.js renders
 * the actual digits inside iframes — we only see styling tokens.
 */
function mountIssuingElements(
  stripe: StripeJs,
  cardId: string,
  ephemeralKey: string,
  numberEl: HTMLElement,
  cvcEl: HTMLElement,
  expiryEl: HTMLElement
) {
  const elements: StripeElements = (stripe as any).elements();
  const style = {
    base: {
      color: '#0f172a',
      fontSize: '18px',
      fontFamily: 'ui-monospace, monospace',
      letterSpacing: '0.05em',
      iconColor: '#0ea5e9',
    },
    invalid: { color: '#e11d48' },
  };
  // The IssuingCard* element types come from Stripe.js typings.
  const numberElement = (elements as any).create('issuingCardNumberDisplay', {
    issuingCard: cardId,
    nonce: undefined,
    ephemeralKeySecret: ephemeralKey,
    style,
  });
  const cvcElement = (elements as any).create('issuingCardCvcDisplay', {
    issuingCard: cardId,
    ephemeralKeySecret: ephemeralKey,
    style,
  });
  const expiryElement = (elements as any).create('issuingCardExpiryDisplay', {
    issuingCard: cardId,
    ephemeralKeySecret: ephemeralKey,
    style,
  });
  numberElement.mount(numberEl);
  cvcElement.mount(cvcEl);
  expiryElement.mount(expiryEl);
}
