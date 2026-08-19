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

    try {
      const db = prisma as any;
      if (!db.notification) return NextResponse.json({ notifications: [] });

      const notifications = await db.notification.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({
        notifications: notifications.map((n: any) => ({
          id: n.id,
          type: n.type || 'default',
          title: n.title || '',
          body: n.body || n.message || '',
          read: n.read || n.isRead || false,
          data: n.data || null,
          createdAt: n.createdAt?.toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({ notifications: [] });
    }
  } catch (error) {
    console.error('[mobile/notifications GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { notificationId, markAllRead } = body;

    try {
      const db = prisma as any;
      if (!db.notification) return NextResponse.json({ success: true });

      if (markAllRead) {
        await db.notification.updateMany({
          where: { userId: payload.userId, read: false },
          data: { read: true },
        });
      } else if (notificationId) {
        await db.notification.update({
          where: { id: notificationId },
          data: { read: true },
        });
      }

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('[mobile/notifications PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
