/**
 * Stripe Connect (Custom + Treasury) onboarding service for landlords/PMs.
 *
 * Why Custom and not Express?
 * ---------------------------
 * Stripe Treasury (the FinancialAccount API used to issue per-user routing /
 * account numbers) is **not available on Express accounts**. It requires a
 * Custom Connect account with the `treasury` capability requested. We still
 * use Stripe-hosted onboarding via Account Links so we never collect KYC
 * data ourselves — the user is bounced to Stripe's verification flow and
 * back. From the user's perspective the experience is indistinguishable
 * from Express.
 *
 * This service is idempotent: callers can invoke `getOrCreateConnectAccount`
 * on every page load. It only creates a Stripe account if one isn't already
 * stored on the Landlord row, and only re-generates the Account Link when
 * the user is not yet fully verified.
 */

import 'server-only';
import Stripe from 'stripe';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { SERVER_URL } from '@/lib/constants';
import {
  deriveOnboardingStatus,
  persistOnboardingStatus,
  type StripeOnboardingStatus,
} from '@/types/stripe';

/** Capabilities a Treasury-enabled platform user must have requested. */
const REQUIRED_CAPABILITIES: Stripe.AccountCreateParams.Capabilities = {
  transfers: { requested: true },
  treasury: { requested: true },
  card_payments: { requested: true },
  us_bank_account_ach_payments: { requested: true },
};

const TREASURY_BANK_NAME = 'Property Flow Wallet';

/**
 * Whether the platform is approved for Stripe Treasury. While we wait on
 * the Treasury review we only request the capabilities a landlord needs
 * to receive rent (charges + transfers + ACH). When this flips to true,
 * new Connect accounts additionally request the `treasury` capability and
 * the wallet UI exposes the balance / card / account-numbers surface.
 *
 * Source of truth: `STRIPE_TREASURY_ENABLED` env var (default off).
 */
export function isTreasuryEnabled(): boolean {
  return process.env.STRIPE_TREASURY_ENABLED === 'true';
}

function buildRequiredCapabilities(): Stripe.AccountCreateParams.Capabilities {
  const base: Stripe.AccountCreateParams.Capabilities = {
    transfers: { requested: true },
    card_payments: { requested: true },
    us_bank_account_ach_payments: { requested: true },
  };
  if (isTreasuryEnabled()) {
    base.treasury = { requested: true };
  }
  return base;
}

interface OnboardLandlordResult {
  accountId: string;
  /** Hosted Stripe URL the user should be redirected to for KYC. */
  url: string;
  /** Whether the Stripe account was created on this call. */
  created: boolean;
}

/**
 * Get or create a Custom Connect account for the given landlord, request
 * Treasury + transfers capabilities, and return a one-shot Account Link the
 * user should be redirected to. If the user is already fully verified the
 * returned URL is the dashboard return URL — there's nothing else to KYC.
 */
