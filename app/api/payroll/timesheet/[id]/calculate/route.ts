/**
 * GET /api/payroll/timesheet/[id]/calculate
 *
 * Returns a pay preview (regular hours, overtime hours, gross, fee, net)
 * for an APPROVED timesheet. Used by the Pay Now confirmation modal.
 *
 * Pro returns the calculation with applyOvertime=false (overtime hours
 * collapse into regular). Enterprise returns the OT-aware split.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { getPayrollAccess, PayrollAccessError } from '@/lib/services/payroll-access';
import { calculatePay } from '@/lib/services/payroll.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const access = await getPayrollAccess();
    access.assertAtLeastBasic();

    const { id } = await params;
    const ts = await prisma.timesheet.findUnique({
      where: { id },
      select: {
        landlordId: true,
        status: true,
        totalHours: true,
        regularHours: true,
        overtimeHours: true,
        periodStart: true,
        periodEnd: true,
        teamMember: {
          select: {
            id: true,
            hourlyRate: true,
            user: { select: { name: true } },
            invitedEmail: true,
            compensation: {
              select: {
                treasuryOnboardingStatus: true,
                treasuryEnabled: true,
              },
            },
          },
        },
      },
    });
    if (!ts || ts.landlordId !== access.landlordId) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    if (ts.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved timesheets can be paid.' },
        { status: 400 }
      );
    }

    const hourlyRate = Number(ts.teamMember.hourlyRate ?? 0);
    const calc = calculatePay({
      totalHours: Number(ts.totalHours),
      hourlyRate,
      applyOvertime: access.level === 'full',
    });

    return NextResponse.json({
      timesheetId: id,
      teamMember: {
        id: ts.teamMember.id,
        name: ts.teamMember.user?.name || ts.teamMember.invitedEmail || 'Team member',
      },
      period: {
        start: ts.periodStart.toISOString(),
        end: ts.periodEnd.toISOString(),
      },
      hourlyRate,
      regularHours: calc.regularHours,
      overtimeHours: calc.overtimeHours,
      regularPay: calc.regularPay,
      overtimePay: calc.overtimePay,
      grossPay: calc.grossPay,
      platformFee: calc.platformFee,
      netPay: calc.netPay,
      walletDeduction: calc.walletDeduction,
      overtimeMultiplier: calc.overtimeMultiplier,
      walletReady:
        ts.teamMember.compensation?.treasuryOnboardingStatus === 'verified' &&
        ts.teamMember.compensation?.treasuryEnabled === true,
      hasRate: hourlyRate > 0,
      planLevel: access.level,
    });
  } catch (err: any) {
    if (err instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.code === 'owner_only' ? 403 : 402 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Could not calculate.' },
      { status: 500 }
    );
  }
}
