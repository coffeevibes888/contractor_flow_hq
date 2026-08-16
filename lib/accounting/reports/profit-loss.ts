/**
 * Profit & Loss (a.k.a. Income Statement) report.
 *
 *   Total Income (4000s)  −  Total Expenses (5000s)  =  Net Income
 *
 * Date-range filters via fromDate / toDate (inclusive).
 */

import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as db } from '@/db/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export interface PnLLine {
  accountId: string;
  code: string;
  name: string;
  amount: number;
  percentOfTotal: number;
}

export interface PnLSection {
  label: string;
  type: 'income' | 'expense';
  lines: PnLLine[];
  subtotal: number;
}

export interface ProfitAndLossReport {
  fromDate: Date;
  toDate: Date;
  income: PnLSection;
  expense: PnLSection;
  netIncome: number;
  netMargin: number;
  generatedAt: Date;
}

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  return Number(d.toString());
}

export async function profitAndLoss(
  landlordId: string,
  fromDate: Date,
  toDate: Date,
  tx?: Prisma.TransactionClient,
): Promise<ProfitAndLossReport> {
  const c = (tx ?? (db as unknown as PrismaClient));

  const grouped = await c.journalLine.groupBy({
    by: ['accountId'],
    where: {
      entry: {
        landlordId,
        effectiveDate: { gte: fromDate, lte: toDate },
      },
      account: { type: { in: ['income', 'expense'] } },
    },
    _sum: { debit: true, credit: true },
  });

  if (grouped.length === 0) {
    return {
      fromDate, toDate,
      income:  { label: 'Income',  type: 'income',  lines: [], subtotal: 0 },
      expense: { label: 'Expenses', type: 'expense', lines: [], subtotal: 0 },
      netIncome: 0, netMargin: 0, generatedAt: new Date(),
    };
  }

  const accountIds = grouped.map((g) => g.accountId);
  const accounts = await c.chartOfAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true, type: true },
  });
  const acctMap = new Map(accounts.map((a) => [a.id, a]));

  const incomeLines: PnLLine[] = [];
  const expenseLines: PnLLine[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (const g of grouped) {
    const acct = acctMap.get(g.accountId);
    if (!acct) continue;
    const debit  = toNum(g._sum.debit);
    const credit = toNum(g._sum.credit);

    // For income accounts the natural balance is credit, for expense it's debit.
    // The sign of `amount` is positive for "good" (income) and positive for expense
    // (we render expense as positive and subtract at the end).
    const amount = acct.type === 'income' ? credit - debit : debit - credit;
    if (Math.abs(amount) < 0.01) continue;

    const line: PnLLine = { accountId: acct.id, code: acct.code, name: acct.name, amount, percentOfTotal: 0 };
    if (acct.type === 'income') {
      incomeLines.push(line);
      totalIncome += amount;
    } else {
      expenseLines.push(line);
      totalExpense += amount;
    }
  }

  const fillPct = (lines: PnLLine[], total: number) => {
    for (const l of lines) l.percentOfTotal = total > 0 ? Number(((l.amount / total) * 100).toFixed(1)) : 0;
  };
  fillPct(incomeLines, totalIncome);
  fillPct(expenseLines, totalExpense);

  incomeLines.sort((a, b) => b.amount - a.amount);
  expenseLines.sort((a, b) => b.amount - a.amount);

  return {
    fromDate,
    toDate,
    income:  { label: 'Income',  type: 'income',  lines: incomeLines,  subtotal: Number(totalIncome.toFixed(2))  },
    expense: { label: 'Expenses', type: 'expense', lines: expenseLines, subtotal: Number(totalExpense.toFixed(2)) },
    netIncome:  Number((totalIncome - totalExpense).toFixed(2)),
    netMargin:  totalIncome > 0 ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)) : 0,
    generatedAt: new Date(),
  };
}
