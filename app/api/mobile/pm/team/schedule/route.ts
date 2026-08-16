/**
 * GET /api/mobile/pm/team/schedule?from=ISO&to=ISO
 *
 * Returns shifts in a date range with the team member name + property name.
 * Defaults to current week if no params provided.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day;
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ shifts: [], range: null });

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const start = from ? new Date(from) : startOfWeek(new Date());
    const end = to ? new Date(to) : (() => {
      const x = new Date(start); x.setDate(x.getDate() + 7); return x;
    })();

    const shifts = await prisma.shift.findMany({
      where: {
        landlordId: landlord.id,
        date: { gte: start, lt: end },
      },
      include: {
        teamMember: {
          include: { user: { select: { name: true, image: true } } },
        },
        property: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({
      range: { start: start.toISOString(), end: end.toISOString() },
      shifts: shifts.map((s) => ({
        id: s.id,
        date: s.date.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        notes: s.notes,
        status: s.status,
        property: s.property ? { name: s.property.name } : null,
        teamMember: {
          id: s.teamMember.id,
          name: s.teamMember.user?.name ?? s.teamMember.invitedEmail ?? 'Member',
          image: s.teamMember.user?.image ?? null,
          role: s.teamMember.role,
        },
      })),
    });
  } catch (error: any) {
    console.error('[mobile/pm/team/schedule]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
