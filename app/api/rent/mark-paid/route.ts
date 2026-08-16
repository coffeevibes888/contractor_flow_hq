import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { paymentIntentId?: string; email?: string; phone?: string }
    | null;

  const paymentIntentId = body?.paymentIntentId;

  if (!paymentIntentId) {
    return NextResponse.json({ success: false, message: 'Missing paymentIntentId' }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ success: false, message: 'Stripe not configured' }, { status: 500 });
  }

  const now = new Date();
  const stripe = new Stripe(stripeSecretKey);

  let rentPaymentIds: string[] | null = null;
  let paymentMethod: string | null = null;
  let intentAmount: number | null = null;
  let intentStatus: Stripe.PaymentIntent.Status | null = null;

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    paymentMethod = intent.payment_method_types?.[0] || null;
    intentAmount = typeof intent.amount === 'number' ? intent.amount / 100 : null;
    intentStatus = intent.status;

    const idsRaw = intent.metadata?.rentPaymentIds;
    if (idsRaw) {
      rentPaymentIds = String(idsRaw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {
    // If Stripe fetch fails, fallback to DB lookup by stripePaymentIntentId
  }

  const where = rentPaymentIds?.length
    ? { id: { in: rentPaymentIds }, tenantId: session.user.id as string }
    : { stripePaymentIntentId: paymentIntentId, tenantId: session.user.id as string };

  const payments = await prisma.rentPayment.findMany({
    where,
    select: { id: true, amount: true },
  });

  if (!payments.length) {
    return NextResponse.json({ success: false, message: 'No matching rent payments found' }, { status: 404 });
  }

  if (!intentStatus) {
    return NextResponse.json(
      { success: false, message: 'Unable to verify payment status with Stripe' },
      { status: 502 }
    );
  }

  if (intentStatus && intentStatus !== 'succeeded') {
    const mappedStatus =
      intentStatus === 'processing'
        ? 'processing'
        : intentStatus === 'canceled'
          ? 'failed'
          : intentStatus === 'requires_payment_method'
            ? 'failed'
            : intentStatus === 'requires_action'
              ? 'pending'
              : 'pending';

    if (mappedStatus !== 'pending') {
      await prisma.rentPayment.updateMany({
        where: { id: { in: payments.map((p) => p.id) } },
        data: {
          status: mappedStatus,
          paidAt: null,
          paymentMethod: paymentMethod || undefined,
        },
      });

      revalidatePath('/user/dashboard');
      revalidatePath('/user/profile/rent-receipts');
      revalidatePath('/admin/revenue');

      return NextResponse.json({
        success: true,
        updated: payments.length,
        status: mappedStatus,
      });
    }

    return NextResponse.json({
      success: false,
      message: `PaymentIntent not succeeded (status=${intentStatus})`,
      status: intentStatus,
    }, { status: 409 });
  }

  await prisma.$transaction(
    payments.map((p) =>
      prisma.rentPayment.update({
        where: { id: p.id },
        data: {
          status: 'paid',
          paidAt: now,
          paymentMethod: paymentMethod || 'card',
          amountPaid: p.amount,
        },
      })
    )
  );

  revalidatePath('/user/dashboard');
  revalidatePath('/user/profile/rent-receipts');
  revalidatePath('/admin/revenue');

  return NextResponse.json({ success: true, updated: payments.length });
}
