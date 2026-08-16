import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';

interface ConfirmSavedAchRequest {
  paymentIntentId?: string;
  savedPaymentMethodId?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as ConfirmSavedAchRequest | null;

  if (!body?.paymentIntentId || !body.savedPaymentMethodId) {
    return NextResponse.json(
      { success: false, message: 'Missing required fields' },
      { status: 400 }
    );
  }

  const saved = await prisma.savedPaymentMethod.findUnique({
    where: { id: body.savedPaymentMethodId },
  });

  if (!saved || saved.userId !== (session.user.id as string)) {
    return NextResponse.json(
      { success: false, message: 'Payment method not found' },
      { status: 404 }
    );
  }

  if (saved.type !== 'us_bank_account' || !saved.isVerified) {
    return NextResponse.json(
      { success: false, message: 'Saved bank account is not verified' },
      { status: 400 }
    );
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(body.paymentIntentId);

    if (!paymentIntent) {
      return NextResponse.json(
        { success: false, message: 'Payment intent not found' },
        { status: 404 }
      );
    }

    if (paymentIntent.metadata?.tenantId !== (session.user.id as string)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const confirmed = await stripe.paymentIntents.confirm(body.paymentIntentId, {
      payment_method: saved.stripePaymentMethodId,
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          accepted_at: Math.floor(Date.now() / 1000),
          online: {
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        },
      },
    } as Parameters<typeof stripe.paymentIntents.confirm>[1]);

    if (confirmed.status === 'requires_action') {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        message: 'Additional verification is required to complete this bank payment.',
        paymentIntentId: confirmed.id,
        status: confirmed.status,
        nextAction: confirmed.next_action ?? null,
      });
    }

    if (confirmed.status !== 'succeeded' && confirmed.status !== 'processing') {
      return NextResponse.json(
        { success: false, message: `Payment failed: ${confirmed.status}` },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.rentPayment.updateMany({
      where: {
        stripePaymentIntentId: body.paymentIntentId,
        tenantId: session.user.id as string,
      },
      data: {
        status: 'paid',
        paidAt: now,
        paymentMethod: 'ach',
      },
    });

    return NextResponse.json({
      success: true,
      paymentIntentId: confirmed.id,
      status: confirmed.status,
    });
  } catch (error) {
    console.error('Confirm saved ACH payment error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { success: false, message: `Payment error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'An error occurred while processing your payment' },
      { status: 500 }
    );
  }
}
