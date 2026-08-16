import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can, meetsMinTier } from '@/lib/contractor-auth';

// Maps ContractorExpense.category values to summary buckets
function bucketExpense(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('material') || c.includes('supply') || c.includes('supplies')) return 'materials';
  if (c.includes('tool') || c.includes('equipment')) return 'tools';
  if (c.includes('fuel') || c.includes('vehicle') || c.includes('mileage')) return 'fuel';
  if (c.includes('subcontract') || c.includes('sub-contract') || c.includes('labor')) return 'subcontractor';
  if (c.includes('permit') || c.includes('license') || c.includes('fee')) return 'permits';
  return 'other';
}

/**
 * GET /api/contractor/finance/summary?year=2025&month=4
 *
 * Returns a live-computed P&L + tax category breakdown.
 * month is optional — omit for full-year view.
 * Also computes 1099 sub-totals.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!meetsMinTier(contractorAuth, 'pro')) return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    if (!can(contractorAuth, 'financials.view_summary')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const monthParam = searchParams.get('month');
    const month = monthParam ? parseInt(monthParam, 10) : null;

    const contractorId = contractorAuth.contractorId;

    // Date range
    const start = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const end = month
      ? new Date(year, month, 0, 23, 59, 59) // last day of month
      : new Date(year, 11, 31, 23, 59, 59);

    // ── Revenue ──────────────────────────────────────────────────────────────
    const [invoiceAgg, jobAgg] = await Promise.all([
      prisma.contractorInvoice.aggregate({
        where: {
          contractorId,
          status: { in: ['paid', 'partial'] },
          paidAt: { gte: start, lte: end },
        },
        _sum: { amountPaid: true },
      }),
      prisma.contractorJob.aggregate({
        where: {
          contractorId,
          status: { in: ['completed', 'invoiced', 'paid'] },
          actualEndDate: { gte: start, lte: end },
        },
        _sum: { actualCost: true },
      }),
    ]);

    const invoicedRevenue = Number(invoiceAgg._sum.amountPaid || 0);
    const jobRevenue = Number(jobAgg._sum.actualCost || 0);
    const totalRevenue = Math.max(invoicedRevenue, jobRevenue); // use larger of the two to avoid double-count

    // ── Expenses ─────────────────────────────────────────────────────────────
    const expenses = await prisma.contractorExpense.findMany({
      where: {
        contractorId,
        status: 'approved',
        expenseDate: { gte: start, lte: end },
      },
      select: { category: true, amount: true, taxDeductible: true },
    });

    const expBuckets = {
      materials: 0, tools: 0, fuel: 0,
      subcontractor: 0, permits: 0, other: 0,
    } as Record<string, number>;
    let totalExpenses = 0;
    let taxDeductibleExpenses = 0;

    for (const e of expenses) {
      const amt = Number(e.amount);
      const bucket = bucketExpense(e.category);
      expBuckets[bucket] = (expBuckets[bucket] || 0) + amt;
      totalExpenses += amt;
      if (e.taxDeductible) taxDeductibleExpenses += amt;
    }

    // ── Payroll ───────────────────────────────────────────────────────────────
    const db = prisma as any;
    const payrollAgg = await db.contractorPayroll.aggregate({
      where: {
        contractorId,
        status: 'completed',
        payDate: { gte: start, lte: end },
      },
      _sum: { totalGrossPay: true, totalNetPay: true },
    });

    const totalPayroll = Number(payrollAgg._sum.totalGrossPay || 0);
    const totalNetPayroll = Number(payrollAgg._sum.totalNetPay || 0);

    // ── P&L ───────────────────────────────────────────────────────────────────
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit - totalPayroll;

    // ── 1099 prep — subcontractor assignment totals ───────────────────────────
    const subAssignments = await prisma.contractorSubcontractorAssignment.findMany({
      where: {
        subcontractor: { contractorId },
        status: { in: ['completed', 'paid'] },
        endDate: { gte: start, lte: end },
      },
      select: {
        agreedPrice: true,
        subcontractor: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
            taxId: true,
          },
        },
      },
    });

    // Group by subcontractor
    const subMap: Record<string, {
      id: string; companyName: string; contactName: string;
      email: string; taxId: string | null; total: number;
    }> = {};

    for (const a of subAssignments) {
      const sub = a.subcontractor;
      if (!subMap[sub.id]) {
        subMap[sub.id] = { ...sub, total: 0 };
      }
      subMap[sub.id].total += Number(a.agreedPrice);
    }

    const subcontractors1099 = Object.values(subMap)
      .filter(s => s.total >= 600) // IRS threshold
      .sort((a, b) => b.total - a.total);

    const totalSubcontractorPayments = subcontractors1099.reduce((s, c) => s + c.total, 0);

    // ── Monthly breakdown (for charts) ───────────────────────────────────────
    let monthlyBreakdown: Array<{
      month: number; revenue: number; expenses: number; payroll: number; netProfit: number;
    }> | null = null;

    if (!month) {
      // Build month-by-month for the year
      const [allInvoices, allJobs, allExpenses, allPayrolls] = await Promise.all([
        prisma.contractorInvoice.findMany({
          where: { contractorId, status: { in: ['paid', 'partial'] }, paidAt: { gte: start, lte: end } },
          select: { amountPaid: true, paidAt: true },
        }),
        prisma.contractorJob.findMany({
          where: { contractorId, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: start, lte: end } },
          select: { actualCost: true, actualEndDate: true },
        }),
        prisma.contractorExpense.findMany({
          where: { contractorId, status: 'approved', expenseDate: { gte: start, lte: end } },
          select: { amount: true, expenseDate: true },
        }),
        db.contractorPayroll.findMany({
          where: { contractorId, status: 'completed', payDate: { gte: start, lte: end } },
          select: { totalGrossPay: true, payDate: true },
        }),
      ]);

      monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const rev = Math.max(
          allInvoices.filter((x: { paidAt: Date | null; amountPaid: unknown }) => x.paidAt && new Date(x.paidAt).getMonth() + 1 === m)
            .reduce((s: number, x: { amountPaid: unknown }) => s + Number(x.amountPaid), 0),
          allJobs.filter((x: { actualEndDate: Date | null; actualCost: unknown }) => x.actualEndDate && new Date(x.actualEndDate).getMonth() + 1 === m)
            .reduce((s: number, x: { actualCost: unknown }) => s + Number(x.actualCost || 0), 0),
        );
        const exp = allExpenses
          .filter((x: { expenseDate: Date }) => new Date(x.expenseDate).getMonth() + 1 === m)
          .reduce((s: number, x: { amount: unknown }) => s + Number(x.amount), 0);
        const pay = (allPayrolls as Array<{ payDate: Date; totalGrossPay: unknown }>)
          .filter(x => new Date(x.payDate).getMonth() + 1 === m)
          .reduce((s: number, x) => s + Number(x.totalGrossPay), 0);
        return { month: m, revenue: rev, expenses: exp, payroll: pay, netProfit: rev - exp - pay };
      });
    }

    return NextResponse.json({
      year,
      month,
      period: { start, end },
      revenue: { total: totalRevenue, invoiced: invoicedRevenue, jobs: jobRevenue },
      expenses: {
        total: totalExpenses,
        taxDeductible: taxDeductibleExpenses,
        byCategory: expBuckets,
      },
      payroll: { gross: totalPayroll, net: totalNetPayroll },
      profit: { gross: grossProfit, net: netProfit },
      tax1099: {
        threshold: 600,
        totalPaid: totalSubcontractorPayments,
        subcontractors: subcontractors1099,
      },
      monthlyBreakdown,
    });
  } catch (error) {
    console.error('GET /api/contractor/finance/summary', error);
    return NextResponse.json({ error: 'Failed to compute financial summary' }, { status: 500 });
  }
}
