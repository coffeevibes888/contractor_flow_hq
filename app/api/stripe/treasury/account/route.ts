/**
 * GET /api/stripe/treasury/account
 *
 * Returns the landlord's Treasury financial account in the masked shape
 * suitable for display. Account number is ALWAYS returned as last4 — full
 * digits live behind `/api/stripe/treasury/reveal` and require 2FA.
 *
 * If the user is verified but the financial account hasn't been provisioned
 * yet (Stripe takes a few seconds), the route will provision it on the fly
 * and return the result.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import {
  ensureFinancialAccountForLandlord,
  syncLandlordConnectStatus,
} from '@/lib/services/stripe-connect.service';
import type { TreasuryAccountResponse } from '@/types/stripe';

const BANK_NAME = 'Property Flow Wallet';

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
    const empty: TreasuryAccountResponse = {
      hasAccount: false,
      treasuryProvisioned: false,
      financialAccountId: null,
      status: null,
      routingNumber: null,
      accountNumberLast4: null,
      bankName: BANK_NAME,
      balance: { available: 0, inboundPending: 0, outboundPending: 0 },
      features: [],
    };

    if (!landlord.stripeConnectAccountId) {
      return NextResponse.json(empty);
    }

    // Make sure the Connect status is fresh — this also auto-provisions the
    // financial account if Treasury just went active.
    const { status } = await syncLandlordConnectStatus(landlord.id);
    if (status !== 'verified') {
      return NextResponse.json(empty);
    }

    // Provision the financial account if missing.
    let dbFa = await prisma.financialAccount.findFirst({
      where: { landlordId: landlord.id, status: { in: ['pending', 'active'] } },
    });
    if (!dbFa) {
      try {
        dbFa = await ensureFinancialAccountForLandlord(landlord.id);
      } catch (err) {
        console.error('[treasury/account] provisioning failed', err);
        return NextResponse.json(empty);
      }
    }

    // Pull live balance + ABA from Stripe so we never serve stale numbers.
    const fa = await stripe.treasury.financialAccounts.retrieve(
      dbFa.stripeFinancialAccountId,
      { expand: ['financial_addresses'] },
      { stripeAccount: dbFa.stripeConnectedAccountId }
    );
    const aba = fa.financial_addresses?.find((a) => a.type === 'aba')?.aba;

    // Refresh routing number / status / features in our DB if they changed.
    const newRouting = aba?.routing_number ?? null;
    const newLast4 = aba?.account_number_last4 ?? null;
    const newStatus = fa.status === 'open' ? 'active' : fa.status === 'closed' ? 'closed' : 'pending';
    const newFeatures = fa.active_features ?? [];
    if (
      dbFa.routingNumber !== newRouting ||
      dbFa.accountNumberLast4 !== newLast4 ||
      dbFa.status !== newStatus ||
      JSON.stringify(dbFa.activeFeatures) !== JSON.stringify(newFeatures)
    ) {
      await prisma.financialAccount.update({
        where: { id: dbFa.id },
        data: {
          routingNumber: newRouting,
          accountNumberLast4: newLast4,
          status: newStatus,
          activeFeatures: newFeatures,
        },
      });
    }

    const payload: TreasuryAccountResponse = {
      hasAccount: true,
      treasuryProvisioned: true,
      financialAccountId: fa.id,
      status: fa.status as 'open' | 'closed' | 'pending',
      routingNumber: newRouting,
      accountNumberLast4: newLast4,
      bankName: BANK_NAME,
      balance: {
        available: (fa.balance?.cash?.usd ?? 0) / 100,
        inboundPending: (fa.balance?.inbound_pending?.usd ?? 0) / 100,
        outboundPending: (fa.balance?.outbound_pending?.usd ?? 0) / 100,
      },
      features: newFeatures,
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('[stripe/treasury/account] failed', err);
    return NextResponse.json(
      {
        error:
          err?.message || 'Could not retrieve Treasury account information.',
      },
      { status: 500 }
    );
  }
}
