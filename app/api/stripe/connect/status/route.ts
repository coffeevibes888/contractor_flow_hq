/**
 * GET /api/stripe/connect/status
 *
 * Returns the current Connect onboarding state for the signed-in landlord.
 * The route always pulls fresh from Stripe (and reflects the result onto
 * the Landlord row), so the dashboard can render an accurate badge without
 * waiting for webhooks.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import {
  getOrCreateConnectAccountForLandlord,
  summarizeRequirements,
  syncLandlordConnectStatus,
} from '@/lib/services/stripe-connect.service';
import type { StripeAccountStatusResponse } from '@/types/stripe';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json(
        { error: landlordResult.message || 'Landlord not found' },
        { status: 404 }
      );
    }

    const landlord = landlordResult.landlord;
    const { status, account } = await syncLandlordConnectStatus(landlord.id);

    // Generate a fresh Account Link if the user is not yet verified — this
    // gives the dashboard a one-click "continue verification" button.
    let onboardingUrl: string | null = null;
    if (status === 'pending' || status === 'restricted' || status === 'invalid') {
      try {
        const link = await getOrCreateConnectAccountForLandlord(
          landlord.id,
          session.user.email
        );
        onboardingUrl = link.url;
      } catch (err) {
        // Non-fatal — UI will hide the button if the link can't be made.
        console.error('[stripe/connect/status] account link failed', err);
      }
    }

    const response: StripeAccountStatusResponse = {
      hasAccount: !!account,
      accountId: account?.id ?? landlord.stripeConnectAccountId ?? null,
      status,
      payoutsEnabled: account?.payouts_enabled ?? false,
      chargesEnabled: account?.charges_enabled ?? false,
      detailsSubmitted: account?.details_submitted ?? false,
      treasuryRequested:
        account?.capabilities?.treasury === 'pending' ||
        account?.capabilities?.treasury === 'active',
      treasuryActive: account?.capabilities?.treasury === 'active',
      requirementsSummary: summarizeRequirements(account),
      currentlyDue: account?.requirements?.currently_due ?? [],
      pastDue: account?.requirements?.past_due ?? [],
      onboardingUrl,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[stripe/connect/status] failed', err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          'Could not retrieve Stripe onboarding status.',
      },
      { status: 500 }
    );
  }
}
