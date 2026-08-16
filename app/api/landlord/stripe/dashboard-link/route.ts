import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!landlord?.stripeConnectAccountId) {
    return NextResponse.json({ error: 'No Stripe Connect account found' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const loginLink = await stripe.accounts.createLoginLink(landlord.stripeConnectAccountId);

  return NextResponse.json({ url: loginLink.url });
}
