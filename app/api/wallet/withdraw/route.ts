/**
 * POST /api/wallet/withdraw
 *
 * Move funds from the landlord's Treasury wallet OUT to one of their
 * verified external bank accounts (linked via Stripe Financial Connections
 * — no card or routing number form ever lives in our app). Uses Stripe
 * Treasury OutboundTransfers, which is the right primitive for "move money
 * to my own external bank" (vs OutboundPayment which is for paying others).
 *
 * Body: { amountCents: number, externalAccountId: string }
 *   externalAccountId: Stripe `ba_...` id from the user's linked external
 *                      accounts. The UI gets this from the Connect account
 *                      via /api/stripe/connect/external-accounts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { logFinancialEvent } from '@/lib/security/audit-logger';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const amountCents = Math.round(Number(body?.amountCents || 0));
    const externalAccountId = String(body?.externalAccountId || '').trim();

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than $0.' },
        { status: 400 }
      );
    }
    if (!externalAccountId.startsWith('ba_')) {
      return NextResponse.json(
        { error: 'Choose a linked bank account.' },
        { status: 400 }
      );
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json(
        { error: landlordResult.message || 'Wallet not found.' },
        { status: 404 }
      );
    }
    const landlord = landlordResult.landlord;

    // Owner-only.
    if (landlord.ownerUserId && landlord.ownerUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the account owner can withdraw funds.' },
        { status: 403 }
      );
    }

    if (landlord.stripeOnboardingStatus !== 'verified') {
      return NextResponse.json(
        { error: 'Finish identity verification before withdrawing.' },
        { status: 403 }
      );
    }

    const fa = await prisma.financialAccount.findFirst({
      where: { landlordId: landlord.id, status: 'active' },
    });
    if (!fa) {
      return NextResponse.json(
        { error: 'Wallet is still being provisioned.' },
        { status: 409 }
      );
    }

    // Confirm the external account exists on this Connect account.
    let externalAccount;
    try {
      externalAccount = await stripe.accounts.retrieveExternalAccount(
        fa.stripeConnectedAccountId,
        externalAccountId
      );
    } catch {
      return NextResponse.json(
        { error: 'That linked bank account could not be found.' },
        { status: 404 }
      );
    }

    // Check live balance from Stripe; never trust the client.
    const senderStripeFa = await stripe.treasury.financialAccounts.retrieve(
      fa.stripeFinancialAccountId,
      {},
      { stripeAccount: fa.stripeConnectedAccountId }
    );
    const availableCents = senderStripeFa.balance?.cash?.usd ?? 0;
    if (amountCents > availableCents) {
      return NextResponse.json(
        { error: 'Amount exceeds your available balance.' },
        { status: 400 }
      );
    }

    const transfer = await stripe.treasury.outboundTransfers.create(
      {
        financial_account: fa.stripeFinancialAccountId,
        amount: amountCents,
        currency: 'usd',
        destination_payment_method: externalAccountId,
        description: 'Withdraw to linked bank',
        statement_descriptor: 'PROPFLOW',
        metadata: {
          landlordId: landlord.id,
          source: 'wallet.withdraw',
        },
      },
      { stripeAccount: fa.stripeConnectedAccountId }
    );

    logFinancialEvent('PAYOUT_INITIATED', {
      userId: session.user.id,
      landlordId: landlord.id,
      amount: amountCents / 100,
      currency: 'USD',
      transactionId: transfer.id,
      paymentMethod: 'treasury_outbound_transfer',
      additionalData: { externalAccountId },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      transactionId: transfer.id,
      status: transfer.status,
      amount: amountCents / 100,
      bankLast4:
        (externalAccount as any).last4 || (externalAccount as any).account_last4 || null,
    });
  } catch (err: any) {
    console.error('[wallet/withdraw] failed', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err?.raw?.message ||
          err?.message ||
          'Could not withdraw funds. Please try again.',
      },
      { status: 500 }
    );
  }
}
