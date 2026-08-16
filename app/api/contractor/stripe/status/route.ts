import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import Stripe from 'stripe';

/**
 * Get contractor's Stripe Connect account status
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    if (!contractor.stripeConnectAccountId) {
      return NextResponse.json({
        isOnboarded: false,
        canReceivePayouts: false,
        status: 'not_started',
        message: 'Payment setup not started',
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
      const account = await stripe.accounts.retrieve(contractor.stripeConnectAccountId);
      
      const isOnboarded = account.details_submitted || false;
      const canReceivePayouts = account.payouts_enabled || false;
      
      let status = 'pending';
      let message = 'Setup in progress';
      
      if (isOnboarded && canReceivePayouts) {
        status = 'active';
        message = 'Ready to receive payments';
      } else if (isOnboarded && !canReceivePayouts) {
        status = 'pending_verification';
        message = 'Verification in progress';
      }

      // Update local status
      const isPaymentReady = isOnboarded && canReceivePayouts;
      if (contractor.isPaymentReady !== isPaymentReady || contractor.stripeOnboardingStatus !== status) {
        await prisma.contractorProfile.update({
          where: { id: contractor.id },
          data: { 
            stripeOnboardingStatus: status,
            isPaymentReady,
          },
        });
      }

      return NextResponse.json({
        isOnboarded,
        canReceivePayouts,
        status,
        message,
        isPaymentReady,
      });
    } catch (stripeError: any) {
      if (stripeError.code === 'account_invalid') {
        return NextResponse.json({
          isOnboarded: false,
          canReceivePayouts: false,
          status: 'invalid',
          message: 'Account needs to be reconnected',
        });
      }
      throw stripeError;
    }
  } catch (error) {
    console.error('Error getting contractor Stripe status:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
