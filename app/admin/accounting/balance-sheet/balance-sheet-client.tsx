'use client';

import React from 'react';
import ReportShell from '../_components/report-shell';
import { fmtCurrency } from '../_components/format';

interface BalanceSheetLine {
  accountId: string;
  code: string;
  name: string;
  balance: number;
}

interface BalanceSheetSection {
  label: string;
  type: 'asset' | 'liability' | 'equity';
  lines: BalanceSheetLine[];
  subtotal: number;
}

interface BalanceSheetReport {
  asOf: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

function renderSection(section: BalanceSheetSection) {
  if (!section.lines.length) {
    return <p className='text-sm text-gray-500 py-3 px-4'>No balances in this section.</p>;
  }
  return (
    <table className='w-full text-sm'>
      <tbody>
        {section.lines.map((l) => (
          <tr key={l.accountId} className='border-t border-gray-100'>
            <td className='px-4 py-2 font-mono text-xs text-gray-500 w-20'>{l.code}</td>
            <td className='px-4 py-2'>{l.name}</td>
            <td className='px-4 py-2 text-right tabular-nums font-medium'>{fmtCurrency(l.balance)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className='border-t-2 border-gray-300 bg-gray-50/50'>
          <td colSpan={2} className='px-4 py-2 text-sm font-bold'>Total {section.label}</td>
          <td className='px-4 py-2 text-right tabular-nums font-bold'>{fmtCurrency(section.subtotal)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export default function BalanceSheetClient({ landlordId }: { landlordId: string }) {
  return (
    <ReportShell
      landlordId={landlordId}
      title='Balance Sheet'
      subtitle='What you own, what you owe, and what your equity is — all in one snapshot.'
      help={{
        summary: 'A single date snapshot of everything you own (assets), everything you owe (liabilities), and your net worth (equity).',
        whatItShows: 'Three groups of accounts: Assets are cash in your wallet/bank, money tenants owe you, security deposits you are holding. Liabilities are unpaid bills, security deposits owed back to tenants, and any loans. Equity is the difference — your net worth in the business.',
        whenToUse: 'Most landlords look at this once a month, or right before pulling a year-end package for their CPA. The magic rule: Assets = Liabilities + Equity. If those do not match, something is off.',
        tips: [
          'A growing equity line is the clearest sign your rental business is building wealth over time.',
          'Tenant security deposits show up as both an asset (cash you hold) and a liability (money you owe back) — that is normal, not a mistake.',
          'Use the date picker to compare balance sheets across months. Watching equity grow month-over-month is very satisfying.',
        ],
        learnMoreHref: '/admin/university/article/accounting-101',
        learnMoreLabel: 'What is a balance sheet?',
      }}
      buildUrl={() => `/api/admin/accounting/balance-sheet?landlordId=${landlordId}`}
    >
      {({ data }) => {
        const r = data as BalanceSheetReport;
        if (!r) return null;
        const hasActivity = r.assets.lines.length > 0 || r.liabilities.lines.length > 0 || r.equity.lines.length > 0;
        if (!hasActivity) {
          return (
            <div className='rounded-lg border border-gray-200 bg-white p-8 text-center'>
              <p className='text-sm text-gray-700 font-medium'>No balance sheet activity yet.</p>
              <p className='text-xs text-gray-500 mt-2 max-w-md mx-auto'>
                As soon as money moves in or out of your business, the relevant accounts (cash, security deposits, owner distributions, etc.) will show up here.
              </p>
            </div>
          );
        }
        return (
          <div className='space-y-6'>
            <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${r.balanced ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              {r.balanced
                ? '✅ Balance sheet is in balance. Assets = Liabilities + Equity.'
                : `⚠️ Out of balance by ${fmtCurrency(Math.abs(r.totalAssets - r.totalLiabilitiesAndEquity))}.`}
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
              <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
                <div className='px-4 py-2.5 border-b border-gray-200 bg-gray-50 text-sm font-semibold'>Assets</div>
                {renderSection(r.assets)}
              </div>
              <div className='space-y-4'>
                <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
                  <div className='px-4 py-2.5 border-b border-gray-200 bg-gray-50 text-sm font-semibold'>Liabilities</div>
                  {renderSection(r.liabilities)}
                </div>
                <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
                  <div className='px-4 py-2.5 border-b border-gray-200 bg-gray-50 text-sm font-semibold'>Equity</div>
                  {renderSection(r.equity)}
                </div>
                <div className='bg-sky-50 border border-sky-200 rounded-lg p-4 text-sm'>
                  <p className='font-semibold text-sky-900'>Total Liabilities + Equity</p>
                  <p className='text-xl font-bold text-sky-900 mt-1'>{fmtCurrency(r.totalLiabilitiesAndEquity)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </ReportShell>
  );
}
