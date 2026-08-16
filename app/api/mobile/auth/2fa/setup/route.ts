/**
 * POST /api/mobile/auth/2fa/setup
 *
 * Begin TOTP-style 2FA setup. Returns the shared secret, an `otpauth://`
 * URL the mobile app can render as a QR code, and backup codes the user
 * should save.
 *
 * The user must call /verify with a valid 6-digit code to actually enable
 * 2FA. Until then, this is just a pending setup.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { enable2FA, has2FAEnabled } from '@/lib/security/two-factor-auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    if (await has2FAEnabled(auth.userId)) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }

    const { secret, qrCodeUrl, backupCodes } = await enable2FA(auth.userId);
    return NextResponse.json({ secret, qrCodeUrl, backupCodes });
  } catch (error) {
    console.error('[mobile/auth/2fa/setup]', error);
    return NextResponse.json({ error: 'Failed to start 2FA setup' }, { status: 500 });
  }
}
