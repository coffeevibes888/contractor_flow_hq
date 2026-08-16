/**
 * GET /api/mobile/agent/open-houses
 *
 * Upcoming and past open house events.
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

    const db = prisma as any;
    const agent = await db.agent.findFirst({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!agent) return NextResponse.json({ events: [] });

    const events = await db.agentOpenHouse.findMany({
      where: { agentId: agent.id },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        notes: true,
        isVirtual: true,
        virtualLink: true,
        rsvpEnabled: true,
        maxAttendees: true,
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            address: true,
            price: true,
            images: true,
          },
        },
      },
    });

    return NextResponse.json({
      events: events.map((e: any) => ({
        id: e.id,
        date: e.date.toISOString(),
        startTime: e.startTime,
        endTime: e.endTime,
        notes: e.notes,
        isVirtual: e.isVirtual,
        virtualLink: e.virtualLink,
        rsvpEnabled: e.rsvpEnabled,
        maxAttendees: e.maxAttendees,
        listing: e.listing
          ? {
              id: e.listing.id,
              slug: e.listing.slug,
              title: e.listing.title,
              address: e.listing.address,
              price: Number(e.listing.price),
              coverImage: e.listing.images?.[0] ?? null,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('[mobile/agent/open-houses]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
