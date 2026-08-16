/**
 * GET /api/mobile/pm/team/time
 *
 * Returns the most recent time entries (clock in/out) for the landlord's
 * team. Used by the Time & Attendance mobile screen.
 *
 * Today summary: who's clocked in, total hours today, pending approvals.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

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
    if (!landlord) {
      return NextResponse.json({ entries: [], summary: { onTheClock: 0, hoursToday: 0, pendingApprovals: 0 } });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [entries, onTheClock, pending, todayEntries] = await Promise.all([
      prisma.timeEntry.findMany({
        where: { landlordId: landlord.id },
        include: {
          teamMember: { include: { user: { select: { name: true, image: true } } } },
          property: { select: { name: true } },
        },
        orderBy: { clockIn: 'desc' },
        take: 30,
      }),
      prisma.timeEntry.count({
        where: { landlordId: landlord.id, clockOut: null },
      }),
      prisma.timeEntry.count({
        where: { landlordId: landlord.id, approvalStatus: 'pending' },
      }),
      prisma.timeEntry.findMany({
        where: {
          landlordId: landlord.id,
          clockIn: { gte: startOfDay },
        },
        select: { totalMinutes: true, clockIn: true, clockOut: true },
      }),
    ]);

    const hoursToday = todayEntries.reduce((sum, e) => {
      if (e.totalMinutes) return sum + e.totalMinutes / 60;
      if (e.clockOut) return sum + (e.clockOut.getTime() - e.clockIn.getTime()) / (1000 * 60 * 60);
      // still clocked in
      return sum + (Date.now() - e.clockIn.getTime()) / (1000 * 60 * 60);
    }, 0);

    return NextResponse.json({
      summary: {
        onTheClock,
        hoursToday: Math.round(hoursToday * 10) / 10,
        pendingApprovals: pending,
      },
      entries: entries.map((e) => ({
        id: e.id,
        clockIn: e.clockIn.toISOString(),
        clockOut: e.clockOut?.toISOString() ?? null,
        totalMinutes: e.totalMinutes,
        breakMinutes: e.breakMinutes,
        approvalStatus: e.approvalStatus,
        notes: e.notes,
        property: e.property ? { name: e.property.name } : null,
        teamMember: {
          id: e.teamMember.id,
          name: e.teamMember.user?.name ?? e.teamMember.invitedEmail ?? 'Member',
          image: e.teamMember.user?.image ?? null,
          role: e.teamMember.role,
        },
      })),
    });
  } catch (error: any) {
    console.error('[mobile/pm/team/time]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
