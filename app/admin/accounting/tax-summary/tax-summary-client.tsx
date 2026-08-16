'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TaxLine {
  lineKey: string;
  label: string;
  total: number;
  isIncome: boolean;
  accounts: { code: string; name: string; amount: number }[];
}

interface TaxReport {
  year: number;
  lines: TaxLine[];
  totalIncome: number;
  totalExpenses: number;
  netRentalIncome: number;
}

export default function TaxSummaryClient({ landlordId }: { landlordId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounting/tax-summary?landlordId=${landlordId}&year=${year}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tax summary');
    } finally {
      setLoading(false);
    }
  }, [landlordId, year]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Schedule E Tax Summary', data.year.toString()],
      ['', ''],
      ['Line', 'Description', 'Amount'],
      ...data.lines.map((l) => [l.lineKey, l.label, l.total.toFixed(2)]),
      ['', '', ''],
      ['', 'Total Rental Income', data.totalIncome.toFixed(2)],
      ['', 'Total Expenses', data.totalExpenses.toFixed(2)],
      ['', 'Net Rental Income', data.netRentalIncome.toFixed(2)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-e-${data.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const incomeLines = data?.lines.filter((l) => l.isIncome) ?? [];
  const expenseLines = data?.lines.filter((l) => !l.isIncome) ?? [];

  return (
    <div className='space-y-5'>
      {/* Controls */}
      <div className='flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm'>
        <div className='flex items-center gap-2'>
          <label className='text-xs font-semibold text-gray-700'>Tax Year</label>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'>
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading} className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 disabled:opacity-50'>
          <Loader2 className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : 'hidden'}`} />Refresh
        </button>
        {data && (
          <button onClick={handleExportCSV}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 ml-auto'>
            <Download className='h-3.5 w-3.5' />Export CSV
          </button>
        )}
      </div>

      {error && <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>}

      {loading ? (
        <div className='flex items-center justify-center py-20 text-gray-400'><Loader2 className='h-6 w-6 animate-spin mr-2' />Loading tax summary…</div>
      ) : !data || data.lines.length === 0 ? (
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center'>
          <p className='text-sm text-gray-500'>No GL activity with Schedule E tax lines for {year}.</p>
          <p className='text-xs text-gray-400 mt-2 max-w-md mx-auto'>Add tax line mappings to your Chart of Accounts accounts to populate this report.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className='grid grid-cols-3 gap-3'>
            <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-4'>
              <p className='text-xs text-emerald-700 font-medium'>Total Rental Income</p>
              <p className='text-xl font-bold text-emerald-800 mt-1'>{formatCurrency(data.totalIncome)}</p>
              <p className='text-[10px] text-emerald-600 mt-0.5'>Sch E Part I, Line 3</p>
            </div>
            <div className='rounded-xl border border-rose-200 bg-rose-50 p-4'>
              <p className='text-xs text-rose-700 font-medium'>Total Expenses</p>
              <p className='text-xl font-bold text-rose-800 mt-1'>{formatCurrency(data.totalExpenses)}</p>
              <p className='text-[10px] text-rose-600 mt-0.5'>Sch E Lines 5–22</p>
            </div>
            <div className={`rounded-xl border p-4 ${data.netRentalIncome >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
              <p className={`text-xs font-medium ${data.netRentalIncome >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Net Rental Income</p>
              <p className={`text-xl font-bold mt-1 ${data.netRentalIncome >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{formatCurrency(data.netRentalIncome)}</p>
              <p className={`text-[10px] mt-0.5 ${data.netRentalIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Sch E Line 24 / 25</p>
            </div>
          </div>

          {/* Income section */}
          {incomeLines.length > 0 && (
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='px-5 py-3 bg-emerald-50 border-b border-gray-100'>
                <h3 className='text-sm font-bold text-emerald-800'>Income (Schedule E Part I)</h3>
              </div>
              <table className='w-full text-sm'>
                <tbody className='divide-y divide-gray-50'>
                  {incomeLines.map((line) => (
                    <tr key={line.lineKey} className='hover:bg-gray-50/50'>
                      <td className='px-5 py-3 font-mono text-xs text-gray-400 w-32'>{line.lineKey}</td>
                      <td className='px-4 py-3 text-sm text-gray-900'>{line.label}</td>
                      <td className='px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums'>{formatCurrency(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expense section */}
          {expenseLines.length > 0 && (
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='px-5 py-3 bg-rose-50 border-b border-gray-100'>
                <h3 className='text-sm font-bold text-rose-800'>Expenses (Schedule E Part I, Lines 5–22)</h3>
              </div>
              <table className='w-full text-sm'>
                <tbody className='divide-y divide-gray-50'>
                  {expenseLines.map((line) => (
                    <tr key={line.lineKey} className='hover:bg-gray-50/50'>
                      <td className='px-5 py-3 font-mono text-xs text-gray-400 w-32'>{line.lineKey}</td>
                      <td className='px-4 py-3'>
                        <p className='text-sm text-gray-900'>{line.label}</p>
                        {line.accounts.length > 1 && (
                          <p className='text-[10px] text-gray-400 mt-0.5'>
                            {line.accounts.map((a) => `${a.code} ${a.name}`).join(' · ')}
                          </p>
                        )}
                      </td>
                      <td className='px-4 py-3 text-right font-semibold text-gray-900 tabular-nums'>{formatCurrency(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className='bg-gray-50 border-t-2 border-gray-200'>
                  <tr>
                    <td colSpan={2} className='px-5 py-3 text-sm font-bold text-gray-700'>Total Expenses (Line 22)</td>
                    <td className='px-4 py-3 text-right text-sm font-bold text-rose-700 tabular-nums'>{formatCurrency(data.totalExpenses)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className='text-xs text-gray-400 text-center'>
            This report is informational. Verify with your CPA before filing. PropertyFlow does not provide tax advice.
          </p>
        </>
      )}
    </div>
  );
}
