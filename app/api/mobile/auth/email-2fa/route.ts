/**
 * Mobile email-2FA toggle.
 *
 * The website's Security tab uses email-based 2FA (`enableEmail2FA` /
 * `disableEmail2FA` in `lib/security/email-2fa.ts`). This route mirrors
 * the website's `/api/auth/email-2fa/toggle` so the mobile Settings →
 * Security screen can flip the same `User.twoFactorEnabled` flag.
 *
 * GET   /api/mobile/auth/email-2fa  — { enabled: boolean }
 * POST  /api/mobile/auth/email-2fa  — body { enabled: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { enableEmail2FA, disableEmail2FA } from '@/lib/security/email-2fa';

async function userIdFromToken(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  return payload?.userId ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await userIdFromToken(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return NextResponse.json({ enabled: !!user?.twoFactorEnabled });
  } catch (error: any) {
    console.error('[mobile/auth/email-2fa GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await userIdFromToken(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { enabled } = await req.json().catch(() => ({ enabled: false }));

    if (enabled) {
      await enableEmail2FA(userId);
    } else {
      await disableEmail2FA(userId);
    }
    return NextResponse.json({ success: true, enabled: !!enabled });
  } catch (error: any) {
    console.error('[mobile/auth/email-2fa POST]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
}
