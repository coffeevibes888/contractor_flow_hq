/**
 * GET /api/mobile/employee/schedule
 *
 * Upcoming shifts/jobs assigned to the employee.
 * For ContractorEmployee: uses ContractorJobAssignment.
 * For TeamMember: uses Shift (date is a `Date`, startTime/endTime are `"HH:mm"` strings).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

function combineShift(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((n) => Number(n) || 0);
  const out = new Date(date);
  out.setHours(h, m, 0, 0);
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const db = prisma as any;

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const contractorEmp = await db.contractorEmployee.findFirst({
      where: { userId: payload.userId },
    });
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: payload.userId },
    });

    let upcoming: {
      id: string;
      jobId: string | null;
      jobNumber: string | null;
      title: string;
      status: string;
      scheduledDate: string | null;
      scheduledTime: string | null;
      estimatedHours: number | null;
      customerName: string | null;
      propertyName: string | null;
      address: unknown;
      city: string | null;
      state: string | null;
    }[] = [];

    if (contractorEmp) {
      const assignments = await db.contractorJobAssignment.findMany({
        where: { employeeId: contractorEmp.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          job: {
            select: {
              id: true,
              jobNumber: true,
              title: true,
              status: true,
              scheduledDate: true,
              scheduledTime: true,
              estimatedHours: true,
              customer: { select: { name: true } },
              property: { select: { name: true, address: true } },
            },
          },
        },
      });
      upcoming = assignments
        .filter((a: any) => a.job?.scheduledDate && new Date(a.job.scheduledDate) >= since)
        .map((a: any) => {
          const addr = (a.job?.property?.address ?? null) as { city?: string; state?: string } | null;
          return {
            id: a.id,
            jobId: a.job?.id ?? null,
            jobNumber: a.job?.jobNumber ?? null,
            title: a.job?.title ?? 'Job',
            status: a.job?.status ?? 'scheduled',
            scheduledDate: a.job?.scheduledDate?.toISOString() ?? null,
            scheduledTime: a.job?.scheduledTime ?? null,
            estimatedHours: a.job?.estimatedHours ? Number(a.job.estimatedHours) : null,
            customerName: a.job?.customer?.name ?? null,
            propertyName: a.job?.property?.name ?? null,
            address: a.job?.property?.address ?? null,
            city: addr?.city ?? null,
            state: addr?.state ?? null,
          };
        });
    } else if (teamMember) {
      const shifts = await prisma.shift.findMany({
        where: { teamMemberId: teamMember.id, date: { gte: since } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 50,
        include: {
          property: { select: { name: true, address: true } },
        },
      });
      upcoming = shifts.map((s) => {
        const start = combineShift(s.date, s.startTime);
        const end = combineShift(s.date, s.endTime);
        const hours = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
        const addr = (s.property?.address ?? null) as { city?: string; state?: string } | null;
        return {
          id: s.id,
          jobId: null,
          jobNumber: null,
          title: 'Shift',
          status: s.status,
          scheduledDate: start.toISOString(),
          scheduledTime: s.startTime,
          estimatedHours: Math.round(hours * 10) / 10,
          customerName: null,
          propertyName: s.property?.name ?? null,
          address: s.property?.address ?? null,
          city: addr?.city ?? null,
          state: addr?.state ?? null,
        };
      });
    }

    return NextResponse.json({ upcoming });
  } catch (error) {
    console.error('[mobile/employee/schedule]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
