import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';

interface VerifyAchRequest {
  paymentIntentId?: string;
  clientSecret?: string;
  descriptorCode?: string;
  amounts?: number[];
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as VerifyAchRequest | null;

  if (!body) {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }

  const finalPaymentIntentId =
    body.paymentIntentId ||
    (body.clientSecret
      ? String(body.clientSecret).split('_secret')[0]
      : undefined);

  if (!finalPaymentIntentId) {
    return NextResponse.json(
      { success: false, message: 'Missing paymentIntentId' },
      { status: 400 }
    );
  }

  const descriptorCode = body.descriptorCode?.trim();
  const amounts = Array.isArray(body.amounts)
    ? body.amounts.filter((n) => Number.isFinite(n))
    : undefined;

  if (!descriptorCode && (!amounts || amounts.length === 0)) {
    return NextResponse.json(
      { success: false, message: 'Missing verification values' },
      { status: 400 }
    );
  }

  try {
    const existing = await stripe.paymentIntents.retrieve(finalPaymentIntentId);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Payment intent not found' },
        { status: 404 }
      );
    }

    if (existing.metadata?.tenantId !== (session.user.id as string)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const params: Stripe.PaymentIntentVerifyMicrodepositsParams = descriptorCode
      ? { descriptor_code: descriptorCode }
      : { amounts: amounts as number[] };

    const verified = await stripe.paymentIntents.verifyMicrodeposits(
      finalPaymentIntentId,
      params
    );

    if (verified.status === 'requires_action') {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        message:
          'Verification is still required. Please double-check the code/amounts and try again.',
        paymentIntentId: verified.id,
        status: verified.status,
        nextAction: verified.next_action ?? null,
      });
    }

    if (verified.status !== 'succeeded' && verified.status !== 'processing') {
      return NextResponse.json(
        {
          success: false,
          message: `Payment verification failed: ${verified.status}`,
          paymentIntentId: verified.id,
          status: verified.status,
        },
        { status: 400 }
      );
    }

    const user = (await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { id: true, email: true, name: true, stripeCustomerId: true } as any,
    })) as
      | { id: string; email: string; name: string; stripeCustomerId?: string | null }
      | null;

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let customerId: string | null = user.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: {
          tenantId: user.id,
        },
      });

      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId } as any,
      });
    }

    const paymentMethodId =
      typeof verified.payment_method === 'string'
        ? verified.payment_method
        : verified.payment_method?.id;

    if (paymentMethodId) {
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch (e) {
        // Ignore if already attached
      }

      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

      if (pm && pm.type === 'us_bank_account') {
        const existingSaved = await prisma.savedPaymentMethod.findUnique({
          where: { stripePaymentMethodId: paymentMethodId },
          select: { id: true, userId: true },
        });

        if (existingSaved && existingSaved.userId !== user.id) {
          return NextResponse.json(
            { success: false, message: 'Payment method already belongs to another user' },
            { status: 403 }
          );
        }

        const shouldBeDefault =
          (await prisma.savedPaymentMethod.count({
            where: { userId: user.id, isDefault: true },
          })) === 0;

        if (existingSaved) {
          await prisma.savedPaymentMethod.update({
            where: { id: existingSaved.id },
            data: {
              isVerified: true,
            },
          });
        } else {
          await prisma.savedPaymentMethod.create({
            data: {
              userId: user.id,
              stripePaymentMethodId: paymentMethodId,
              type: 'us_bank_account',
              cardholderName: pm.billing_details?.name || null,
              last4: pm.us_bank_account?.last4 || '0000',
              brand: pm.us_bank_account?.bank_name || null,
              expirationDate: null,
              isDefault: shouldBeDefault,
              isVerified: true,
            },
          });
        }
      }
    }

    const now = new Date();
    await prisma.rentPayment.updateMany({
      where: {
        stripePaymentIntentId: verified.id,
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
      paymentIntentId: verified.id,
      status: verified.status,
    });
  } catch (error) {
    console.error('ACH microdeposit verification error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { success: false, message: `Verification error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'An error occurred while verifying the bank account' },
      { status: 500 }
    );
  }
}
