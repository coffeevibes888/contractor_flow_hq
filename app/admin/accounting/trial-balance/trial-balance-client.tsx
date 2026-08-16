'use client';

import React from 'react';
import ReportShell from '../_components/report-shell';
import { fmtCurrency } from '../_components/format';

interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  debit: number;
  credit: number;
}

interface TrialBalanceReport {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  difference: number;
}

export default function TrialBalanceClient({ landlordId }: { landlordId: string }) {
  return (
    <ReportShell
      landlordId={landlordId}
      title='Trial Balance'
      subtitle='A snapshot of every account in your books, as of a date you pick. If the bottom line says "balanced," your books add up.'
      help={{
        summary: 'Lists every account in your books with its running balance. If debits and credits match, the books are in order.',
        whatItShows: 'Every account we track — cash, rent receivable, owner distributions, expenses, security deposits, etc. — with everything that has been posted to it. A balanced trial balance means every dollar is accounted for and nothing is missing or double-counted.',
        whenToUse: 'Check this once a month to make sure nothing has slipped through the cracks. Also useful before generating owner statements or pulling reports for your CPA.',
        tips: [
          'Pick a month-end date so the snapshot lines up with your other reports.',
          'If it shows "out of balance," there is a posting error somewhere — open the journal entries for that period and look for missing or doubled-up rows.',
          'This is a behind-the-scenes check; you probably will not use it day-to-day.',
        ],
        learnMoreHref: '/admin/university/article/accounting-101',
        learnMoreLabel: 'What is a trial balance?',
      }}
      buildUrl={() => `/api/admin/accounting/trial-balance?landlordId=${landlordId}`}
    >
      {({ data }) => {
        const report = data as TrialBalanceReport;
        if (!report?.rows?.length) {
          return (
            <div className='rounded-lg border border-gray-200 bg-white p-8 text-center'>
              <p className='text-sm text-gray-700 font-medium'>No general ledger activity yet.</p>
              <p className='text-xs text-gray-500 mt-2 max-w-md mx-auto'>
                As soon as a tenant pays rent, an expense is logged, or a bank transaction comes in, it will appear here.
                For now, this just means your books are empty — which is normal on day one.
              </p>
            </div>
          );
        }

        const groupedByType: Record<string, TrialBalanceRow[]> = {};
        for (const row of report.rows) {
          (groupedByType[row.type] ??= []).push(row);
        }

        const typeOrder: Array<TrialBalanceRow['type']> = ['asset', 'liability', 'equity', 'income', 'expense'];

        return (
          <div className='space-y-6'>
            <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${report.balanced ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              {report.balanced
                ? '✅ Books are balanced. Debits equal credits.'
                : `⚠️ Out of balance by ${fmtCurrency(Math.abs(report.difference))}. Review recent journal entries.`}
            </div>

            <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 text-gray-600 text-xs uppercase tracking-wide'>
                  <tr>
                    <th className='text-left px-4 py-2.5'>Code</th>
                    <th className='text-left px-4 py-2.5'>Account</th>
                    <th className='text-right px-4 py-2.5'>Debit</th>
                    <th className='text-right px-4 py-2.5'>Credit</th>
                    <th className='text-right px-4 py-2.5'>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {typeOrder.map((type) => {
                    const rows = groupedByType[type] ?? [];
                    if (!rows.length) return null;
                    return (
                      <React.Fragment key={type}>
                        <tr className='bg-gray-50/40'>
                          <td colSpan={5} className='px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500'>
                            {type}
                          </td>
                        </tr>
                        {rows.map((r) => {
                          const net = r.debit - r.credit;
                          return (
                            <tr key={r.accountId} className='border-t border-gray-100'>
                              <td className='px-4 py-2 font-mono text-xs text-gray-500'>{r.code}</td>
                              <td className='px-4 py-2'>{r.name}</td>
                              <td className='px-4 py-2 text-right tabular-nums'>{fmtCurrency(r.debit)}</td>
                              <td className='px-4 py-2 text-right tabular-nums'>{fmtCurrency(r.credit)}</td>
                              <td className={`px-4 py-2 text-right tabular-nums font-medium ${net < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                {fmtCurrency(Math.abs(net))}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className='bg-gray-100 border-t-2 border-gray-300'>
                  <tr>
                    <td colSpan={2} className='px-4 py-2.5 text-sm font-bold'>Totals</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-bold'>{fmtCurrency(report.totalDebit)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-bold'>{fmtCurrency(report.totalCredit)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-bold'>{fmtCurrency(Math.abs(report.difference))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      }}
    </ReportShell>
  );
}
