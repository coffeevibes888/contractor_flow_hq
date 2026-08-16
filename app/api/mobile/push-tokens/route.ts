/**
 * POST   /api/mobile/push-tokens
 * DELETE /api/mobile/push-tokens
 *
 * Registers (or unregisters) an Expo push token for the authenticated user.
 *
 * POST body:   { token: string, platform: 'ios' | 'android' }
 * DELETE body: { token: string }
 *
 * Tokens are scoped per-user; the same token across reinstalls is upserted
 * rather than duplicated. Tokens flagged as invalid by the Expo Push API
 * elsewhere in the system get `enabled = false` so the sender skips them.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const auth = authHeader?.replace('Bearer ', '');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(auth);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { token, platform } = body as { token?: string; platform?: 'ios' | 'android' };
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    await prisma.pushToken.upsert({
      where: { token },
      update: {
        userId: payload.userId,
        platform: platform ?? null,
        enabled: true,
        lastSeen: new Date(),
      },
      create: {
        userId: payload.userId,
        token,
        platform: platform ?? null,
        enabled: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/push-tokens POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const auth = authHeader?.replace('Bearer ', '');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(auth);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { token } = body as { token?: string };
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    // Don't error if the token wasn't there — the client just wants
    // confirmation it's gone.
    await prisma.pushToken.deleteMany({
      where: { token, userId: payload.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/push-tokens DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
