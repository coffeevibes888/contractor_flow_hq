'use client';

import React from 'react';
import ReportShell from '../_components/report-shell';
import { fmtCurrency, fmtPct } from '../_components/format';

interface PnLLine {
  accountId: string;
  code: string;
  name: string;
  amount: number;
  percentOfTotal: number;
}

interface PnLSection {
  label: string;
  type: 'income' | 'expense';
  lines: PnLLine[];
  subtotal: number;
}

interface PnLReport {
  fromDate: string;
  toDate: string;
  income: PnLSection;
  expense: PnLSection;
  netIncome: number;
  netMargin: number;
}

function renderSection(section: PnLSection) {
  if (!section.lines.length) {
    return <p className='text-sm text-gray-500 py-3'>No activity in this period.</p>;
  }
  return (
    <table className='w-full text-sm'>
      <thead className='text-xs text-gray-500 uppercase tracking-wide'>
        <tr>
          <th className='text-left px-4 py-2'>Code</th>
          <th className='text-left px-4 py-2'>Account</th>
          <th className='text-right px-4 py-2'>%</th>
          <th className='text-right px-4 py-2'>Amount</th>
        </tr>
      </thead>
      <tbody>
        {section.lines.map((l) => (
          <tr key={l.accountId} className='border-t border-gray-100'>
            <td className='px-4 py-2 font-mono text-xs text-gray-500'>{l.code}</td>
            <td className='px-4 py-2'>{l.name}</td>
            <td className='px-4 py-2 text-right tabular-nums text-gray-500'>{fmtPct(l.percentOfTotal)}</td>
            <td className='px-4 py-2 text-right tabular-nums font-medium'>{fmtCurrency(l.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className='border-t-2 border-gray-300 bg-gray-50/50'>
          <td colSpan={3} className='px-4 py-2 text-sm font-bold'>Total {section.label}</td>
          <td className='px-4 py-2 text-right tabular-nums font-bold'>{fmtCurrency(section.subtotal)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export default function ProfitLossClient({ landlordId }: { landlordId: string }) {
  return (
    <ReportShell
      landlordId={landlordId}
      title='Profit & Loss'
      subtitle='Your money in, your money out, and what was left over — for a month, a quarter, or a year.'
      help={{
        summary: 'A simple "money in vs. money out" report for a time period you pick. The bottom line is your net income.',
        whatItShows: 'Every dollar of rental income and every dollar of expense that posted in the period, grouped by category (rents, fees, repairs, taxes, insurance, etc.). The bottom number is what you actually kept — also called net income or profit.',
        whenToUse: 'Pull this every month to see if you are making or losing money. Pull it for the year before tax season and hand it to your CPA. The default view is the current calendar month — change the "as of" date at the top to look at other periods.',
        tips: [
          'A negative net income does not always mean a bad month — it might just be that you paid a big annual bill like insurance or property tax in that month.',
          'Compare months to each other to spot trends, not just absolute numbers.',
          'For tax purposes, pair this with the Balance Sheet — income minus expenses gives you profit, but the balance sheet shows what you actually own and owe.',
        ],
        learnMoreHref: '/admin/university/article/accounting-101',
        learnMoreLabel: 'Plain-English guide to P&L',
      }}
      buildUrl={() => `/api/admin/accounting/profit-loss?landlordId=${landlordId}`}
    >
      {({ data }) => {
        const r = data as PnLReport;
        if (!r) return null;
        const hasActivity = r.income.lines.length > 0 || r.expense.lines.length > 0;

        return (
          <div className='space-y-6'>
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3`}>
              <div className='bg-white border border-gray-200 rounded-lg p-4'>
                <p className='text-xs text-gray-500 uppercase tracking-wide'>Total Income</p>
                <p className='text-2xl font-bold text-emerald-600 mt-1'>{fmtCurrency(r.income.subtotal)}</p>
              </div>
              <div className='bg-white border border-gray-200 rounded-lg p-4'>
                <p className='text-xs text-gray-500 uppercase tracking-wide'>Total Expenses</p>
                <p className='text-2xl font-bold text-red-600 mt-1'>{fmtCurrency(r.expense.subtotal)}</p>
              </div>
              <div className={`rounded-lg p-4 ${r.netIncome >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <p className='text-xs uppercase tracking-wide text-gray-600'>Net Income</p>
                <p className={`text-2xl font-bold mt-1 ${r.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {fmtCurrency(r.netIncome)}
                </p>
                <p className='text-xs text-gray-500 mt-1'>Net margin: {fmtPct(r.netMargin)}</p>
              </div>
            </div>

            {!hasActivity ? (
              <div className='rounded-lg border border-gray-200 bg-white p-8 text-center'>
                <p className='text-sm text-gray-700 font-medium'>No income or expense activity in this period.</p>
                <p className='text-xs text-gray-500 mt-2 max-w-md mx-auto'>
                  Try a different month, or wait for rent payments and expenses to come in. As soon as anything is posted, it shows up here automatically.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
                  <div className='px-4 py-2.5 border-b border-gray-200 bg-gray-50 text-sm font-semibold'>Income</div>
                  {renderSection(r.income)}
                </div>
                <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
                  <div className='px-4 py-2.5 border-b border-gray-200 bg-gray-50 text-sm font-semibold'>Expenses</div>
                  {renderSection(r.expense)}
                </div>
              </div>
            )}
          </div>
        );
      }}
    </ReportShell>
  );
}
