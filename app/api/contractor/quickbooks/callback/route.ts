/**
 * GET /api/contractor/quickbooks/callback
 * Handles the OAuth callback from Intuit, exchanges code for tokens,
 * stores them encrypted, then redirects to the QB settings page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import OAuthClient from 'intuit-oauth';
import { encryptField } from '@/lib/encrypt';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state') ?? '';
    const code = searchParams.get('code');
    const realmId = searchParams.get('realmId');

    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL('/contractor-dashboard/settings/integrations?qb=error&reason=missing_params', req.url)
      );
    }

    // Parse state: "contractor:{contractorId}:{nonce}"
    const parts = state.split(':');
    if (parts.length !== 3 || parts[0] !== 'contractor') {
      return NextResponse.redirect(
        new URL('/contractor-dashboard/settings/integrations?qb=error&reason=invalid_state', req.url)
      );
    }
    const contractorId = parts[1];

    const conn = await (prisma as any).contractorQBConnection.findUnique({
      where: { contractorId },
      select: { oauthState: true },
    });

    if (!conn || conn.oauthState !== parts[2]) {
      return NextResponse.redirect(
        new URL('/contractor-dashboard/settings/integrations?qb=error&reason=state_mismatch', req.url)
      );
    }

    const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!;
    const redirectUri =
      process.env.QUICKBOOKS_CONTRACTOR_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/contractor/quickbooks/callback`;

    const oauthClient = new OAuthClient({
      clientId,
      clientSecret,
      environment: (process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox') as any,
      redirectUri,
    });

    const tokenResp = await oauthClient.createToken(req.url);
    const raw = tokenResp.getJson();

    const accessToken = raw.access_token as string;
    const refreshToken = raw.refresh_token as string;
    const expiresIn = raw.expires_in as number;

    if (!accessToken || !refreshToken) {
      return NextResponse.redirect(
        new URL('/contractor-dashboard/settings/integrations?qb=error&reason=token_exchange_failed', req.url)
      );
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await (prisma as any).contractorQBConnection.update({
      where: { contractorId },
      data: {
        realmId,
        accessTokenEncrypted: await encryptField(accessToken),
        refreshTokenEncrypted: await encryptField(refreshToken),
        accessTokenExpiresAt: expiresAt,
        connectedAt: new Date(),
        oauthState: null,
      },
    });

    return NextResponse.redirect(
      new URL('/contractor-dashboard/settings/integrations?qb=connected', req.url)
    );
  } catch (error) {
    console.error('[QB callback]', error);
    return NextResponse.redirect(
      new URL('/contractor-dashboard/settings/integrations?qb=error&reason=server_error', req.url)
    );
  }
}
