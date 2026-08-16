import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Plus, Download, TrendingDown, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExpenseList } from '@/components/contractor/expense-list';
import { formatCurrency } from '@/lib/utils';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Expenses | Contractor Dashboard',
};

export default async function ExpensesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [expenses, monthExpenses, yearExpenses] = await Promise.all([
    prisma.contractorExpense.findMany({
      where: { contractorId: contractorProfile.id },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.contractorExpense.aggregate({
      where: { contractorId: contractorProfile.id, expenseDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.contractorExpense.aggregate({
      where: { contractorId: contractorProfile.id, expenseDate: { gte: startOfYear } },
      _sum: { amount: true },
    }),
  ]);

  const monthTotal = Number(monthExpenses._sum.amount || 0);
  const yearTotal = Number(yearExpenses._sum.amount || 0);
  const pendingExpenses = expenses.filter((e) => e.status === 'pending').length;
  const approvedExpenses = expenses.filter((e) => e.status === 'approved').length;
  const billableAmount = expenses.filter((e) => e.billable).reduce((sum, e) => sum + Number(e.amount), 0);
  const billableCount = expenses.filter((e) => e.billable).length;

  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).slice(0, 5);

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Expenses</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Track and manage business expenses</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm text-xs'>
            <Download className='h-3.5 w-3.5 mr-1.5' />
            Export
          </Button>
          <Link href='/contractor-dashboard/expenses/new'>
            <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold'>
              <Plus className='h-4 w-4 mr-2' />
              Log Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-red-400 to-rose-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-[10px] text-gray-500 font-medium'>This Month</p>
              <p className='text-xl font-bold text-red-600 mt-0.5'>{formatCurrency(monthTotal)}</p>
              <p className='text-[10px] text-gray-400'>{expenses.filter((e) => new Date(e.expenseDate) >= startOfMonth).length} expenses</p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-red-400 to-rose-400 flex items-center justify-center text-white'>
              <TrendingDown className='h-4 w-4' />
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-gray-400 to-slate-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-[10px] text-gray-500 font-medium'>This Year</p>
              <p className='text-xl font-bold text-gray-900 mt-0.5'>{formatCurrency(yearTotal)}</p>
              <p className='text-[10px] text-gray-400'>{expenses.length} total</p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-gray-400 to-slate-400 flex items-center justify-center text-white'>
              <DollarSign className='h-4 w-4' />
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-emerald-400 to-cyan-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-[10px] text-gray-500 font-medium'>Billable</p>
              <p className='text-xl font-bold text-emerald-600 mt-0.5'>{formatCurrency(billableAmount)}</p>
              <p className='text-[10px] text-gray-400'>{billableCount} expenses</p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white'>
              <CheckCircle2 className='h-4 w-4' />
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-amber-400 to-orange-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-[10px] text-gray-500 font-medium'>Pending</p>
              <p className='text-xl font-bold text-amber-600 mt-0.5'>{pendingExpenses}</p>
              <p className='text-[10px] text-gray-400'>{approvedExpenses} approved</p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white'>
              <Clock className='h-4 w-4' />
            </div>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='p-4 border-b border-gray-100'>
            <h3 className='text-sm font-bold text-gray-800'>Top Categories</h3>
          </div>
          <div className='grid sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4'>
            {topCategories.map(([category, amount]) => (
              <div key={category} className='p-3 rounded-lg bg-gray-50 border border-gray-100'>
                <p className='text-[10px] text-gray-500 font-medium capitalize mb-1'>{category.replace('_', ' ')}</p>
                <p className='text-base font-bold text-gray-900'>{formatCurrency(amount)}</p>
                <p className='text-[10px] text-gray-400 mt-0.5'>
                  {expenses.filter((e) => e.category === category).length} expenses
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Expenses</h3>
          <span className='text-xs text-gray-400'>{expenses.length} total</span>
        </div>
        <div className='p-4'>
          <ExpenseList expenses={expenses} />
        </div>
      </div>
    </div>
  );
}
