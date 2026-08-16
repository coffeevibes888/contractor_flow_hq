'use client';

import React from 'react';
import ReportShell from '../_components/report-shell';
import { fmtCurrency } from '../_components/format';

interface CashFlowLine { label: string; amount: number; positive: boolean }
interface CashFlowReport {
  from: string;
  to: string;
  operating: CashFlowLine[];
  investing: CashFlowLine[];
  financing: CashFlowLine[];
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netChange: number;
}

function Section({ title, lines, net, color }: { title: string; lines: CashFlowLine[]; net: number; color: string }) {
  return (
    <div className='rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm'>
      <div className='flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100'>
        <h3 className='text-sm font-bold text-gray-900'>{title}</h3>
        <span className={`text-sm font-bold tabular-nums ${color}`}>{net >= 0 ? '+' : ''}{fmtCurrency(net)}</span>
      </div>
      <div className='divide-y divide-gray-50'>
        {lines.map((line) => (
          <div key={line.label} className='flex items-center justify-between px-5 py-3'>
            <span className='text-sm text-gray-700'>{line.label}</span>
            <span className={`text-sm font-medium tabular-nums ${line.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {line.amount >= 0 ? '+' : ''}{fmtCurrency(line.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CashFlowClient({ landlordId }: { landlordId: string }) {
  return (
    <ReportShell
      landlordId={landlordId}
      title='Cash Flow Statement'
      subtitle='Where cash came from and where it went — operating, investing, and financing activities.'
      help={{
        summary: 'The Cash Flow Statement answers one question: did you end up with more or less cash than you started with?',
        whatItShows: 'Three sections: Operating (rent in, bills out), Investing (capex, depreciation), and Financing (distributions, mortgage payments). Net change is the bottom line.',
        whenToUse: 'Review monthly with the P&L. P&L shows profit; Cash Flow shows cash. They diverge when there are timing differences like prepaid rent or accrued expenses.',
        tips: [
          'A positive net operating number means your properties are generating cash.',
          'Investing activities being negative just means you\'re spending on improvements — that\'s normal.',
          'If Net Change is negative month after month, you may need to raise rents or cut expenses.',
        ],
      }}
      buildUrl={() => `/api/admin/accounting/cash-flow?landlordId=${landlordId}`}
    >
      {({ data }) => {
        const r = data as CashFlowReport;
        if (!r) return <div className='rounded-lg border border-gray-200 bg-white p-8 text-center'><p className='text-sm text-gray-500'>No cash flow data for this period.</p></div>;
        return (
          <div className='space-y-4'>
            <Section title='Operating Activities' lines={r.operating} net={r.netOperating} color={r.netOperating >= 0 ? 'text-emerald-700' : 'text-red-600'} />
            <Section title='Investing Activities' lines={r.investing} net={r.netInvesting} color={r.netInvesting >= 0 ? 'text-emerald-700' : 'text-amber-600'} />
            <Section title='Financing Activities' lines={r.financing} net={r.netFinancing} color={r.netFinancing >= 0 ? 'text-emerald-700' : 'text-amber-600'} />

            {/* Net Change */}
            <div className={`rounded-xl border-2 p-5 flex items-center justify-between ${r.netChange >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div>
                <p className='text-sm font-bold text-gray-900'>Net Change in Cash</p>
                <p className='text-xs text-gray-500 mt-0.5'>{new Date(r.from).toLocaleDateString()} – {new Date(r.to).toLocaleDateString()}</p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${r.netChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {r.netChange >= 0 ? '+' : ''}{fmtCurrency(r.netChange)}
              </p>
            </div>
          </div>
        );
      }}
    </ReportShell>
  );
}
