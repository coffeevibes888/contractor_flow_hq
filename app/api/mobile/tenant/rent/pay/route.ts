/**
 * POST /api/mobile/tenant/rent/pay
 *
 * Creates a Stripe PaymentIntent for rent payment. Mirrors the
 * website's `POST /api/rent/checkout` but uses mobile token auth.
 *
 * Body: { rentPaymentIds: string[] }
 * Response: { clientSecret, paymentIntentId, rentAmount, totalAmount }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import Stripe from 'stripe';
import { syncLandlordConnectStatus } from '@/lib/services/stripe-connect.service';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = payload.userId;

    const body = (await req.json().catch(() => ({}))) as {
      rentPaymentIds?: string[];
    };

    if (!body.rentPaymentIds || !Array.isArray(body.rentPaymentIds) || body.rentPaymentIds.length === 0) {
      return NextResponse.json({ error: 'No rent payments specified' }, { status: 400 });
    }

    // Get rent payments for this tenant
    const rentPayments = await prisma.rentPayment.findMany({
      where: {
        id: { in: body.rentPaymentIds },
        tenantId: userId,
        status: 'pending',
      },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  include: {
                    landlord: {
                      select: {
                        id: true,
                        stripeConnectAccountId: true,
                        stripeOnboardingStatus: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (rentPayments.length === 0) {
      return NextResponse.json({ error: 'No pending rent payments found' }, { status: 400 });
    }

    const firstPayment = rentPayments[0];
    const landlord = firstPayment.lease?.unit?.property?.landlord;

    if (!landlord) {
      return NextResponse.json({ error: 'Could not determine landlord for payment' }, { status: 400 });
    }

    // Verify landlord has completed Stripe Connect onboarding
    if (!landlord.stripeConnectAccountId) {
      return NextResponse.json({
        error: 'Your landlord has not set up payment receiving. Please contact them.',
        code: 'LANDLORD_NOT_ONBOARDED',
      }, { status: 400 });
    }

    const isReadyStatus = (s: string | null | undefined) =>
      s === 'verified' || s === 'active';

    if (!isReadyStatus(landlord.stripeOnboardingStatus)) {
      try {
        const { status } = await syncLandlordConnectStatus(landlord.id);
        if (status !== 'verified') {
          const message =
            status === 'restricted' || status === 'invalid'
              ? "Your landlord's payment account needs additional information."
              : "Your landlord's payment account is pending verification.";
          return NextResponse.json({ error: message, code: 'LANDLORD_ACTION_REQUIRED' }, { status: 400 });
        }
      } catch (error) {
        console.error('[mobile/tenant/rent/pay] Connect status check failed:', error);
        return NextResponse.json(
          { error: "Your landlord's payment account needs attention.", code: 'LANDLORD_STRIPE_STATUS_ERROR' },
          { status: 400 }
        );
      }
    }

    const totalAmount = rentPayments.reduce((sum, p) => {
      const amt = Number(p.amount);
      return sum + (Number.isNaN(amt) ? 0 : amt);
    }, 0);

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const rentAmountInCents = Math.round(totalAmount * 100);

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: rentAmountInCents,
      currency: 'usd',
      transfer_data: {
        destination: landlord.stripeConnectAccountId,
      },
      metadata: {
        type: 'rent_payment',
        tenantId: userId,
        rentPaymentIds: rentPayments.map((p) => p.id).join(','),
        landlordId: landlord.id,
        rentAmount: rentAmountInCents.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      payment_method_options: {
        us_bank_account: {
          verification_method: 'automatic',
        },
      },
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    await prisma.rentPayment.updateMany({
      where: { id: { in: rentPayments.map((p) => p.id) } },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      rentAmount: totalAmount,
      totalAmount: totalAmount,
      platformFee: 0,
    });
  } catch (error) {
    console.error('[mobile/tenant/rent/pay]', error);
    const stripeError = error as { message?: string; code?: string };
    if (stripeError.code === 'account_invalid') {
      return NextResponse.json(
        { error: "Your landlord's payment account needs attention.", code: 'LANDLORD_ACCOUNT_INVALID' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}
