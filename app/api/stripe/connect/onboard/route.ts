/**
 * POST /api/stripe/connect/onboard
 *
 * Creates (or reuses) a Custom Connect account with Treasury capability for
 * the signed-in landlord and returns a Stripe-hosted Account Link URL the
 * client should redirect the user to. The user fills out KYC on Stripe's
 * pages — we never see SSN, DOB, ID upload, etc.
 *
 * Idempotent: safe to call multiple times. Subsequent calls just regenerate
 * the Account Link (Account Links are single-use and short-lived).
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getOrCreateConnectAccountForLandlord } from '@/lib/services/stripe-connect.service';
import type { StripeOnboardingLinkResponse } from '@/types/stripe';

export async function POST(): Promise<NextResponse> {
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

    const result = await getOrCreateConnectAccountForLandlord(
      landlordResult.landlord.id,
      session.user.email
    );

    const payload: StripeOnboardingLinkResponse = {
      success: true,
      accountId: result.accountId,
      url: result.url,
      created: result.created,
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('[stripe/connect/onboard] failed', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err?.message ||
          'Could not start Stripe onboarding. Please try again.',
      },
      { status: 500 }
    );
  }
}
