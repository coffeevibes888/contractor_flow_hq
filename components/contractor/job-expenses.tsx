'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: any;
  vendor?: string | null;
  expenseDate: Date;
  receiptUrl?: string | null;
  billable: boolean;
  status: string;
}

interface JobExpensesProps {
  jobId: string;
  expenses: Expense[];
}

export function JobExpenses({ jobId, expenses }: JobExpensesProps) {
  const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const billableTotal = expenses
    .filter(exp => exp.billable)
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Expenses</CardTitle>
          <p className="text-sm text-white/70 mt-1">
            Total: {formatCurrency(total)} • Billable: {formatCurrency(billableTotal)}
          </p>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-white/70 text-center py-8">No expenses recorded yet</p>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white">{expense.description}</h4>
                      {expense.billable && (
                        <Badge className="bg-emerald-500/30 text-emerald-200 text-xs">
                          Billable
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span className="px-2 py-0.5 rounded bg-white/5">{expense.category}</span>
                      {expense.vendor && <span>{expense.vendor}</span>}
                      <span>{new Date(expense.expenseDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(Number(expense.amount))}
                    </p>
                    {expense.receiptUrl && (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-300 hover:underline flex items-center gap-1 justify-end mt-1"
                      >
                        <Receipt className="h-3 w-3" />
                        Receipt
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
