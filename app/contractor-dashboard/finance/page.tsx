import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import {
  DollarSign, TrendingUp, TrendingDown, FileText, CreditCard,
  Plus, Download, Lock, Zap, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { requireContractorPage } from '@/lib/contractor-page-guard';

export const metadata: Metadata = {
  title: 'Finance Dashboard | Contractor',
};

export default async function FinanceDashboardPage() {
  // Anyone reading this dashboard needs at least summary financial access.
  // Bookkeepers and the owner have it; technicians and helpers do not.
  const { contractorAuth } = await requireContractorPage({
    permission: 'financials.view_summary',
  });

  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { id: contractorAuth.contractorId },
    select: { id: true, businessName: true, subscriptionTier: true },
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  const tier = contractorProfile.subscriptionTier || 'starter';
  const hasAccess = tier === 'enterprise';

  if (!hasAccess) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Finance Dashboard</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Full financial overview of your operation</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-amber-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Finance Dashboard</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            The Finance Dashboard is available on the Enterprise plan. Upgrade to access
            Stripe Treasury wallet, business debit card, payroll, dispute management,
            and a full financial overview of your operation.
          </p>
          <Link
            href='/contractor-dashboard/settings/subscription'
            className='inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'
          >
            <Zap className='h-4 w-4' />
            Upgrade to Enterprise
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [invoices, paidInvoices, overdueInvoices, jobsRevenue, lastMonthJobsRevenue, expenses, lastMonthExpenses, recentInvoices, recentExpenses] =
    await Promise.all([
      prisma.contractorInvoice.findMany({ where: { contractorId: contractorProfile.id, createdAt: { gte: startOfMonth } } }),
      prisma.contractorInvoice.findMany({ where: { contractorId: contractorProfile.id, status: 'paid', paidAt: { gte: startOfMonth } } }),
      prisma.contractorInvoice.findMany({ where: { contractorId: contractorProfile.id, status: { in: ['sent', 'viewed', 'partial'] }, dueDate: { lt: now } } }),
      prisma.contractorJob.aggregate({ where: { contractorId: contractorProfile.id, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: startOfMonth } }, _sum: { actualCost: true } }),
      prisma.contractorJob.aggregate({ where: { contractorId: contractorProfile.id, status: { in: ['completed', 'invoiced', 'paid'] }, actualEndDate: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { actualCost: true } }),
      prisma.contractorExpense.aggregate({ where: { contractorId: contractorProfile.id, expenseDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.contractorExpense.aggregate({ where: { contractorId: contractorProfile.id, expenseDate: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),
      prisma.contractorInvoice.findMany({ where: { contractorId: contractorProfile.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.contractorExpense.findMany({ where: { contractorId: contractorProfile.id }, orderBy: { expenseDate: 'desc' }, take: 5 }),
    ]);

  const totalRevenue = Number(jobsRevenue._sum.actualCost || 0);
  const lastMonthRevenue = Number(lastMonthJobsRevenue._sum.actualCost || 0);
  const totalExpenses = Number(expenses._sum.amount || 0);
  const lastMonthExpensesAmount = Number(lastMonthExpenses._sum.amount || 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);
  const revenueGrowth = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
  const expenseGrowth = lastMonthExpensesAmount > 0 ? ((totalExpenses - lastMonthExpensesAmount) / lastMonthExpensesAmount) * 100 : 0;

  const invoiceStatusConfig: Record<string, { bg: string; text: string }> = {
    paid: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    overdue: { bg: 'bg-red-50', text: 'text-red-600' },
    sent: { bg: 'bg-blue-50', text: 'text-blue-600' },
    viewed: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-500' },
  };

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Finance Dashboard</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Track revenue, expenses, and profitability</p>
        </div>
        <div className='flex gap-2'>
          <Link href='/contractor-dashboard/expenses/new'>
            <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm text-xs'>
              <Plus className='h-3.5 w-3.5 mr-1.5' />
              Log Expense
            </Button>
          </Link>
          <Link href='/contractor-dashboard/invoices/new'>
            <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold text-xs'>
              <Plus className='h-3.5 w-3.5 mr-1.5' />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-emerald-400 to-cyan-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Total Revenue</p>
              <p className='text-2xl font-bold text-gray-900 mt-0.5'>{formatCurrency(totalRevenue)}</p>
              <p className='text-[10px] text-gray-400 mt-0.5'>Last month: {formatCurrency(lastMonthRevenue)}</p>
            </div>
            <div className='flex flex-col items-end gap-1'>
              <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white'>
                <TrendingUp className='h-4 w-4' />
              </div>
              {revenueGrowth !== 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${revenueGrowth > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-red-400 to-rose-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Total Expenses</p>
              <p className='text-2xl font-bold text-gray-900 mt-0.5'>{formatCurrency(totalExpenses)}</p>
              <p className='text-[10px] text-gray-400 mt-0.5'>Last month: {formatCurrency(lastMonthExpensesAmount)}</p>
            </div>
            <div className='flex flex-col items-end gap-1'>
              <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-red-400 to-rose-400 flex items-center justify-center text-white'>
                <TrendingDown className='h-4 w-4' />
              </div>
              {expenseGrowth !== 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${expenseGrowth < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {expenseGrowth > 0 ? '+' : ''}{expenseGrowth.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-blue-400 to-indigo-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Net Profit</p>
              <p className={`text-2xl font-bold mt-0.5 ${netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>
              <p className='text-[10px] text-gray-400 mt-0.5'>Margin: {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</p>
            </div>
            <div className='flex flex-col items-end gap-1'>
              <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white'>
                <DollarSign className='h-4 w-4' />
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {netProfit >= 0 ? 'Profit' : 'Loss'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Stats */}
      <div className='relative rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 overflow-hidden'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full' />
        <div className='relative p-4'>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <SummaryItem label='Invoices' value={String(invoices.length)} />
            <SummaryItem label='Paid' value={String(paidInvoices.length)} />
            <SummaryItem label='Outstanding' value={formatCurrency(totalOutstanding)} />
            <SummaryItem label='Overdue' value={formatCurrency(totalOverdue)} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* Recent Invoices */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <h3 className='text-sm font-bold text-gray-800'>Recent Invoices</h3>
            <Link href='/contractor-dashboard/invoices' className='text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1'>
              View all <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className='p-8 text-center text-sm text-gray-400'>No invoices yet</div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {recentInvoices.map((invoice) => {
                const sc = invoiceStatusConfig[invoice.status] || { bg: 'bg-gray-100', text: 'text-gray-500' };
                return (
                  <Link key={invoice.id} href={`/contractor-dashboard/invoices/${invoice.id}`} className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'>
                    <div className='h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0'>
                      <FileText className='h-4 w-4 text-blue-500' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-gray-800'>Invoice #{invoice.invoiceNumber}</p>
                      <p className='text-[10px] text-gray-500'>{new Date(invoice.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xs font-bold text-gray-800'>{formatCurrency(Number(invoice.total))}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} capitalize`}>{invoice.status}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <h3 className='text-sm font-bold text-gray-800'>Recent Expenses</h3>
            <Link href='/contractor-dashboard/expenses' className='text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1'>
              View all <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className='p-8 text-center text-sm text-gray-400'>No expenses yet</div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {recentExpenses.map((expense) => (
                <Link key={expense.id} href={`/contractor-dashboard/expenses/${expense.id}`} className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'>
                  <div className='h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0'>
                    <TrendingDown className='h-4 w-4 text-red-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800 truncate'>{expense.description}</p>
                    <p className='text-[10px] text-gray-500 capitalize'>{expense.category.replace('_', ' ')} · {new Date(expense.expenseDate).toLocaleDateString()}</p>
                  </div>
                  <p className='text-xs font-bold text-red-500 shrink-0'>-{formatCurrency(Number(expense.amount))}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-4'>
        <h3 className='text-sm font-bold text-gray-800 mb-3'>Quick Actions</h3>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {[
            { href: '/contractor-dashboard/invoices/new', icon: FileText, label: 'New Invoice' },
            { href: '/contractor-dashboard/expenses/new', icon: TrendingDown, label: 'Log Expense' },
            { href: '/contractor-dashboard/reports', icon: Download, label: 'Reports' },
            { href: '/contractor-dashboard/payouts', icon: CreditCard, label: 'Payments' },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <button className='w-full flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-amber-50 hover:border-amber-200 transition-all text-gray-600 hover:text-amber-700'>
                <Icon className='h-5 w-5' />
                <span className='text-xs font-medium'>{label}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-0.5'>
      <div className='text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wide'>{label}</div>
      <div className='text-sm sm:text-base font-bold text-gray-800'>{value}</div>
    </div>
  );
}
