/**
 * GET /api/mobile/notifications/unread-count
 *
 * Lightweight endpoint for the bell badge. Mirrors the website's
 * /api/notifications/unread-count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const count = await prisma.notification.count({
      where: { userId: payload.userId, isRead: false },
    });

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error('[mobile/notifications/unread-count]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
}
