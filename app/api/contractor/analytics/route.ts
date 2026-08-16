/**
 * GET /api/contractor/analytics
 *
 * Returns comprehensive analytics data for the contractor advanced analytics dashboard.
 * Enterprise tier only.
 *
 * Includes:
 *  - Revenue trend (12 months)
 *  - Job performance (completion rate, avg value, by type)
 *  - Expense breakdown by category
 *  - Crew productivity (jobs per employee, hours billed)
 *  - Customer metrics (repeat rate, top customers)
 *  - Invoice metrics (collection rate, avg days to pay)
 *  - Revenue forecast (next 3 months based on pipeline)
 *  - Job health score
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, meetsMinTier } from '@/lib/contractor-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!meetsMinTier(contractorAuth, 'enterprise')) {
      return NextResponse.json({ error: 'Enterprise plan required' }, { status: 403 });
    }

    const contractorId = contractorAuth.contractorId;
    const db = prisma as any;
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // ── 12-month revenue + expense trend ─────────────────────────────────────
    const monthlyRevenue: number[] = [];
    const monthlyExpenses: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [rev, exp] = await Promise.all([
        prisma.contractorJob.aggregate({
          where: {
            contractorId,
            status: { in: ['completed', 'invoiced', 'paid'] },
            actualEndDate: { gte: mStart, lte: mEnd },
          },
          _sum: { actualCost: true },
        }),
        prisma.contractorExpense.aggregate({
          where: { contractorId, expenseDate: { gte: mStart, lte: mEnd } },
          _sum: { amount: true },
        }),
      ]);

      monthlyRevenue.push(Number(rev._sum.actualCost || 0));
      monthlyExpenses.push(Number(exp._sum.amount || 0));
    }

    // ── YTD totals ────────────────────────────────────────────────────────────
    const [ytdRevAgg, ytdExpAgg, lastMonthRevAgg, lastMonthExpAgg] = await Promise.all([
      prisma.contractorJob.aggregate({
        where: { contractorId, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: yearStart } },
        _sum: { actualCost: true },
      }),
      prisma.contractorExpense.aggregate({
        where: { contractorId, expenseDate: { gte: yearStart } },
        _sum: { amount: true },
      }),
      prisma.contractorJob.aggregate({
        where: { contractorId, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { actualCost: true },
      }),
      prisma.contractorExpense.aggregate({
        where: { contractorId, expenseDate: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const ytdRevenue = Number(ytdRevAgg._sum.actualCost || 0);
    const ytdExpenses = Number(ytdExpAgg._sum.amount || 0);
    const ytdProfit = ytdRevenue - ytdExpenses;
    const ytdMargin = ytdRevenue > 0 ? (ytdProfit / ytdRevenue) * 100 : 0;
    const lastMonthRevenue = Number(lastMonthRevAgg._sum.actualCost || 0);
    const lastMonthExpenses = Number(lastMonthExpAgg._sum.amount || 0);
    const revenueGrowth = lastMonthRevenue > 0
      ? ((monthlyRevenue[11] - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    // ── Job performance ───────────────────────────────────────────────────────
    const [totalJobs, completedJobs, canceledJobs, avgJobValue, jobsByType] = await Promise.all([
      prisma.contractorJob.count({ where: { contractorId, createdAt: { gte: yearStart } } }),
      prisma.contractorJob.count({ where: { contractorId, status: 'completed', actualEndDate: { gte: yearStart } } }),
      prisma.contractorJob.count({ where: { contractorId, status: 'canceled', createdAt: { gte: yearStart } } }),
      prisma.contractorJob.aggregate({
        where: { contractorId, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: yearStart } },
        _avg: { actualCost: true },
      }),
      prisma.contractorJob.groupBy({
        by: ['jobType'],
        where: { contractorId, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: yearStart } },
        _sum: { actualCost: true },
        _count: { id: true },
        orderBy: { _sum: { actualCost: 'desc' } },
      }),
    ]);

    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // ── Expense breakdown ─────────────────────────────────────────────────────
    const expenseByCategory = await prisma.contractorExpense.groupBy({
      by: ['category'],
      where: { contractorId, expenseDate: { gte: yearStart } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    // ── Invoice metrics ───────────────────────────────────────────────────────
    const [totalInvoiced, totalPaid, overdueInvoices, avgDaysToPay] = await Promise.all([
      db.contractorInvoice.aggregate({
        where: { contractorId, status: { not: 'draft' }, createdAt: { gte: yearStart } },
        _sum: { total: true },
        _count: { id: true },
      }),
      db.contractorInvoice.aggregate({
        where: { contractorId, status: 'paid', paidAt: { gte: yearStart } },
        _sum: { total: true },
        _count: { id: true },
      }),
      db.contractorInvoice.count({
        where: {
          contractorId,
          status: { in: ['sent', 'viewed', 'partial'] },
          dueDate: { lt: now },
        },
      }),
      db.contractorInvoice.findMany({
        where: { contractorId, status: 'paid', paidAt: { not: null, gte: yearStart }, sentAt: { not: null } },
        select: { sentAt: true, paidAt: true },
        take: 100,
      }),
    ]);

    const avgDays = avgDaysToPay.length > 0
      ? avgDaysToPay.reduce((sum: number, inv: any) => {
          const days = (new Date(inv.paidAt).getTime() - new Date(inv.sentAt).getTime()) / 86400000;
          return sum + days;
        }, 0) / avgDaysToPay.length
      : 0;

    const collectionRate = Number(totalInvoiced._sum.total || 0) > 0
      ? (Number(totalPaid._sum.total || 0) / Number(totalInvoiced._sum.total || 0)) * 100
      : 0;

    // ── Customer metrics ──────────────────────────────────────────────────────
    const topCustomers = await db.contractorJob.groupBy({
      by: ['customerId'],
      where: { contractorId, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: yearStart } },
      _sum: { actualCost: true },
      _count: { id: true },
      orderBy: { _sum: { actualCost: 'desc' } },
      take: 5,
    });

    const customerIds = topCustomers.map((c: any) => c.customerId).filter(Boolean);
    const customerDetails = customerIds.length > 0
      ? await db.contractorCustomer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : [];

    const customerMap = Object.fromEntries(customerDetails.map((c: any) => [c.id, c.name]));

    const topCustomersList = topCustomers.map((c: any) => ({
      customerId: c.customerId,
      name: customerMap[c.customerId] ?? 'Unknown',
      revenue: Number(c._sum.actualCost || 0),
      jobCount: c._count.id,
    }));

    // Repeat customer rate (customers with >1 job)
    const repeatCustomers = topCustomers.filter((c: any) => c._count.id > 1).length;
    const repeatRate = topCustomers.length > 0 ? (repeatCustomers / topCustomers.length) * 100 : 0;

    // ── Crew productivity ─────────────────────────────────────────────────────
    const activeEmployees = await prisma.contractorEmployee.count({
      where: { contractorId, status: 'active' },
    });

    const totalHoursBilled = await prisma.contractorTimeEntry.aggregate({
      where: {
        contractorId,
        status: 'approved',
        clockIn: { gte: yearStart },
        clockOut: { not: null },
      },
      _sum: { billableHours: true },
    });

    const avgRevenuePerEmployee = activeEmployees > 0 ? ytdRevenue / activeEmployees : 0;

    // ── Pipeline / forecast ───────────────────────────────────────────────────
    const pipeline = await prisma.contractorJob.aggregate({
      where: {
        contractorId,
        status: { in: ['quoted', 'approved', 'scheduled'] },
      },
      _sum: { estimatedCost: true },
      _count: { id: true },
    });

    const pipelineValue = Number(pipeline._sum.estimatedCost || 0);
    const avgMonthlyRevenue = monthlyRevenue.slice(-3).reduce((s, v) => s + v, 0) / 3;

    // ── Job health score (0-100) ──────────────────────────────────────────────
    // Weighted: completion rate (30), collection rate (25), margin (25), repeat customers (20)
    const healthScore = Math.min(100, Math.round(
      (completionRate * 0.30) +
      (collectionRate * 0.25) +
      (Math.min(ytdMargin, 100) * 0.25) +
      (Math.min(repeatRate, 100) * 0.20)
    ));

    const healthTrend = revenueGrowth > 5 ? 'improving' : revenueGrowth < -5 ? 'declining' : 'stable';

    return NextResponse.json({
      success: true,
      data: {
        // Trend
        monthlyRevenue,
        monthlyExpenses,
        // YTD
        ytdRevenue,
        ytdExpenses,
        ytdProfit,
        ytdMargin,
        revenueGrowth,
        thisMonthRevenue: monthlyRevenue[11],
        thisMonthExpenses: monthlyExpenses[11],
        // Jobs
        totalJobs,
        completedJobs,
        canceledJobs,
        completionRate,
        avgJobValue: Number(avgJobValue._avg.actualCost || 0),
        jobsByType: jobsByType.map((j: any) => ({
          type: j.jobType || 'Other',
          revenue: Number(j._sum.actualCost || 0),
          count: j._count.id,
        })),
        // Expenses
        expenseByCategory: expenseByCategory.map((e) => ({
          category: e.category,
          amount: Number(e._sum.amount || 0),
        })),
        // Invoices
        totalInvoiced: Number(totalInvoiced._sum.total || 0),
        totalPaid: Number(totalPaid._sum.total || 0),
        overdueInvoices,
        collectionRate,
        avgDaysToPay: Math.round(avgDays),
        // Customers
        topCustomers: topCustomersList,
        repeatRate,
        // Crew
        activeEmployees,
        totalHoursBilled: Number(totalHoursBilled._sum.billableHours || 0),
        avgRevenuePerEmployee,
        // Pipeline
        pipelineValue,
        pipelineJobs: pipeline._count.id,
        avgMonthlyRevenue,
        // Health
        healthScore,
        healthTrend,
      },
    });
  } catch (error) {
    console.error('[contractor analytics]', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
