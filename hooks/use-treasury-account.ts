'use client';

/**
 * useTreasuryAccount — client-side hook for reading the landlord's
 * Treasury wallet (routing number, masked account number, balance,
 * status). Includes a `reveal()` helper that calls the 2FA-gated
 * reveal endpoint to fetch the FULL account number.
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  TreasuryAccountResponse,
  TreasuryRevealResponse,
} from '@/types/stripe';

interface UseTreasuryAccountReturn {
  account: TreasuryAccountResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /**
   * Reveal full routing + account number after 2FA confirmation.
   *
   * @param code 6-digit TOTP code (or 8-char backup code) from the
   *             user's authenticator app.
   * @throws if the code is invalid, 2FA isn't enrolled, or Stripe
   *         hasn't issued the account number yet.
   */
  reveal: (code: string) => Promise<TreasuryRevealResponse>;
}

export function useTreasuryAccount(): UseTreasuryAccountReturn {
  const [account, setAccount] = useState<TreasuryAccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/treasury/account', {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Account request failed (${res.status})`);
      }
      const json = (await res.json()) as TreasuryAccountResponse;
      setAccount(json);
    } catch (err: any) {
      setError(err?.message || 'Could not load Treasury account.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reveal = useCallback(
    async (code: string): Promise<TreasuryRevealResponse> => {
      const res = await fetch('/api/stripe/treasury/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json().catch(() => ({}))) as
        | TreasuryRevealResponse
        | { error?: string };
      if (!res.ok) {
        throw new Error(
          (body as { error?: string }).error ||
            `Reveal failed (${res.status})`
        );
      }
      return body as TreasuryRevealResponse;
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { account, loading, error, refresh, reveal };
}
