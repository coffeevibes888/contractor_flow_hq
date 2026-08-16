/**
 * POST /api/mobile/auth/2fa/verify
 *
 * Body: { code: '123456' }
 *
 * Used both during initial setup (finalizes enabling 2FA) and during
 * subsequent logins (the JWT already in scope is enough — we just need
 * to know the current TOTP code matches).
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { verify2FASetup, verify2FALogin, has2FAEnabled } from '@/lib/security/two-factor-auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { code } = await req.json();
    if (!code || typeof code !== 'string' || code.length < 6) {
      return NextResponse.json({ error: 'Enter a valid 6-digit code' }, { status: 400 });
    }

    const enabled = await has2FAEnabled(auth.userId);
    const ok = enabled
      ? await verify2FALogin(auth.userId, code)
      : await verify2FASetup(auth.userId, code);

    if (!ok) {
      return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, enabled: true });
  } catch (error) {
    console.error('[mobile/auth/2fa/verify]', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
