import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Download, TrendingUp, TrendingDown, DollarSign, Lock, Zap, BarChart2, Target, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { canAccessFeature } from '@/lib/services/contractor-feature-gate';
import { ContractorAdvancedAnalytics } from '@/components/contractor/advanced-analytics';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Financial Reports | Contractor Dashboard',
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    subscriptionTier: true,
  });
  if (!contractorProfile) redirect('/onboarding/contractor');

  const advancedAnalyticsAccess = await canAccessFeature(contractorProfile.id, 'advancedAnalytics');
  const hasAdvancedAnalytics = advancedAnalyticsAccess.allowed;

  // Enterprise users see the full advanced analytics component — skip basic queries
  if (hasAdvancedAnalytics) {
    return (
      <div className='w-full space-y-5'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Financial Reports</h1>
            <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
              Profit & loss statements and financial analysis
            </p>
          </div>
        </div>
        <ContractorAdvancedAnalytics contractorId={contractorProfile.id} />
      </div>
    );
  }

  // ── Starter / Pro: basic P&L + monthly breakdown + upsell ────────────────

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const months = Array.from({ length: 12 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), i, 1);
    const monthEnd = new Date(now.getFullYear(), i + 1, 0);
    return { start: monthStart, end: monthEnd, name: monthStart.toLocaleString('default', { month: 'short' }) };
  });

  const [yearRevenue, yearExpenses, monthRevenue, monthExpenses, categoryExpenses, monthlyBreakdown] =
    await Promise.all([
      prisma.contractorJob.aggregate({
        where: { contractorId: contractorProfile.id, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: startOfYear } },
        _sum: { actualCost: true },
      }),
      prisma.contractorExpense.aggregate({
        where: { contractorId: contractorProfile.id, expenseDate: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      prisma.contractorJob.aggregate({
        where: { contractorId: contractorProfile.id, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: startOfMonth } },
        _sum: { actualCost: true },
      }),
      prisma.contractorExpense.aggregate({
        where: { contractorId: contractorProfile.id, expenseDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.contractorExpense.groupBy({
        by: ['category'],
        where: { contractorId: contractorProfile.id, expenseDate: { gte: startOfYear } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      Promise.all(
        months.map(async (m) => {
          const [rev, exp] = await Promise.all([
            prisma.contractorJob.aggregate({
              where: { contractorId: contractorProfile.id, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: m.start, lte: m.end } },
              _sum: { actualCost: true },
            }),
            prisma.contractorExpense.aggregate({
              where: { contractorId: contractorProfile.id, expenseDate: { gte: m.start, lte: m.end } },
              _sum: { amount: true },
            }),
          ]);
          return {
            name: m.name,
            revenue: Number(rev._sum.actualCost || 0),
            expenses: Number(exp._sum.amount || 0),
          };
        }),
      ),
    ]);

  const totalYearRevenue = Number(yearRevenue._sum.actualCost || 0);
  const totalYearExpenses = Number(yearExpenses._sum.amount || 0);
  const totalMonthRevenue = Number(monthRevenue._sum.actualCost || 0);
  const totalMonthExpenses = Number(monthExpenses._sum.amount || 0);
  const yearProfit = totalYearRevenue - totalYearExpenses;
  const profitMargin = totalYearRevenue > 0 ? (yearProfit / totalYearRevenue) * 100 : 0;

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Financial Reports</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Profit & loss statements and financial analysis
          </p>
        </div>
        <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold self-start'>
          <Download className='h-4 w-4 mr-2' />
          Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-emerald-400 to-cyan-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Revenue (YTD)</p>
              <p className='text-2xl font-bold text-gray-900 mt-0.5'>{formatCurrency(totalYearRevenue)}</p>
              <p className='text-[10px] text-gray-400 mt-0.5'>This month: {formatCurrency(totalMonthRevenue)}</p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white'>
              <TrendingUp className='h-4 w-4' />
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-red-400 to-rose-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Expenses (YTD)</p>
              <p className='text-2xl font-bold text-gray-900 mt-0.5'>{formatCurrency(totalYearExpenses)}</p>
              <p className='text-[10px] text-gray-400 mt-0.5'>This month: {formatCurrency(totalMonthExpenses)}</p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-red-400 to-rose-400 flex items-center justify-center text-white'>
              <TrendingDown className='h-4 w-4' />
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-blue-400 to-indigo-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Net Profit (YTD)</p>
              <p className={`text-2xl font-bold mt-0.5 ${yearProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatCurrency(yearProfit)}
              </p>
              <p className='text-[10px] text-gray-400 mt-0.5'>Margin: {profitMargin.toFixed(1)}%</p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white'>
              <DollarSign className='h-4 w-4' />
            </div>
          </div>
        </div>
      </div>

      {/* P&L Statement */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>Profit & Loss — {now.getFullYear()}</h3>
        </div>
        <div className='p-4 space-y-3'>
          <div className='flex justify-between items-center py-2 border-b border-gray-100'>
            <span className='text-sm font-semibold text-gray-700'>Revenue</span>
            <span className='text-sm font-bold text-emerald-600'>{formatCurrency(totalYearRevenue)}</span>
          </div>
          <div>
            <div className='flex justify-between items-center py-2 border-b border-gray-100'>
              <span className='text-sm font-semibold text-gray-700'>Expenses</span>
              <span className='text-sm font-bold text-red-500'>{formatCurrency(totalYearExpenses)}</span>
            </div>
            {categoryExpenses.length > 0 && (
              <div className='ml-4 mt-2 space-y-1.5'>
                {categoryExpenses.map((cat) => (
                  <div key={cat.category} className='flex justify-between items-center py-1 text-xs text-gray-500'>
                    <span className='capitalize'>{cat.category.replace('_', ' ')}</span>
                    <span className='font-medium text-gray-700'>{formatCurrency(Number(cat._sum.amount || 0))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className='flex justify-between items-center py-3 border-t-2 border-gray-200'>
            <span className='text-sm font-bold text-gray-900'>Net Profit</span>
            <span className={`text-base font-bold ${yearProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(yearProfit)}
            </span>
          </div>
          <div className='flex justify-between items-center text-xs text-gray-500'>
            <span>Profit Margin</span>
            <span className='font-semibold text-gray-700'>{profitMargin.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>Monthly Breakdown</h3>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b border-gray-100 bg-gray-50/50'>
                <th className='text-left py-3 px-4 font-semibold text-gray-600'>Month</th>
                <th className='text-right py-3 px-4 font-semibold text-gray-600'>Revenue</th>
                <th className='text-right py-3 px-4 font-semibold text-gray-600'>Expenses</th>
                <th className='text-right py-3 px-4 font-semibold text-gray-600'>Profit</th>
                <th className='text-right py-3 px-4 font-semibold text-gray-600'>Margin</th>
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.map((month, index) => {
                const monthProf = month.revenue - month.expenses;
                const monthMargin = month.revenue > 0 ? (monthProf / month.revenue) * 100 : 0;
                const isFuture = index > now.getMonth();
                return (
                  <tr key={month.name} className='border-b border-gray-50 hover:bg-gray-50/50 transition-colors'>
                    <td className='py-2.5 px-4 font-medium text-gray-700'>{month.name}</td>
                    <td className={`py-2.5 px-4 text-right font-medium ${isFuture ? 'text-gray-300' : 'text-emerald-600'}`}>
                      {isFuture ? '—' : formatCurrency(month.revenue)}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-medium ${isFuture ? 'text-gray-300' : 'text-red-500'}`}>
                      {isFuture ? '—' : formatCurrency(month.expenses)}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-medium ${isFuture ? 'text-gray-300' : monthProf >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {isFuture ? '—' : formatCurrency(monthProf)}
                    </td>
                    <td className={`py-2.5 px-4 text-right ${isFuture ? 'text-gray-300' : 'text-gray-600'}`}>
                      {isFuture ? '—' : `${monthMargin.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Analytics Upsell */}
      <div className='rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm'>
        <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center'>
          <Lock className='h-7 w-7 text-violet-400' />
        </div>
        <h3 className='text-base font-bold text-gray-800 mb-2'>Advanced Analytics</h3>
        <p className='text-sm text-gray-500 mb-5 max-w-md mx-auto'>
          Unlock custom dashboards, revenue forecasting, trend analysis, and advanced reporting on the Enterprise plan.
        </p>
        <div className='flex flex-wrap gap-3 justify-center mb-5'>
          {[
            { icon: BarChart2, label: 'Custom Dashboards' },
            { icon: TrendingUp, label: 'Revenue Forecasting' },
            { icon: Target, label: 'Performance Tracking' },
            { icon: Activity, label: 'Trend Analysis' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700'>
              <Icon className='h-3.5 w-3.5 text-violet-500' />
              {label}
            </div>
          ))}
        </div>
        <Link
          href='/contractor-dashboard/settings/subscription'
          className='inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'
        >
          <Zap className='h-4 w-4' />
          Upgrade to Enterprise
        </Link>
      </div>
    </div>
  );
}
