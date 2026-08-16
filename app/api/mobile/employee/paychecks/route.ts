/**
 * GET /api/mobile/employee/paychecks
 *
 * Lists paychecks (or team payments) with pay period, gross, deductions, net,
 * and YTD totals — the data that powers a paystub list.
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
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const contractorEmp = await db.contractorEmployee.findFirst({
      where: { userId: payload.userId },
    });
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: payload.userId },
    });

    let paychecks: any[] = [];
    let ytdGross = 0;
    let ytdNet = 0;
    let ytdTax = 0;

    if (contractorEmp) {
      const raw = await db.contractorPaycheck.findMany({
        where: { employeeId: contractorEmp.id },
        orderBy: { createdAt: 'desc' },
        take: 24,
        include: {
          payroll: {
            select: { payPeriodStart: true, payPeriodEnd: true, paymentDate: true, status: true },
          },
        },
      });
      paychecks = raw.map((p: any) => {
        const deductions = Array.isArray(p.deductions) ? p.deductions : [];
        const taxAmount = deductions
          .filter((d: any) => /tax|fica|medicare|federal|state/i.test(d.label ?? ''))
          .reduce((sum: number, d: any) => sum + Number(d.amount ?? 0), 0);
        return {
          id: p.id,
          payPeriodStart: p.payroll?.payPeriodStart?.toISOString() ?? null,
          payPeriodEnd: p.payroll?.payPeriodEnd?.toISOString() ?? null,
          paymentDate: p.payroll?.paymentDate?.toISOString() ?? null,
          regularHours: p.regularHours ? Number(p.regularHours) : 0,
          overtimeHours: p.overtimeHours ? Number(p.overtimeHours) : 0,
          regularPay: Number(p.regularPay ?? 0),
          overtimePay: Number(p.overtimePay ?? 0),
          grossPay: Number(p.grossPay ?? 0),
          deductions: deductions.map((d: any) => ({
            label: d.label ?? 'Deduction',
            amount: Number(d.amount ?? 0),
            type: d.type ?? 'other',
          })),
          taxAmount,
          netPay: Number(p.netPay ?? 0),
          paidStatus: p.paidStatus ?? 'pending',
          paymentMethod: p.paymentMethod ?? null,
          payrollStatus: p.payroll?.status ?? null,
        };
      });

      // YTD
      const ytd = await db.contractorPaycheck.findMany({
        where: { employeeId: contractorEmp.id, createdAt: { gte: yearStart } },
        select: { grossPay: true, netPay: true, deductions: true },
      });
      ytdGross = ytd.reduce((s: number, p: any) => s + Number(p.grossPay ?? 0), 0);
      ytdNet = ytd.reduce((s: number, p: any) => s + Number(p.netPay ?? 0), 0);
      ytdTax = ytd.reduce((s: number, p: any) => {
        const ds = Array.isArray(p.deductions) ? p.deductions : [];
        return s + ds
          .filter((d: any) => /tax|fica|medicare|federal|state/i.test(d.label ?? ''))
          .reduce((sub: number, d: any) => sub + Number(d.amount ?? 0), 0);
      }, 0);
    } else if (teamMember) {
      const raw = await prisma.teamPayment.findMany({
        where: { teamMemberId: teamMember.id },
        orderBy: { createdAt: 'desc' },
        take: 24,
      });
      paychecks = raw.map((p: any) => ({
        id: p.id,
        payPeriodStart: p.payPeriodStart?.toISOString() ?? null,
        payPeriodEnd: p.payPeriodEnd?.toISOString() ?? null,
        paymentDate: p.paidAt?.toISOString() ?? null,
        regularHours: p.regularHours ? Number(p.regularHours) : 0,
        overtimeHours: p.overtimeHours ? Number(p.overtimeHours) : 0,
        regularPay: 0,
        overtimePay: 0,
        grossPay: Number(p.grossAmount ?? 0),
        deductions: [],
        taxAmount: 0,
        netPay: Number(p.netAmount ?? 0),
        paidStatus: p.status ?? 'pending',
        paymentMethod: p.paymentMethod ?? null,
        payrollStatus: null,
      }));
      const ytd = await prisma.teamPayment.findMany({
        where: { teamMemberId: teamMember.id, createdAt: { gte: yearStart } },
        select: { grossAmount: true, netAmount: true },
      });
      ytdGross = ytd.reduce((s, p) => s + Number(p.grossAmount), 0);
      ytdNet = ytd.reduce((s, p) => s + Number(p.netAmount ?? 0), 0);
    }

    return NextResponse.json({
      paychecks,
      summary: {
        ytdGross,
        ytdNet,
        ytdTax,
        ytdDeductions: ytdGross - ytdNet,
        count: paychecks.length,
      },
    });
  } catch (error) {
    console.error('[mobile/employee/paychecks]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
