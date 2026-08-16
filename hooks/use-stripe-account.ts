'use client';

/**
 * useStripeAccount — client-side hook for reading + acting on the
 * landlord's Stripe Connect onboarding state. Used by the dashboard
 * "Wallet" / "Payouts" pages to show a status badge + a "Continue
 * verification" button.
 *
 * The hook does NOT poll on its own — it fetches once on mount and
 * exposes a `refresh()` callback the caller can wire to a "Refresh"
 * button or a setInterval if it wants to.
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  StripeAccountStatusResponse,
  StripeOnboardingLinkResponse,
} from '@/types/stripe';

interface UseStripeAccountReturn {
  status: StripeAccountStatusResponse | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch from /api/stripe/connect/status. */
  refresh: () => Promise<void>;
  /**
   * Kick off (or resume) Stripe-hosted KYC onboarding. Returns the URL
   * the caller should redirect to. Throws on error.
   */
  startOnboarding: () => Promise<string>;
}

export function useStripeAccount(): UseStripeAccountReturn {
  const [status, setStatus] = useState<StripeAccountStatusResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/connect/status', {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Status request failed (${res.status})`);
      }
      const json = (await res.json()) as StripeAccountStatusResponse;
      setStatus(json);
    } catch (err: any) {
      setError(err?.message || 'Could not load Stripe status.');
    } finally {
      setLoading(false);
    }
  }, []);

  const startOnboarding = useCallback(async (): Promise<string> => {
    setError(null);
    const res = await fetch('/api/stripe/connect/onboard', {
      method: 'POST',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Could not start Stripe onboarding.');
    }
    const json = (await res.json()) as StripeOnboardingLinkResponse;
    if (!json.url) {
      throw new Error('Stripe did not return an onboarding URL.');
    }
    return json.url;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, error, refresh, startOnboarding };
}
