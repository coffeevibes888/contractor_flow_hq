import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { syncLandlordSubscriptionFromStripe } from '@/lib/actions/subscription-sync';
import { SUBSCRIPTION_TIERS } from '@/lib/config/subscription-tiers';

// Manually sync subscription from Stripe (useful when webhooks aren't working)
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();

    if (!landlordResult.success) {
      return NextResponse.json({ success: false, message: 'Unable to determine landlord' }, { status: 400 });
    }

    const landlord = landlordResult.landlord;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, message: 'Stripe is not configured on the server (missing STRIPE_SECRET_KEY).' },
        { status: 500 }
      );
    }

    // SECURITY: do NOT lazy-create a Stripe customer here. We used to call
    // `stripe.customers.create(...)` when `stripeCustomerId` was missing,
    // which let any signed-in user satisfy SubscriptionGate's
    // `incomplete + customerId` branch without ever paying. The customer
    // is now created only inside the real checkout flow
    // (/api/landlord/subscription/create-checkout). If someone hits this
    // endpoint without going through checkout, we just say so.
    if (!landlord.stripeCustomerId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'No Stripe subscription found. Start a subscription from the plan picker — your card is required.',
        },
        { status: 400 },
      );
    }

    const result = await syncLandlordSubscriptionFromStripe(landlord.id);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 500 });
    }

    const tier = result.tier === 'free' ? 'starter' : result.tier;
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    return NextResponse.json({
      success: true,
      message: `Subscription synced! You are now on the ${tierConfig.name} plan.`,
      tier: result.tier,
      tierConfig,
    });
  } catch (error) {
    console.error('Subscription sync error:', error);
    return NextResponse.json({ success: false, message: 'Failed to sync subscription' }, { status: 500 });
  }
}
