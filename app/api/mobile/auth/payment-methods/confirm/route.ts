/**
 * POST /api/mobile/auth/payment-methods/confirm
 *
 * After PaymentSheet attaches the new PaymentMethod to the customer,
 * the mobile client calls this endpoint to persist a SavedPaymentMethod
 * row in the DB. We pull metadata directly from Stripe so we never trust
 * client-supplied last4/brand fields.
 *
 * Body: { paymentMethodId: 'pm_...', isDefault?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 500 });
    }
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { paymentMethodId, isDefault } = await req.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'paymentMethodId required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer for user' }, { status: 400 });
    }

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (!pm || pm.customer !== user.stripeCustomerId) {
      return NextResponse.json({ error: 'Payment method does not belong to user' }, { status: 403 });
    }

    const last4 = pm.card?.last4 ?? pm.us_bank_account?.last4 ?? '****';
    const brand = pm.card?.brand ?? pm.us_bank_account?.bank_name ?? null;
    const expirationDate = pm.card?.exp_month && pm.card?.exp_year
      ? `${String(pm.card.exp_month).padStart(2, '0')}/${String(pm.card.exp_year).slice(-2)}`
      : null;

    if (isDefault) {
      // Demote any existing default
      await prisma.savedPaymentMethod.updateMany({
        where: { userId: auth.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const saved = await prisma.savedPaymentMethod.upsert({
      where: { stripePaymentMethodId: paymentMethodId },
      create: {
        userId: auth.userId,
        stripePaymentMethodId: paymentMethodId,
        type: pm.type,
        cardholderName: pm.billing_details?.name ?? null,
        last4,
        brand,
        expirationDate,
        billingAddress: pm.billing_details?.address ? (pm.billing_details.address as any) : undefined,
        isDefault: !!isDefault,
        isVerified: true,
      },
      update: {
        last4,
        brand,
        expirationDate,
        isDefault: !!isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      method: {
        id: saved.id,
        stripePaymentMethodId: saved.stripePaymentMethodId,
        type: saved.type,
        last4: saved.last4,
        brand: saved.brand,
        expirationDate: saved.expirationDate,
        isDefault: saved.isDefault,
      },
    });
  } catch (error: any) {
    console.error('[mobile/auth/payment-methods/confirm]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not save card' }, { status: 500 });
  }
}