export async function getOrCreateConnectAccountForLandlord(
  landlordId: string,
  email: string | null | undefined
): Promise<OnboardLandlordResult> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: {
      id: true,
      stripeConnectAccountId: true,
      companyName: true,
      name: true,
    },
  });

  if (!landlord) {
    throw new Error('Landlord not found');
  }

  let accountId = landlord.stripeConnectAccountId ?? null;
  let created = false;

  // 1. If we already have an account ID stored, validate that it still
  //    exists in Stripe before reusing it. Stripe accounts can be deleted
  //    out from under us in test mode.
  if (accountId) {
    try {
      await stripe.accounts.retrieve(accountId);
    } catch (err: any) {
      if (err?.code === 'account_invalid' || err?.statusCode === 404) {
        accountId = null;
        await prisma.landlord.update({
          where: { id: landlord.id },
          data: {
            stripeConnectAccountId: null,
            stripeOnboardingStatus: persistOnboardingStatus('invalid'),
          },
        });
      } else {
        throw err;
      }
    }
  }

  // 2. Create a fresh Connect account if needed.
  if (!accountId) {
    // Controller configuration depends on whether Stripe Treasury is
    // approved for this platform.
    //
    //  - Treasury OFF (today): use an Express-style controller. Stripe
    //    handles losses + KYC requirement collection, so the platform
    //    doesn't need to have accepted "Custom" responsibilities in its
    //    dashboard before we can call `accounts.create`. Connected
    //    accounts get a Stripe-hosted Express dashboard. This is enough
    //    for destination-charge rent collection.
    //
    //  - Treasury ON (post-approval): use the Custom controller. Stripe
    //    Treasury requires `losses.payments = 'application'` and
    //    `requirement_collection = 'application'`, which in turn
    //    requires the platform to accept those responsibilities in its
    //    Connect platform profile.
    //
    // Note: `controller` and `type` are mutually exclusive on
    // `accounts.create` — we always pass `controller` and let Stripe
    // infer the legacy "type" from the controller settings.
    const controller: Stripe.AccountCreateParams.Controller = isTreasuryEnabled()
      ? {
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          stripe_dashboard: { type: 'none' },
          requirement_collection: 'application',
        }
      : {
          // Loss responsibility lives with the platform on Express
          // dashboard accounts. Setting `payments: 'stripe'` makes Stripe
          // refuse to issue Express dashboard sessions ("With a dashboard
          // type of `express`, the Connect application must control
          // losses"). Keep this in sync with the `controller` blocks in
          // app/api/landlord/stripe/onboard/route.ts and the contractor
          // equivalent.
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          stripe_dashboard: { type: 'express' },
          requirement_collection: 'stripe',
        };

    const account = await stripe.accounts.create({
      country: 'US',
      email: email || undefined,
      capabilities: buildRequiredCapabilities(),
      business_type: 'individual',
      business_profile: {
        name: landlord.companyName || landlord.name,
        mcc: '6513', // Real estate property managers
        product_description:
          'Property management platform for rent collection and disbursements',
      },
      controller,
      metadata: {
        landlordId: landlord.id,
        platform: 'propertyflowhq',
        type: isTreasuryEnabled() ? 'landlord_treasury' : 'landlord_rent',
      },
    });

    accountId = account.id;
    created = true;

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        stripeConnectAccountId: accountId,
        stripeOnboardingStatus: persistOnboardingStatus('pending'),
      },
    });
  }

  // 3. Generate a hosted Account Link. Stripe's hosted onboarding handles
  //    every KYC field — we never see SSN, DOB, ID upload, etc.
  const link = await stripe.accountLinks.create({
    account: accountId!,
    refresh_url: `${SERVER_URL}/api/stripe/connect/refresh`,
    return_url: `${SERVER_URL}/api/stripe/connect/return`,
    type: 'account_onboarding',
    collection_options: {
      // Ask for full set of requirements at once — better UX than dripping.
      fields: 'eventually_due',
    },
  });

  return {
    accountId: accountId!,
    url: link.url,
    created,
  };
}

/**
 * Pull the latest snapshot of the connected account from Stripe and reflect
 * the derived status onto the Landlord row. Safe to call on every page load.
 */
export async function syncLandlordConnectStatus(landlordId: string): Promise<{
  status: StripeOnboardingStatus;
  account: Stripe.Account | null;
}> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: {
      id: true,
      stripeConnectAccountId: true,
      stripeOnboardingStatus: true,
      stripeTreasuryEnabled: true,
    },
  });

  if (!landlord) {
    throw new Error('Landlord not found');
  }

  if (!landlord.stripeConnectAccountId) {
    return { status: 'not_started', account: null };
  }

  let account: Stripe.Account;
  try {
    account = await stripe.accounts.retrieve(landlord.stripeConnectAccountId);
  } catch (err: any) {
    if (err?.code === 'account_invalid' || err?.statusCode === 404) {
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          stripeOnboardingStatus: persistOnboardingStatus('invalid'),
          stripeTreasuryEnabled: false,
        },
      });
      return { status: 'invalid', account: null };
    }
    throw err;
  }

  const status = deriveOnboardingStatus(account);
  const treasuryActive = account.capabilities?.treasury === 'active';

  if (
    landlord.stripeOnboardingStatus !== status ||
    landlord.stripeTreasuryEnabled !== treasuryActive
  ) {
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        stripeOnboardingStatus: persistOnboardingStatus(status),
        stripeTreasuryEnabled: treasuryActive,
      },
    });
  }

  // Side effect: once Treasury is active, kick off the auto-creation of
  // the Financial Account if we haven't yet. Only attempt this when the
  // platform is approved for Treasury; otherwise an account that happens
  // to have a stray treasury capability would still be inert.
  if (treasuryActive && isTreasuryEnabled()) {
    try {
      await ensureFinancialAccountForLandlord(landlord.id);
    } catch (err) {
      // Non-fatal — caller can retry. Logged for observability.
      console.error('[stripe-connect] ensureFinancialAccount failed', err);
    }
  }

  return { status, account };
}

