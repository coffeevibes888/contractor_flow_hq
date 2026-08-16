'use client';

import React from 'react';
import ReportShell from '../_components/report-shell';
import { fmtCurrency } from '../_components/format';
import Link from 'next/link';

interface AgingRow {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyUnit: string;
  leaseId: string;
  balance: number;
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
  oldestDueDate: string | null;
}

interface AgingSummary {
  total: number;
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
  tenantCount: number;
}

interface AgingReport {
  rows: AgingRow[];
  summary: AgingSummary;
  asOf: string;
}

export default function ArAgingClient({ landlordId }: { landlordId: string }) {
  return (
    <ReportShell
      landlordId={landlordId}
      title='AR Aging'
      subtitle='Outstanding tenant balances bucketed by days overdue — find who owes what and for how long.'
      help={{
        summary: 'Shows every tenant with an outstanding balance, bucketed by how long it has been outstanding.',
        whatItShows: 'Tenant name, property, and how much they owe broken into: Current, 1–30 days, 31–60 days, 61–90 days, and 90+ days buckets.',
        whenToUse: 'Run this weekly to catch late rent early. The older the balance, the harder it is to collect.',
        tips: [
          'Current = balance that isn\'t overdue yet. 30+ = actively chasing.',
          'Sort by the 90+ column to prioritize collections or evictions.',
          'Any balance over 60 days should trigger a late notice or payment plan.',
        ],
      }}
      buildUrl={() => `/api/admin/accounting/ar-aging?landlordId=${landlordId}`}
    >
      {({ data }) => {
        const report = data as AgingReport;
        if (!report?.rows?.length) {
          return (
            <div className='rounded-lg border border-gray-200 bg-white p-8 text-center'>
              <p className='text-sm text-gray-700 font-medium'>No outstanding tenant balances.</p>
              <p className='text-xs text-gray-500 mt-2 max-w-md mx-auto'>All tenants are current — nothing in AR.</p>
            </div>
          );
        }
        const { summary, rows } = report;
        return (
          <div className='space-y-5'>
            {/* Summary buckets */}
            <div className='grid grid-cols-2 sm:grid-cols-5 gap-3'>
              {[
                { label: 'Total AR', value: summary.total, color: 'text-gray-900' },
                { label: 'Current', value: summary.current, color: 'text-blue-700' },
                { label: '1–30 Days', value: summary.days30, color: 'text-amber-600' },
                { label: '31–60 Days', value: summary.days60, color: 'text-orange-600' },
                { label: '60+ Days', value: summary.days90plus, color: 'text-red-700' },
              ].map((kpi) => (
                <div key={kpi.label} className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
                  <p className='text-xs text-gray-500'>{kpi.label}</p>
                  <p className={`text-lg font-bold mt-1 ${kpi.color}`}>{fmtCurrency(kpi.value)}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-gray-100 bg-gray-50'>
                    {['Tenant', 'Property · Unit', 'Current', '1–30 Days', '31–60 Days', '60+ Days', 'Total'].map((h) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Tenant' || h === 'Property · Unit' ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50'>
                  {rows.map((row) => (
                    <tr key={row.leaseId} className='hover:bg-gray-50/50 transition-colors'>
                      <td className='px-4 py-3'>
                        <p className='text-xs font-medium text-gray-900'>{row.tenantName}</p>
                        <p className='text-[10px] text-gray-400'>{row.tenantEmail}</p>
                      </td>
                      <td className='px-4 py-3 text-xs text-gray-500'>{row.propertyUnit}</td>
                      {[row.current, row.days30, row.days60, row.days90plus].map((v, i) => (
                        <td key={i} className={`px-4 py-3 text-right text-xs tabular-nums ${v > 0 && i > 0 ? 'font-semibold text-red-600' : 'text-gray-700'}`}>
                          {v > 0 ? fmtCurrency(v) : '—'}
                        </td>
                      ))}
                      <td className='px-4 py-3 text-right'>
                        <p className='text-sm font-bold text-red-600 tabular-nums'>{fmtCurrency(row.balance)}</p>
                        <Link href={`/admin/accounting/tenant-ledger/${row.leaseId}`} className='text-[10px] text-violet-500 hover:underline'>
                          View ledger →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className='bg-gray-50 border-t-2 border-gray-200'>
                  <tr>
                    <td colSpan={2} className='px-4 py-2.5 text-xs font-bold text-gray-700'>Totals ({summary.tenantCount} tenants)</td>
                    {[summary.current, summary.days30, summary.days60, summary.days90plus].map((v, i) => (
                      <td key={i} className='px-4 py-2.5 text-right text-xs font-bold tabular-nums'>{fmtCurrency(v)}</td>
                    ))}
                    <td className='px-4 py-2.5 text-right text-sm font-bold text-red-700 tabular-nums'>{fmtCurrency(summary.total)}</td>
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
