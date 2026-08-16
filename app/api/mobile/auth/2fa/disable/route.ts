/**
 * POST /api/mobile/auth/2fa/disable
 *
 * Turn 2FA off. Requires the current TOTP code as a soft re-auth so a
 * stolen JWT alone can't disable.
 *
 * Body: { code: '123456' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { disable2FA, has2FAEnabled, verify2FALogin } from '@/lib/security/two-factor-auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    if (!(await has2FAEnabled(auth.userId))) {
      return NextResponse.json({ success: true, enabled: false });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Code required to disable 2FA' }, { status: 400 });
    }
    const ok = await verify2FALogin(auth.userId, code);
    if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

    await disable2FA(auth.userId);
    return NextResponse.json({ success: true, enabled: false });
  } catch (error) {
    console.error('[mobile/auth/2fa/disable]', error);
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 });
  }
}
