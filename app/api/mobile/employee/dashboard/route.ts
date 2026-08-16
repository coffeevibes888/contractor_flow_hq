/**
 * GET /api/mobile/employee/dashboard
 *
 * Employee home: hours this week, next paycheck, open time-off, recent activity.
 * The employee may be either a ContractorEmployee (works for a contractor) OR
 * a TeamMember (works for a landlord). We surface whichever exists.
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

    const userId = payload.userId;
    const db = prisma as any;

    // Find which kind of employee this user is
    const contractorEmp = await db.contractorEmployee.findFirst({
      where: { userId, status: { not: 'terminated' } },
      include: {
        contractor: { select: { id: true, businessName: true } },
      },
    });

    const teamMember = await prisma.teamMember.findFirst({
      where: { userId, status: { not: 'terminated' } },
      include: {
        landlord: { select: { id: true, companyName: true } },
        compensation: true,
        user: { select: { name: true } },
      },
    });

    // Compute hours this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let hoursThisWeek = 0;
    let activeEntry: any = null;
    let recentEntries: any[] = [];

    if (contractorEmp) {
      const entries = await db.contractorTimeEntry.findMany({
        where: { employeeId: contractorEmp.id, clockIn: { gte: startOfWeek } },
        orderBy: { clockIn: 'desc' },
      });
      hoursThisWeek = entries.reduce((sum: number, e: any) => sum + ((e.duration ?? 0) / 60), 0);
      activeEntry = entries.find((e: any) => !e.clockOut) ?? null;
      recentEntries = entries.slice(0, 5).map((e: any) => ({
        id: e.id,
        clockIn: e.clockIn?.toISOString?.() ?? e.clockIn,
        clockOut: e.clockOut?.toISOString?.() ?? null,
        duration: e.duration,
        billableHours: e.billableHours ? Number(e.billableHours) : null,
      }));
    } else if (teamMember) {
      const entries = await prisma.timeEntry.findMany({
        where: { teamMemberId: teamMember.id, clockIn: { gte: startOfWeek } },
        orderBy: { clockIn: 'desc' },
      });
      hoursThisWeek = entries.reduce(
        (sum, e) => sum + (e.totalMinutes ? e.totalMinutes / 60 : 0),
        0,
      );
      activeEntry = entries.find((e) => !e.clockOut) ?? null;
      recentEntries = entries.slice(0, 5).map((e) => ({
        id: e.id,
        clockIn: e.clockIn.toISOString(),
        clockOut: e.clockOut?.toISOString() ?? null,
        duration: e.totalMinutes,
        billableHours: null,
      }));
    }

    // Latest paycheck
    let latestPaycheck: any = null;
    if (contractorEmp) {
      const paychecks = await db.contractorPaycheck.findMany({
        where: { employeeId: contractorEmp.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          payroll: { select: { payPeriodStart: true, payPeriodEnd: true, paymentDate: true } },
        },
      });
      const p = paychecks[0];
      if (p) {
        latestPaycheck = {
          id: p.id,
          grossPay: Number(p.grossPay),
          netPay: Number(p.netPay),
          paymentDate: p.payroll?.paymentDate?.toISOString?.() ?? null,
          paidStatus: p.paidStatus,
          payPeriodStart: p.payroll?.payPeriodStart?.toISOString?.() ?? null,
          payPeriodEnd: p.payroll?.payPeriodEnd?.toISOString?.() ?? null,
        };
      }
    } else if (teamMember) {
      const payments = await prisma.teamPayment.findMany({
        where: { teamMemberId: teamMember.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          timesheet: { select: { periodStart: true, periodEnd: true } },
        },
      });
      const p = payments[0];
      if (p) {
        latestPaycheck = {
          id: p.id,
          grossPay: Number(p.grossAmount),
          netPay: Number(p.netAmount),
          paymentDate: p.paidAt?.toISOString() ?? null,
          paidStatus: p.status,
          payPeriodStart: p.timesheet?.periodStart?.toISOString() ?? null,
          payPeriodEnd: p.timesheet?.periodEnd?.toISOString() ?? null,
        };
      }
    }

    // Open time-off
    let openTimeOff = 0;
    if (contractorEmp) {
      openTimeOff = await db.contractorTimeOff.count({
        where: { employeeId: contractorEmp.id, status: 'pending' },
      });
    } else if (teamMember) {
      openTimeOff = await prisma.timeOffRequest.count({
        where: { teamMemberId: teamMember.id, status: 'pending' },
      });
    }

    return NextResponse.json({
      employee: contractorEmp
        ? {
            id: contractorEmp.id,
            kind: 'contractor',
            firstName: contractorEmp.firstName,
            lastName: contractorEmp.lastName,
            role: contractorEmp.role,
            employeeType: contractorEmp.employeeType,
            payType: contractorEmp.payType,
            payRate: Number(contractorEmp.payRate),
            paySchedule: contractorEmp.paySchedule,
            hireDate: contractorEmp.hireDate?.toISOString(),
            employer: contractorEmp.contractor?.businessName ?? 'Contractor',
          }
        : teamMember
        ? (() => {
            const fullName = (teamMember.user?.name ?? '').trim();
            const [firstName, ...rest] = fullName.split(/\s+/);
            const lastName = rest.join(' ');
            return {
              id: teamMember.id,
              kind: 'team' as const,
              firstName: firstName ?? '',
              lastName: lastName ?? '',
              role: teamMember.role ?? 'Team Member',
              employeeType: 'w2',
              payType: (teamMember.compensation as any)?.payType ?? 'hourly',
              payRate:
                (teamMember.compensation as any)?.hourlyRate
                  ? Number((teamMember.compensation as any).hourlyRate)
                  : teamMember.hourlyRate
                  ? Number(teamMember.hourlyRate)
                  : 0,
              paySchedule: teamMember.paySchedule ?? 'biweekly',
              hireDate: teamMember.joinedAt?.toISOString() ?? null,
              employer: teamMember.landlord?.companyName ?? 'Employer',
            };
          })()
        : null,
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      isClockedIn: !!activeEntry,
      activeEntry: activeEntry
        ? {
            id: activeEntry.id,
            clockIn: activeEntry.clockIn?.toISOString?.() ?? activeEntry.clockIn,
          }
        : null,
      latestPaycheck,
      openTimeOff,
      recentEntries,
    });
  } catch (error) {
    console.error('[mobile/employee/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
