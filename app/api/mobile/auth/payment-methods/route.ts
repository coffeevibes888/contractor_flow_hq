/**
 * GET    /api/mobile/auth/payment-methods                  - list saved cards/banks
 * DELETE /api/mobile/auth/payment-methods?id=stripePaymentMethodId
 *
 * Powered by the existing SavedPaymentMethod model so the mobile app
 * sees the same cards the web user added.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

async function getAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyMobileToken(token);
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const methods = await prisma.savedPaymentMethod.findMany({
    where: { userId: auth.userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      stripePaymentMethodId: true,
      type: true,
      cardholderName: true,
      last4: true,
      brand: true,
      expirationDate: true,
      isDefault: true,
      isVerified: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    methods: methods.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripePaymentMethodId = new URL(req.url).searchParams.get('id');
  if (!stripePaymentMethodId) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const existing = await prisma.savedPaymentMethod.findFirst({
    where: { userId: auth.userId, stripePaymentMethodId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Detach on Stripe side too — keep our DB and Stripe in sync.
  if (stripe) {
    try {
      await stripe.paymentMethods.detach(stripePaymentMethodId);
    } catch (err) {
      // If Stripe says it's already detached, that's fine — proceed.
      console.warn('[mobile payment-methods detach]', (err as Error)?.message ?? err);
    }
  }
  await prisma.savedPaymentMethod.delete({ where: { id: existing.id } });

  return NextResponse.json({ success: true });
}
