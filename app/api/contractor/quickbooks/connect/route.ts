/**
 * GET /api/contractor/quickbooks/connect
 * Initiates the QuickBooks OAuth flow for a contractor.
 * Redirects to Intuit's authorization page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import OAuthClient from 'intuit-oauth';
import { randomBytes } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.redirect(new URL('/sign-in', req.url));

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.redirect(new URL('/onboarding/contractor', req.url));

    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'QuickBooks not configured' }, { status: 500 });
    }

    const state = randomBytes(16).toString('hex');
    const redirectUri =
      process.env.QUICKBOOKS_CONTRACTOR_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/contractor/quickbooks/callback`;

    const oauthClient = new OAuthClient({
      clientId,
      clientSecret,
      environment: (process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox') as any,
      redirectUri,
    });

    const authUrl = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: `contractor:${profile.id}:${state}`,
    });

    // Store pending state
    await (prisma as any).contractorQBConnection.upsert({
      where: { contractorId: profile.id },
      create: { contractorId: profile.id, oauthState: state },
      update: { oauthState: state },
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[QB connect]', error);
    return NextResponse.json({ error: 'Failed to initiate QuickBooks connection' }, { status: 500 });
  }
}