/**
 * Create the Treasury FinancialAccount for a landlord if it doesn't already
 * exist in our DB. Also writes a row to `FinancialAccount` and returns it.
 *
 * Pre-condition: the landlord's Connect account has `treasury` active. This
 * is checked by `syncLandlordConnectStatus` before invoking us.
 *
 * No-op (returns null) when the platform is not approved for Treasury.
 * Callers should treat null as "wallet feature unavailable" and avoid
 * exposing wallet balance / account-number UI.
 */
export async function ensureFinancialAccountForLandlord(landlordId: string) {
  if (!isTreasuryEnabled()) return null;

  const existing = await prisma.financialAccount.findFirst({
    where: { landlordId, status: { in: ['pending', 'active'] } },
  });
  if (existing) return existing;

  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: { stripeConnectAccountId: true, name: true, companyName: true },
  });
  if (!landlord?.stripeConnectAccountId) {
    throw new Error('Landlord has no Connect account; cannot create Treasury');
  }
  const connectedAccountId = landlord.stripeConnectAccountId;

  // Reuse an existing financial account on Stripe if there is one — Stripe
  // permits up to one per connected account today, so we never accidentally
  // create duplicates.
  const list = await stripe.treasury.financialAccounts.list(
    { limit: 1 },
    { stripeAccount: connectedAccountId }
  );

  let financialAccount =
    list.data[0] ??
    (await stripe.treasury.financialAccounts.create(
      {
        supported_currencies: ['usd'],
        features: {
          financial_addresses: { aba: { requested: true } },
          deposit_insurance: { requested: true },
          inbound_transfers: { ach: { requested: true } },
          outbound_transfers: {
            ach: { requested: true },
            us_domestic_wire: { requested: true },
          },
          outbound_payments: {
            ach: { requested: true },
            us_domestic_wire: { requested: true },
          },
          intra_stripe_flows: { requested: true },
        },
        metadata: { landlordId, bankName: TREASURY_BANK_NAME },
      },
      { stripeAccount: connectedAccountId }
    ));

  // Pull ABA routing info if available (it lands a few seconds after creation
  // for some users; we tolerate either case).
  const aba = financialAccount.financial_addresses?.find(
    (a) => a.type === 'aba'
  )?.aba;

  const created = await prisma.financialAccount.create({
    data: {
      landlordId,
      stripeConnectedAccountId: connectedAccountId,
      stripeFinancialAccountId: financialAccount.id,
      status: financialAccount.status === 'open' ? 'active' : 'pending',
      routingNumber: aba?.routing_number ?? null,
      accountNumberLast4: aba?.account_number_last4 ?? null,
      bankName: TREASURY_BANK_NAME,
      activeFeatures: financialAccount.active_features ?? [],
    },
  });

  await prisma.landlord.update({
    where: { id: landlordId },
    data: { stripeTreasuryEnabled: true },
  });

  return created;
}

/** Build a one-line summary of `requirements.currently_due` for the UI. */
export function summarizeRequirements(
  account: Stripe.Account | null
): string | null {
  if (!account) return null;
  const reason = account.requirements?.disabled_reason;
  if (reason) {
    return `Stripe action required: ${reason.replaceAll('_', ' ')}`;
  }
  const due = account.requirements?.currently_due ?? [];
  if (due.length === 0) return null;
  return `${due.length} verification step${due.length === 1 ? '' : 's'} remaining`;
}
