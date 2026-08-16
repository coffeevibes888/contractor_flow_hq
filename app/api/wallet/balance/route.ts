/**
 * GET /api/wallet/balance
 *
 * Lightweight wrapper over /api/stripe/treasury/account that returns
 * just the balance and verified status. Optimized for the wallet widget
 * + the dashboard balance card — both call this on a 30s SWR cadence.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import {
  ensureFinancialAccountForLandlord,
  isTreasuryEnabled,
  syncLandlordConnectStatus,
} from '@/lib/services/stripe-connect.service';
import type { StripeOnboardingStatus } from '@/types/stripe';

export interface WalletBalanceResponse {
  /** Status from the Connect account, drives whether actions are enabled. */
  onboardingStatus: StripeOnboardingStatus;
  /** True only when KYC is verified AND Treasury is provisioned. */
  ready: boolean;
  /**
   * Whether the platform is approved for Stripe Treasury. When false the
   * client should hide wallet balance / card / account-number UI and
   * surface only rent-collection state.
   */
  treasuryEnabled: boolean;
  /** Available balance in USD (cash). */
  available: number;
  /** Money landed but not yet available. */
  pending: number;
  /** Money queued to leave the account. */
  outboundPending: number;
  /** Last 4 of the account number (display only). */
  accountNumberLast4: string | null;
  /** Routing number (Stripe issues these — safe to show). */
  routingNumber: string | null;
  bankName: string;
  financialAccountId: string | null;
  /** When the balance was retrieved from Stripe. */
  fetchedAt: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json(
        { error: landlordResult.message || 'Landlord not found' },
        { status: 404 }
      );
    }

    const landlord = landlordResult.landlord;
    const treasuryEnabled = isTreasuryEnabled();

    const empty: WalletBalanceResponse = {
      onboardingStatus: 'not_started',
      ready: false,
      treasuryEnabled,
      available: 0,
      pending: 0,
      outboundPending: 0,
      accountNumberLast4: null,
      routingNumber: null,
      bankName: 'Property Flow Wallet',
      financialAccountId: null,
      fetchedAt: new Date().toISOString(),
    };

    if (!landlord.stripeConnectAccountId) {
      return NextResponse.json(empty);
    }

    const { status } = await syncLandlordConnectStatus(landlord.id);

    // When Treasury is gated off (waiting on Stripe approval), expose the
    // Connect onboarding status so the rent-collection UI can render the
    // "set up payments" banner, but never try to provision a Treasury
    // financial account. `ready` reflects KYC completion only — sufficient
    // for tenants to pay rent into the Connect account.
    if (!treasuryEnabled) {
      return NextResponse.json({
        ...empty,
        onboardingStatus: status,
        ready: status === 'verified',
      });
    }

    if (status !== 'verified') {
      return NextResponse.json({ ...empty, onboardingStatus: status });
    }

    let dbFa = await prisma.financialAccount.findFirst({
      where: { landlordId: landlord.id, status: { in: ['pending', 'active'] } },
    });
    if (!dbFa) {
      try {
        dbFa = await ensureFinancialAccountForLandlord(landlord.id);
      } catch {
        return NextResponse.json({ ...empty, onboardingStatus: status });
      }
    }

    if (!dbFa) {
      // Treasury not provisioned yet — return verified status without balance.
      return NextResponse.json({ ...empty, onboardingStatus: status });
    }

    const fa = await stripe.treasury.financialAccounts.retrieve(
      dbFa.stripeFinancialAccountId,
      { expand: ['financial_addresses'] },
      { stripeAccount: dbFa.stripeConnectedAccountId }
    );
    const aba = fa.financial_addresses?.find((a) => a.type === 'aba')?.aba;

    const payload: WalletBalanceResponse = {
      onboardingStatus: status,
      ready: fa.status === 'open',
      treasuryEnabled,
      available: (fa.balance?.cash?.usd ?? 0) / 100,
      pending: (fa.balance?.inbound_pending?.usd ?? 0) / 100,
      outboundPending: (fa.balance?.outbound_pending?.usd ?? 0) / 100,
      accountNumberLast4: aba?.account_number_last4 ?? null,
      routingNumber: aba?.routing_number ?? null,
      bankName: 'Property Flow Wallet',
      financialAccountId: fa.id,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[wallet/balance] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not load balance.' },
      { status: 500 }
    );
  }
}
