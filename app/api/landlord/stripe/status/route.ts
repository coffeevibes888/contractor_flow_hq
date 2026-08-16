import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import Stripe from 'stripe';

/**
 * Get Stripe Connect account status for landlord
 * Used to check if they can receive payments
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const landlord = landlordResult.landlord;

    // If no Connect account, return not set up
    if (!landlord.stripeConnectAccountId) {
      return NextResponse.json({
        isOnboarded: false,
        canReceivePayouts: false,
        status: 'not_started',
        message: 'Payout setup not started',
      });
    }

    // Check account status with Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    try {
      const account = await stripe.accounts.retrieve(landlord.stripeConnectAccountId);
      
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
      } else if (account.requirements?.currently_due?.length) {
        status = 'action_required';
        message = 'Additional information needed';
      }

      // Update local status if changed
      if (landlord.stripeOnboardingStatus !== status) {
        await prisma.landlord.update({
          where: { id: landlord.id },
          data: { stripeOnboardingStatus: status },
        });
      }

      return NextResponse.json({
        isOnboarded,
        canReceivePayouts,
        status,
        message,
        accountId: landlord.stripeConnectAccountId,
        requiresAction: (account.requirements?.currently_due?.length ?? 0) > 0,
      });
    } catch (stripeError: any) {
      // Account might be invalid or deleted
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
    console.error('Error getting Stripe status:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
