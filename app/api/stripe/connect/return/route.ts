/**
 * GET /api/stripe/connect/return
 *
 * Stripe redirects the user here after they finish the hosted KYC flow
 * (whether they completed it, partially completed, or bailed). We pull
 * the latest account snapshot, persist the derived status, and bounce
 * them to the dashboard with a status query param the UI can show toast
 * messages from.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { SERVER_URL } from '@/lib/constants';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { syncLandlordConnectStatus } from '@/lib/services/stripe-connect.service';

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

    const { status } = await syncLandlordConnectStatus(
      landlordResult.landlord.id
    );

    return NextResponse.redirect(
      `${SERVER_URL}/admin/wallet?onboarding=${encodeURIComponent(status)}`
    );
  } catch (err) {
    console.error('[stripe/connect/return] failed', err);
    return NextResponse.redirect(
      `${SERVER_URL}/admin/wallet?onboarding=error`
    );
  }
}
