/**
 * GET /api/payroll/history
 *
 * Returns payroll history rows for the signed-in landlord. The UI
 * groups them on the client. Includes a $600 1099 flag per team member
 * sourced from posted-payment YTD totals.
 *
 *   ?format=csv   — Enterprise only; streams a CSV download.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import {
  getPayrollAccess,
  PayrollAccessError,
} from '@/lib/services/payroll-access';
import { getYtdEarningsForLandlord } from '@/lib/services/payroll.service';

const NEC_THRESHOLD = 600;

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const access = await getPayrollAccess();
    access.assertAtLeastBasic();

    const url = new URL(req.url);
    const format = url.searchParams.get('format');
    const wantsCsv = format === 'csv';
    if (wantsCsv && access.level !== 'full') {
      return NextResponse.json(
        { error: 'CSV export is available on the Enterprise plan.' },
        { status: 402 }
      );
    }

    const payments = await prisma.teamPayment.findMany({
      where: { landlordId: access.landlordId! },
      orderBy: { createdAt: 'desc' },
      take: wantsCsv ? 10000 : 200,
      include: {
        teamMember: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
            invitedEmail: true,
            hourlyRate: true,
          },
        },
        timesheet: {
          select: { periodStart: true, periodEnd: true },
        },
      },
    });

    const ytd = await getYtdEarningsForLandlord(access.landlordId!);

    const rows = payments.map((p) => {
      const tmName =
        p.teamMember.user?.name ||
        p.teamMember.invitedEmail ||
        'Team member';
      const ytdTotal = ytd.get(p.teamMemberId) ?? 0;
      return {
        id: p.id,
        teamMemberId: p.teamMemberId,
        teamMember: tmName,
        teamMemberEmail:
          p.teamMember.user?.email ?? p.teamMember.invitedEmail ?? null,
        periodStart: p.timesheet?.periodStart?.toISOString() ?? null,
        periodEnd: p.timesheet?.periodEnd?.toISOString() ?? null,
        regularHours:
          p.regularHoursAtPay !== null
            ? Number(p.regularHoursAtPay)
            : null,
        overtimeHours:
          p.overtimeHoursAtPay !== null
            ? Number(p.overtimeHoursAtPay)
            : null,
        hourlyRate:
          p.hourlyRateAtPay !== null
            ? Number(p.hourlyRateAtPay)
            : Number(p.teamMember.hourlyRate ?? 0),
        grossAmount: Number(p.grossAmount),
        platformFee: Number(p.platformFee),
        netAmount: Number(p.netAmount),
        status: p.status,
        treasuryStatus: p.treasuryStatus,
        paidAt: p.paidAt?.toISOString() ?? null,
        ytdTotal,
        ten99Required: ytdTotal >= NEC_THRESHOLD,
      };
    });

    if (wantsCsv) {
      const header = [
        'Payment ID',
        'Team member',
        'Email',
        'Period start',
        'Period end',
        'Regular hours',
        'Overtime hours',
        'Hourly rate',
        'Gross',
        'Fee',
        'Net',
        'Status',
        'Paid at',
        'YTD total',
      ];
      const lines = [header.join(',')];
      for (const r of rows) {
        lines.push(
          [
            r.id,
            csvEscape(r.teamMember),
            csvEscape(r.teamMemberEmail ?? ''),
            r.periodStart ?? '',
            r.periodEnd ?? '',
            r.regularHours ?? '',
            r.overtimeHours ?? '',
            r.hourlyRate.toFixed(2),
            r.grossAmount.toFixed(2),
            r.platformFee.toFixed(2),
            r.netAmount.toFixed(2),
            r.status,
            r.paidAt ?? '',
            r.ytdTotal.toFixed(2),
          ].join(',')
        );
      }
      return new NextResponse(lines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="payroll-history-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      payments: rows,
      ytdByMember: Array.from(ytd.entries()).map(([id, total]) => ({
        teamMemberId: id,
        ytdTotal: total,
        ten99Required: total >= NEC_THRESHOLD,
      })),
    });
  } catch (err: any) {
    if (err instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.code === 'owner_only' ? 403 : 402 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Could not load history.' },
      { status: 500 }
    );
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
