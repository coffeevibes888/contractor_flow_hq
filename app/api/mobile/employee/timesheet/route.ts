/**
 * GET /api/mobile/employee/timesheet
 *
 * Returns time entries for the past N weeks (default 4) and weekly totals.
 * Works for both contractor employees and landlord team members.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const weeks = Math.max(1, Math.min(12, parseInt(searchParams.get('weeks') || '4', 10)));

    const since = startOfWeek(new Date());
    since.setDate(since.getDate() - 7 * (weeks - 1));

    const db = prisma as any;

    const contractorEmp = await db.contractorEmployee.findFirst({
      where: { userId: payload.userId },
    });
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: payload.userId },
    });

    let entries: any[] = [];
    if (contractorEmp) {
      const raw = await db.contractorTimeEntry.findMany({
        where: { employeeId: contractorEmp.id, clockIn: { gte: since } },
        orderBy: { clockIn: 'desc' },
        include: {
          job: { select: { title: true, jobNumber: true } },
        },
      });
      entries = raw.map((e: any) => ({
        id: e.id,
        clockIn: e.clockIn?.toISOString(),
        clockOut: e.clockOut?.toISOString() ?? null,
        durationMinutes: e.duration ?? 0,
        breakMinutes: e.breakMinutes ?? 0,
        location: e.clockInLocation,
        notes: e.notes ?? '',
        status: e.status ?? 'pending',
        billableHours: e.billableHours ? Number(e.billableHours) : null,
        hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : null,
        totalAmount: e.totalAmount ? Number(e.totalAmount) : null,
        jobTitle: e.job?.title ?? null,
        jobNumber: e.job?.jobNumber ?? null,
      }));
    } else if (teamMember) {
      const raw = await prisma.timeEntry.findMany({
        where: { teamMemberId: teamMember.id, clockIn: { gte: since } },
        orderBy: { clockIn: 'desc' },
        include: {
          property: { select: { name: true } },
        },
      });
      entries = raw.map((e) => ({
        id: e.id,
        clockIn: e.clockIn.toISOString(),
        clockOut: e.clockOut?.toISOString() ?? null,
        durationMinutes: e.totalMinutes ?? 0,
        breakMinutes: e.breakMinutes ?? 0,
        location: e.clockInLat && e.clockInLng ? { lat: e.clockInLat, lng: e.clockInLng } : null,
        notes: e.notes ?? '',
        status: e.approvalStatus ?? 'pending',
        billableHours: null,
        hourlyRate: null,
        totalAmount: null,
        jobTitle: e.property?.name ?? null,
        jobNumber: null,
      }));
    }

    // Bucket by week
    const buckets: Record<string, { weekStart: string; minutes: number; entries: number }> = {};
    entries.forEach((e) => {
      const w = startOfWeek(new Date(e.clockIn)).toISOString();
      if (!buckets[w]) buckets[w] = { weekStart: w, minutes: 0, entries: 0 };
      buckets[w].minutes += e.durationMinutes;
      buckets[w].entries += 1;
    });
    const weeklyTotals = Object.values(buckets).sort(
      (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime(),
    );

    return NextResponse.json({ entries, weeklyTotals });
  } catch (error) {
    console.error('[mobile/employee/timesheet]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
