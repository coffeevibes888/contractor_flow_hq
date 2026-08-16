/**
 * POST /api/wallet/send
 *
 * Send funds from the signed-in landlord's Treasury wallet to another
 * verified Property Flow user (landlord or contractor). Uses Stripe
 * Treasury OutboundPayments routed to the recipient's Treasury financial
 * account ABA — Stripe internally routes wallet-to-wallet without ACH
 * delays.
 *
 * Body: { recipientUserId: string, amountCents: number, memo?: string }
 *
 * Guards:
 *   - Caller must be the landlord owner (employees can't move money).
 *   - Caller's Connect account must be verified.
 *   - Amount must be > 0 and <= available balance.
 *   - Recipient must have a verified, open Treasury financial account.
 *   - No platform fee between Property Flow users (per product spec).
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
    const recipientUserId = String(body?.recipientUserId || '').trim();
    const amountCents = Math.round(Number(body?.amountCents || 0));
    const memo = String(body?.memo || '').slice(0, 200);

    if (!recipientUserId) {
      return NextResponse.json(
        { error: 'Recipient is required.' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than $0.' },
        { status: 400 }
      );
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json(
        { error: landlordResult.message || 'Sender wallet not found.' },
        { status: 404 }
      );
    }
    const sender = landlordResult.landlord;

    // Owner-only.
    if (sender.ownerUserId && sender.ownerUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the account owner can send funds.' },
        { status: 403 }
      );
    }

    if (sender.stripeOnboardingStatus !== 'verified') {
      return NextResponse.json(
        { error: 'Finish identity verification before sending funds.' },
        { status: 403 }
      );
    }

    const senderFa = await prisma.financialAccount.findFirst({
      where: { landlordId: sender.id, status: 'active' },
    });
    if (!senderFa) {
      return NextResponse.json(
        { error: 'Your wallet is still being provisioned. Try again shortly.' },
        { status: 409 }
      );
    }

    // Resolve recipient. Could be a landlord-owner or a contractor.
    const recipientUser = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!recipientUser) {
      return NextResponse.json(
        { error: 'Recipient not found.' },
        { status: 404 }
      );
    }

    let recipientFa: { stripeFinancialAccountId: string; stripeConnectedAccountId: string } | null = null;
    if (recipientUser.role === 'contractor') {
      const contractor = await prisma.contractorProfile.findFirst({
        where: { userId: recipientUser.id },
        select: { id: true },
      });
      if (contractor) {
        const fa = await prisma.financialAccount.findFirst({
          where: { contractorId: contractor.id, status: 'active' },
          select: {
            stripeFinancialAccountId: true,
            stripeConnectedAccountId: true,
          },
        });
        recipientFa = fa;
      }
    } else {
      const recipientLandlord = await prisma.landlord.findFirst({
        where: { ownerUserId: recipientUser.id },
        select: { id: true, stripeOnboardingStatus: true },
      });
      if (
        recipientLandlord &&
        recipientLandlord.stripeOnboardingStatus === 'verified'
      ) {
        const fa = await prisma.financialAccount.findFirst({
          where: { landlordId: recipientLandlord.id, status: 'active' },
          select: {
            stripeFinancialAccountId: true,
            stripeConnectedAccountId: true,
          },
        });
        recipientFa = fa;
      }
    }

    if (!recipientFa) {
      return NextResponse.json(
        { error: 'Recipient is not yet a verified Property Flow user.' },
        { status: 409 }
      );
    }

    // Pull live balance + recipient ABA. We never trust client-supplied
    // balance — Stripe is the source of truth.
    const [senderStripeFa, recipientStripeFa] = await Promise.all([
      stripe.treasury.financialAccounts.retrieve(
        senderFa.stripeFinancialAccountId,
        {},
        { stripeAccount: senderFa.stripeConnectedAccountId }
      ),
      stripe.treasury.financialAccounts.retrieve(
        recipientFa.stripeFinancialAccountId,
        { expand: ['financial_addresses'] },
        { stripeAccount: recipientFa.stripeConnectedAccountId }
      ),
    ]);

    const availableCents = senderStripeFa.balance?.cash?.usd ?? 0;
    if (amountCents > availableCents) {
      return NextResponse.json(
        { error: 'Amount exceeds your available balance.' },
        { status: 400 }
      );
    }

    const aba = recipientStripeFa.financial_addresses?.find(
      (a) => a.type === 'aba'
    )?.aba;
    if (!aba?.account_number || !aba.routing_number) {
      return NextResponse.json(
        { error: 'Recipient wallet is not yet ready to receive payments.' },
        { status: 409 }
      );
    }

    const recipientName =
      recipientUser.name || recipientUser.email || 'Property Flow User';

    const payment = await stripe.treasury.outboundPayments.create(
      {
        financial_account: senderFa.stripeFinancialAccountId,
        amount: amountCents,
        currency: 'usd',
        description: memo || `Wallet payment to ${recipientName}`,
        statement_descriptor: 'PROPFLOW',
        destination_payment_method_data: {
          type: 'us_bank_account',
          us_bank_account: {
            routing_number: aba.routing_number,
            account_number: aba.account_number,
            account_holder_type: 'individual',
          },
          billing_details: { name: recipientName },
        },
        metadata: {
          senderLandlordId: sender.id,
          recipientUserId: recipientUser.id,
          memo: memo || '',
          source: 'wallet.send',
        },
      },
      { stripeAccount: senderFa.stripeConnectedAccountId }
    );

    logFinancialEvent('PAYMENT_INITIATED', {
      userId: session.user.id,
      landlordId: sender.id,
      amount: amountCents / 100,
      currency: 'USD',
      transactionId: payment.id,
      paymentMethod: 'treasury_outbound_payment',
      additionalData: {
        recipientUserId: recipientUser.id,
        memo,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      transactionId: payment.id,
      status: payment.status,
      amount: amountCents / 100,
      recipientName,
    });
  } catch (err: any) {
    console.error('[wallet/send] failed', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err?.raw?.message ||
          err?.message ||
          'Could not send funds. Please try again.',
      },
      { status: 500 }
    );
  }
}
