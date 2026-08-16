/**
 * GET /api/wallet/external-accounts
 *
 * Returns the bank accounts the user has already linked to their Connect
 * account. The withdraw modal uses this for the destination dropdown. We
 * never collect routing/account fields ourselves — all linking happens
 * through Stripe-hosted Account Links (see POST below).
 *
 * POST /api/wallet/external-accounts
 *
 * Generates a Stripe Account Link for adding a new external bank account.
 * Returns { url } the client should redirect to. Stripe collects the
 * information, validates it, and redirects back to /api/stripe/connect/return.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { SERVER_URL } from '@/lib/constants';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getOrCreateConnectAccountForLandlord } from '@/lib/services/stripe-connect.service';

export interface WalletExternalAccount {
  id: string;
  bankName: string | null;
  last4: string | null;
  accountHolderName: string | null;
  isDefault: boolean;
  status: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ accounts: [] });
    }
    const landlord = landlordResult.landlord;
    if (!landlord.stripeConnectAccountId) {
      return NextResponse.json({ accounts: [] });
    }

    const account = await stripe.accounts.retrieve(
      landlord.stripeConnectAccountId,
      { expand: ['external_accounts'] }
    );
    const list = (account as any).external_accounts?.data ?? [];

    const accounts: WalletExternalAccount[] = list
      .filter((a: any) => a.object === 'bank_account')
      .map((a: any) => ({
        id: a.id,
        bankName: a.bank_name ?? null,
        last4: a.last4 ?? null,
        accountHolderName: a.account_holder_name ?? null,
        isDefault: !!a.default_for_currency,
        status: a.status ?? 'unknown',
      }));

    return NextResponse.json({ accounts });
  } catch (err: any) {
    console.error('[wallet/external-accounts] GET failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not list external accounts.' },
      { status: 500 }
    );
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json(
        { error: 'Landlord not found' },
        { status: 404 }
      );
    }

    // Re-use the onboarding service so the Connect account exists and we
    // get a hosted link. We pass account_onboarding which Stripe surfaces
    // the "add external account" flow on for already-verified accounts.
    const result = await getOrCreateConnectAccountForLandlord(
      landlordResult.landlord.id,
      session.user.email
    );

    return NextResponse.json({
      url: result.url,
      returnUrl: `${SERVER_URL}/admin/wallet?linked=true`,
    });
  } catch (err: any) {
    console.error('[wallet/external-accounts] POST failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not start bank linking.' },
      { status: 500 }
    );
  }
}
