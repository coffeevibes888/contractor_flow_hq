import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { pushToken, platform } = await req.json();

    if (!pushToken) {
      return NextResponse.json({ error: 'Push token is required' }, { status: 400 });
    }

    try {
      const db = prisma as any;
      if (!db.pushToken) {
        // If the model doesn't exist yet, just acknowledge
        return NextResponse.json({ success: true, stored: false });
      }

      // Upsert: update existing token for this user+platform or create new
      await db.pushToken.upsert({
        where: {
          userId_platform: { userId: payload.userId, platform: platform || 'unknown' },
        },
        update: { token: pushToken, updatedAt: new Date() },
        create: {
          userId: payload.userId,
          token: pushToken,
          platform: platform || 'unknown',
        },
      });

      return NextResponse.json({ success: true, stored: true });
    } catch {
      // Fallback: try simple create if upsert fails (compound unique might not exist)
      try {
        const db = prisma as any;
        await db.pushToken.create({
          data: {
            userId: payload.userId,
            token: pushToken,
            platform: platform || 'unknown',
          },
        });
        return NextResponse.json({ success: true, stored: true });
      } catch {
        return NextResponse.json({ success: true, stored: false });
      }
    }
  } catch (error) {
    console.error('[mobile/push-tokens POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { pushToken } = await req.json();

    try {
      const db = prisma as any;
      if (!db.pushToken) return NextResponse.json({ success: true });

      await db.pushToken.deleteMany({
        where: { userId: payload.userId, token: pushToken },
      });

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('[mobile/push-tokens DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
