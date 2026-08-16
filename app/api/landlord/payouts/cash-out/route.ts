import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { logFinancialEvent } from '@/lib/security/audit-logger';

const PLATFORM_CASHOUT_FEE = 2.00;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, message: 'Payout configuration is missing on the server.' },
        { status: 500 }
      );
    }

    const landlordResult = await getOrCreateCurrentLandlord();

    if (!landlordResult.success) {
      return NextResponse.json(
        { success: false, message: landlordResult.message || 'Unable to determine landlord.' },
        { status: 400 }
      );
    }

    const landlord = landlordResult.landlord;

    if (!landlord.stripeConnectAccountId) {
      return NextResponse.json(
        { success: false, message: 'No payout details on file yet.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const payoutType: Stripe.PayoutCreateParams.Method =
      body.type === 'instant' ? 'instant' : 'standard';

    const propertyId = typeof body.propertyId === 'string' && body.propertyId.length > 0 ? body.propertyId : undefined;
    const requestedAmount = typeof body.amount === 'number' ? body.amount : undefined;

    // If propertyId provided, verify it belongs to this landlord
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          landlordId: landlord.id,
        },
        select: { id: true },
      });

      if (!property) {
        return NextResponse.json(
          { success: false, message: 'Property not found or access denied.' },
          { status: 404 }
        );
      }
    }

    const unpaidRent = await prisma.rentPayment.findMany({
      where: {
        status: 'paid',
        payoutId: null,
        lease: {
          unit: {
            property: propertyId ? { landlordId: landlord.id, id: propertyId } : { landlordId: landlord.id },
          },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    if (unpaidRent.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No available balance to cash out.' },
        { status: 400 }
      );
    }

    const totalAmount = unpaidRent.reduce((sum, p) => {
      const amt = Number(p.amount);
      return sum + (Number.isNaN(amt) ? 0 : amt);
    }, 0);

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid payout amount.' },
        { status: 400 }
      );
    }

    const grossAmount = requestedAmount !== undefined ? requestedAmount : totalAmount;

    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid cashout amount.' },
        { status: 400 }
      );
    }

    if (grossAmount > totalAmount) {
      return NextResponse.json(
        { success: false, message: 'Amount exceeds available balance for this selection.' },
        { status: 400 }
      );
    }

    // Select which rent payments will be included in this payout (oldest-first)
    const selectedRentPaymentIds: string[] = [];
    let selectedGross = 0;
    for (const p of unpaidRent) {
      if (selectedGross >= grossAmount) break;
      const amt = Number(p.amount);
      if (Number.isNaN(amt) || amt <= 0) continue;
      selectedRentPaymentIds.push(p.id);
      selectedGross += amt;
    }

    if (selectedGross + 0.0001 < grossAmount) {
      return NextResponse.json(
        { success: false, message: 'Unable to allocate rent payments for this cashout amount.' },
        { status: 400 }
      );
    }

    let stripeFee = 0;
    if (payoutType === 'instant') {
      stripeFee = Math.min(grossAmount * 0.015, 10);
    }

    const platformFee = PLATFORM_CASHOUT_FEE;
    const totalFees = stripeFee + platformFee;
    const netAmount = grossAmount - totalFees;

    if (!netAmount || netAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Payout amount is too low after fees.' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const stripeAccountId = landlord.stripeConnectAccountId!;
    const connectedAccount = await stripe.accounts.retrieve(stripeAccountId);

    if (!connectedAccount.payouts_enabled) {
      return NextResponse.json(
        {
          success: false,
          message: 'Payouts are not enabled yet. Please complete verification first.',
          needsOnboarding: true,
        },
        { status: 409 }
      );
    }

    let destination: string | undefined;

    // If cashing out for a specific property, use that property's linked external bank account.
    if (propertyId) {
      const propertyBank = await prisma.propertyBankAccount.findUnique({
        where: { propertyId },
        select: { stripePaymentMethodId: true },
      });

      if (!propertyBank?.stripePaymentMethodId) {
        return NextResponse.json(
          {
            success: false,
            message: 'No bank account linked for this property. Please add one or select Default Account.',
          },
          { status: 400 }
        );
      }

      if (payoutType === 'instant') {
        return NextResponse.json(
          {
            success: false,
            message: 'Instant payouts are not available for property-specific destinations. Please use Standard ACH.',
          },
          { status: 400 }
        );
      }

      destination = propertyBank.stripePaymentMethodId;
    }

    let externalAccounts = await stripe.accounts.listExternalAccounts(stripeAccountId, {
      object: payoutType === 'instant' ? 'card' : 'bank_account',
      limit: 1,
    });

    let actualPayoutMethod: Stripe.PayoutCreateParams.Method = payoutType;
    
    if (payoutType === 'instant' && !externalAccounts.data.length) {
      externalAccounts = await stripe.accounts.listExternalAccounts(stripeAccountId, {
        object: 'bank_account',
        limit: 1,
      });
      
      if (externalAccounts.data.length) {
        actualPayoutMethod = 'standard';
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'No debit card or bank account on file. Please add a payment method to receive payouts.',
            needsOnboarding: true,
          },
          { status: 409 }
        );
      }
    }

    if (!externalAccounts.data.length) {
      return NextResponse.json(
        {
          success: false,
          message: 'No bank account on file for payouts. Please add one to cash out.',
          needsOnboarding: true,
        },
        { status: 409 }
      );
    }

    // If using the default account, set destination to the first external account.
    // If propertyId is set, destination is already set to the property-linked external account.
    if (!destination) {
      destination = externalAccounts.data[0]?.id;
    }

    const payoutRecord = await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          landlordId: landlord.id,
          amount: netAmount,
          status: 'processing',
          metadata: {
            type: 'landlord_payout',
            landlordId: landlord.id,
            method: actualPayoutMethod,
            stripeFee,
            platformFee,
            totalFees,
            grossAmount,
            destinationPropertyId: propertyId || null,
          },
        },
      });

      await tx.rentPayment.updateMany({
        where: { id: { in: selectedRentPaymentIds } },
        data: { payoutId: payout.id },
      });

      await tx.platformFee.create({
        data: {
          payoutId: payout.id,
          landlordId: landlord.id,
          amount: platformFee,
          type: 'cashout_platform_fee',
          metadata: {
            landlordId: landlord.id,
            payoutId: payout.id,
            stripeFee,
            grossAmount,
          },
        },
      });

      if (stripeFee > 0) {
        await tx.platformFee.create({
          data: {
            payoutId: payout.id,
            landlordId: landlord.id,
            amount: stripeFee,
            type: 'instant_payout_fee',
            metadata: {
              landlordId: landlord.id,
              payoutId: payout.id,
            },
          },
        });
      }

      return payout;
    });

    const stripePayout = await stripe.payouts.create(
      {
        amount: Math.round(netAmount * 100),
        currency: 'usd',
        method: actualPayoutMethod,
        destination,
        metadata: {
          landlordId: landlord.id,
          payoutId: payoutRecord.id,
          destinationPropertyId: propertyId || '',
        },
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    await prisma.payout.update({
      where: { id: payoutRecord.id },
      data: {
        status: stripePayout.status === 'paid' ? 'paid' : 'processing',
        paidAt: stripePayout.status === 'paid' ? new Date() : null,
        stripeTransferId: stripePayout.id,
      },
    });

    // Log payout to audit trail
    const payoutStatus = stripePayout.status === 'paid' ? 'PAYOUT_COMPLETED' : 'PAYOUT_INITIATED';
    logFinancialEvent(payoutStatus, {
      userId: session.user.id,
      landlordId: landlord.id,
      amount: netAmount,
      currency: 'USD',
      transactionId: stripePayout.id,
      paymentMethod: actualPayoutMethod,
      additionalData: {
        payoutId: payoutRecord.id,
        grossAmount,
        platformFee,
        stripeFee,
        destinationPropertyId: propertyId || null,
      },
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      payoutId: payoutRecord.id,
      method: actualPayoutMethod,
      message: `Payout of $${netAmount.toFixed(2)} initiated.`,
      fees: {
        platform: platformFee,
        stripe: stripeFee,
        total: totalFees,
      },
      netAmount,
      destinationPropertyId: propertyId || null,
    });
  } catch (error) {
    console.error('Landlord cash-out error:', error);
    
    // Log failed payout to audit trail
    const session = await auth();
    if (session?.user?.id) {
      logFinancialEvent('PAYOUT_FAILED', {
        userId: session.user.id,
        amount: 0,
        currency: 'USD',
        additionalData: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }).catch(console.error);
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to process payout.' },
      { status: 500 }
    );
  }
}
