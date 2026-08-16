/**
 * GET /api/mobile/notifications
 *
 * Mobile mirror of `/api/notifications` (website). Returns the current
 * user's notifications in newest-first order, with an unread count.
 *
 * Query params:
 *   limit       defaults to 50
 *   unreadOnly  'true' to filter to unread only
 *
 * Notifications are written by `lib/services/notification-service.ts`
 * (and indirectly by the event system), so the same payload that powers
 * the website's notification dropdown also powers the mobile screen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        userId: payload.userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        actionUrl: true,
        metadata: true,
        createdAt: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: payload.userId, isRead: false },
    });

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        actionUrl: n.actionUrl,
        metadata: n.metadata,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[mobile/notifications GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch notifications' }, { status: 500 });
  }
}
