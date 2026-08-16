import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Plus, DollarSign, Calendar, Tag, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'Expenses | Short-Term Rentals',
};

const CATEGORY_COLORS: Record<string, string> = {
  cleaning: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  supplies: 'bg-emerald-100 text-emerald-700',
  utilities: 'bg-violet-100 text-violet-700',
  platform_fees: 'bg-rose-100 text-rose-700',
  other: 'bg-gray-100 text-gray-700',
};

export default async function ExpensesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
  });

  if (!landlord) {
    redirect('/onboarding/landlord');
  }

  // Fetch expenses (placeholder - will work once schema is migrated)
  const expenses: any[] = [];
  const totalExpenses = 0;
  const byCategory: Record<string, number> = {};

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 mb-1">Expenses</h1>
          <p className="text-sm text-gray-600">
            Track and manage your property expenses
          </p>
        </div>
        <Link
          href="/landlord/str/expenses/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-black font-medium">Total Expenses</span>
            <DollarSign className="h-4 w-4 text-black" />
          </div>
          <div className="text-2xl font-bold text-black">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-black/70">All time</div>
        </div>

        {Object.entries(byCategory).slice(0, 3).map(([category, amount]) => (
          <div key={category} className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black font-medium capitalize">{category.replace('_', ' ')}</span>
              <Tag className="h-4 w-4 text-black" />
            </div>
            <div className="text-2xl font-bold text-black">{formatCurrency(amount)}</div>
          </div>
        ))}
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Expenses Yet
          </h3>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Start tracking your property expenses to monitor profitability.
          </p>
          <Link
            href="/landlord/str/expenses/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Add Your First Expense
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-black bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(expense.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.rental.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.other}`}>
                      {expense.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.vendor || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(Number(expense.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
