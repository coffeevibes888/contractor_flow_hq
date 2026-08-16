import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * Google Calendar sync for contractor scheduling.
 *
 * The full bidirectional OAuth sync (token exchange + event push/pull +
 * webhooks) is NOT implemented yet. Rather than pretend a connection
 * succeeded, this route:
 *   - returns the Google consent URL when the integration is configured
 *   - returns a clear 501 when it isn't, or when a code is posted (since we
 *     can't yet exchange it)
 *
 * All DB reads/writes are correctly scoped by `userId` (the session id is a
 * User id, NOT a ContractorProfile id — the previous version used it as a
 * profile id, which silently matched nothing).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { code } = body ?? {};

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Google Calendar integration is not configured.' },
        { status: 501 },
      );
    }

    // Step 1 — no code yet: hand back the consent URL so the client can
    // start the OAuth flow.
    if (!code) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const redirectUri = `${baseUrl}/api/contractor/scheduler/sync/google/callback`;
      const scope = 'https://www.googleapis.com/auth/calendar';
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code&scope=${encodeURIComponent(scope)}` +
        `&access_type=offline&prompt=consent`;
      return NextResponse.json({ authUrl });
    }

    // Step 2 — code present: token exchange isn't built yet. Be honest
    // instead of storing the raw code and claiming success.
    return NextResponse.json(
      {
        error:
          'Google Calendar sync is coming soon. Authorization was received but token exchange is not enabled yet.',
      },
      { status: 501 },
    );
  } catch (error) {
    console.error('Error connecting Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to connect Google Calendar' },
      { status: 500 },
    );
  }
}

/**
 * GET — Google Calendar sync status for the current contractor.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { googleCalendarToken: true, googleCalendarId: true },
    });

    return NextResponse.json({
      isConnected: !!contractor?.googleCalendarToken,
      calendarId: contractor?.googleCalendarId ?? null,
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 },
    );
  }
}

/**
 * DELETE — disconnect Google Calendar.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.contractorProfile.updateMany({
      where: { userId: session.user.id },
      data: { googleCalendarToken: null, googleCalendarId: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected',
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 },
    );
  }
}
