/**
 * Mobile 2FA management.
 *
 * GET    /api/mobile/auth/2fa            - status
 * POST   /api/mobile/auth/2fa/setup      - begin TOTP setup, returns secret + QR + backup codes
 * POST   /api/mobile/auth/2fa/verify     - verify code, finalize enable
 * POST   /api/mobile/auth/2fa/disable    - turn off 2FA (requires current password OR fresh JWT)
 *
 * All routes require a valid mobile JWT (Bearer header).
 *
 * Wraps the existing `lib/security/two-factor-auth` service so behavior
 * is identical to the web app — same secrets, same backup codes, same
 * encryption.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { has2FAEnabled } from '@/lib/security/two-factor-auth';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await verifyMobileToken(token);
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const enabled = await has2FAEnabled(auth.userId);
  return NextResponse.json({ enabled });
}
