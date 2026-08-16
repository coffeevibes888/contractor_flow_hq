/**
 * GET /api/stripe/connect/refresh
 *
 * Stripe redirects users here when their Account Link expires (they sat on
 * the page too long, or refreshed). We just regenerate a fresh link and
 * 302 them back to Stripe so they don't have to start over.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { SERVER_URL } from '@/lib/constants';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getOrCreateConnectAccountForLandlord } from '@/lib/services/stripe-connect.service';

export async function GET(): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(`${SERVER_URL}/sign-in`);
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.redirect(`${SERVER_URL}/admin/wallet`);
    }

    const result = await getOrCreateConnectAccountForLandlord(
      landlordResult.landlord.id,
      session.user.email
    );
    return NextResponse.redirect(result.url);
  } catch (err) {
    console.error('[stripe/connect/refresh] failed', err);
    return NextResponse.redirect(
      `${SERVER_URL}/admin/wallet?onboarding=error`
    );
  }
}
