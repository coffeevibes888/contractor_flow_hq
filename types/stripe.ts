/**
 * Shared TypeScript shapes for the Stripe Connect + Treasury surface.
 *
 * The Stripe SDK ships its own deeply-typed objects (e.g. `Stripe.Account`,
 * `Stripe.Treasury.FinancialAccount`). We don't try to re-implement those.
 * What we DO export from here is the much smaller "wire shape" we expose
 * over our own API — i.e. what the React client expects to receive when
 * it calls `/api/stripe/connect/status` or `/api/stripe/treasury/...`.
 *
 * Keeping these centralized means the client hooks and the route handlers
 * cannot drift apart silently.
 */

import type Stripe from 'stripe';

/**
 * Onboarding status state machine for the Connect account, surfaced to UI.
 *
 *  - `not_started` — No Connect account exists yet.
 *  - `pending`     — Account exists, KYC has not been submitted.
 *  - `in_review`   — Submitted, Stripe is reviewing.
 *  - `verified`    — Account is fully active, payouts + Treasury allowed.
 *  - `restricted`  — Account is gated; requires action (look at requirements).
 *  - `invalid`     — Account no longer retrievable from Stripe (deleted etc.).
 */
export type StripeOnboardingStatus =
  | 'not_started'
  | 'pending'
  | 'in_review'
  | 'verified'
  | 'restricted'
  | 'invalid';

/** Wire shape returned by `GET /api/stripe/connect/status`. */
export interface StripeAccountStatusResponse {
  hasAccount: boolean;
  accountId: string | null;
  status: StripeOnboardingStatus;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  treasuryRequested: boolean;
  treasuryActive: boolean;
  detailsSubmitted: boolean;
  /** A short reason, if present, derived from Stripe's `requirements`. */
  requirementsSummary: string | null;
  currentlyDue: string[];
  pastDue: string[];
  /** Set when status === 'pending' / 'restricted' so the UI can resume KYC. */
  onboardingUrl: string | null;
}

/** Wire shape returned by `POST /api/stripe/connect/onboard`. */
export interface StripeOnboardingLinkResponse {
  success: boolean;
  accountId: string;
  /** Hosted Stripe-managed KYC URL the user should be redirected to. */
  url: string;
  /** True if a Connect account was created on this call. */
  created: boolean;
}

/** Wire shape returned by `GET /api/stripe/treasury/account`. */
export interface TreasuryAccountResponse {
  hasAccount: boolean;
  /** Some users will have Connect verified but Treasury not yet provisioned. */
  treasuryProvisioned: boolean;
  financialAccountId: string | null;
  status: 'pending' | 'open' | 'closed' | null;
  routingNumber: string | null;
  /** Always masked. Use `/api/stripe/treasury/reveal` for the full number. */
  accountNumberLast4: string | null;
  bankName: string;
  balance: {
    available: number;
    inboundPending: number;
    outboundPending: number;
  };
  features: string[];
}

/** Wire shape returned by `POST /api/stripe/treasury/reveal`. */
export interface TreasuryRevealResponse {
  success: boolean;
  routingNumber: string | null;
  accountNumber: string | null;
  /** Tokens are short-lived; the client should not cache them. */
  expiresAt: string;
}

/** Helpers for deriving high-level status from raw Stripe objects. */
export function deriveOnboardingStatus(
  account: Stripe.Account | null
): StripeOnboardingStatus {
  if (!account) return 'not_started';

  const requirementsCount =
    (account.requirements?.currently_due?.length ?? 0) +
    (account.requirements?.past_due?.length ?? 0);

  if (
    account.payouts_enabled &&
    account.charges_enabled &&
    account.details_submitted
  ) {
    return 'verified';
  }

  if (account.requirements?.disabled_reason) {
    return 'restricted';
  }

  if (account.details_submitted && requirementsCount === 0) {
    return 'in_review';
  }

  return 'pending';
}

/** Map our app-level status to the persisted column value. */
export function persistOnboardingStatus(
  status: StripeOnboardingStatus
): string {
  return status;
}
