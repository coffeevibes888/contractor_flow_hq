'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Receipt,
  Edit,
  Trash2,
  Calendar,
  Tag,
  FileText,
  CheckCircle,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: any;
  vendor: string | null;
  expenseDate: Date;
  receiptUrl: string | null;
  receiptScanned: boolean;
  billable: boolean;
  billed: boolean;
  taxDeductible: boolean;
  paymentMethod: string | null;
  paidBy: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
};

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'billable'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get unique categories
  const categories = Array.from(new Set(expenses.map((e) => e.category)));

  const filteredExpenses = expenses.filter((expense) => {
    // Filter by status
    if (filter === 'pending' && expense.status !== 'pending') return false;
    if (filter === 'approved' && expense.status !== 'approved') return false;
    if (filter === 'billable' && !expense.billable) return false;

    // Filter by category
    if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        expense.description.toLowerCase().includes(search) ||
        expense.category.toLowerCase().includes(search) ||
        (expense.vendor && expense.vendor.toLowerCase().includes(search))
      );
    }

    return true;
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const categoryColors: Record<string, string> = {
    Materials: 'bg-blue-100 text-blue-700',
    Tools: 'bg-violet-100 text-violet-700',
    Fuel: 'bg-amber-100 text-amber-700',
    Permits: 'bg-emerald-100 text-emerald-700',
    Subcontractor: 'bg-cyan-100 text-cyan-700',
    Other: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search expenses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All ({expenses.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'pending'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Pending ({expenses.filter((e) => e.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'approved'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Approved ({expenses.filter((e) => e.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('billable')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'billable'
              ? 'bg-violet-100 text-violet-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Billable ({expenses.filter((e) => e.billable).length})
        </button>
      </div>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 mb-4">No expenses found</p>
          <Link href="/contractor-dashboard/expenses/new">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              Log Your First Expense
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all p-4"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Expense Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="p-3 rounded-lg bg-red-100 flex-shrink-0">
                    <Receipt className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {expense.description}
                      </h4>
                      <Badge className={statusColors[expense.status]}>
                        {expense.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {expense.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {expense.status}
                      </Badge>
                      <Badge className={categoryColors[expense.category] || categoryColors.Other}>
                        <Tag className="h-3 w-3 mr-1" />
                        {expense.category}
                      </Badge>
                      {expense.billable && (
                        <Badge className="bg-violet-100 text-violet-700">
                          Billable
                        </Badge>
                      )}
                      {expense.taxDeductible && (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          Tax Deductible
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(expense.expenseDate).toLocaleDateString()}</span>
                      </div>
                      {expense.vendor && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{expense.vendor}</span>
                        </div>
                      )}
                      {expense.paymentMethod && (
                        <span className="capitalize">{expense.paymentMethod.replace('_', ' ')}</span>
                      )}
                      {expense.receiptUrl && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <ImageIcon className="h-3 w-3" />
                          <span>Receipt attached</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(Number(expense.amount))}
                  </p>
                  {expense.billed && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      Billed to customer
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t-2 border-gray-100">
                <Link href={`/contractor-dashboard/expenses/${expense.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-2 border-gray-200"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </Link>
                <Link href={`/contractor-dashboard/expenses/${expense.id}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-200"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </Link>
                {expense.receiptUrl && (
                  <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Receipt
                    </Button>
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
