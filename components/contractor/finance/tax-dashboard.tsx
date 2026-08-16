'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  Download, AlertTriangle, CheckCircle2, ChevronDown,
  RefreshCw, Loader2, ReceiptText, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthRow { month: number; revenue: number; expenses: number; payroll: number; netProfit: number; }

interface Sub1099 {
  id: string; companyName: string; contactName: string;
  email: string; phone: string | null; taxId: string | null;
  total: number; jobCount: number; missingTaxId: boolean;
}

interface SummaryData {
  year: number; month: number | null;
  revenue: { total: number; invoiced: number; jobs: number };
  expenses: { total: number; taxDeductible: number; byCategory: Record<string, number> };
  payroll: { gross: number; net: number };
  profit: { gross: number; net: number };
  tax1099: { threshold: number; totalPaid: number; subcontractors: Sub1099[] };
  monthlyBreakdown: MonthRow[] | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EXPENSE_LABELS: Record<string, string> = {
  materials: 'Materials & Supplies',
  tools: 'Tools & Equipment',
  fuel: 'Fuel & Vehicle',
  subcontractor: 'Subcontractors',
  permits: 'Permits & Licenses',
  other: 'Other',
};

const EXPENSE_COLORS: Record<string, string> = {
  materials: 'bg-blue-500',
  tools: 'bg-violet-500',
  fuel: 'bg-amber-500',
  subcontractor: 'bg-orange-500',
  permits: 'bg-teal-500',
  other: 'bg-gray-400',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialYear: number;
  canExport: boolean;
  canViewDetailed: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaxDashboard({ initialYear, canExport, canViewDetailed }: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState<number | null>(null);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting1099, setExporting1099] = useState(false);
  const [exportingPL, setExportingPL] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (month) params.set('month', String(month));
      const res = await fetch(`/api/contractor/finance/summary?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  async function export1099CSV() {
    setExporting1099(true);
    try {
      const res = await fetch(`/api/contractor/finance/1099?year=${year}&format=csv`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `1099-prep-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting1099(false);
    }
  }

  function exportPLCSV() {
    if (!data) return;
    setExportingPL(true);
    try {
      let csv = `P&L Summary — ${year}${month ? ` (${MONTH_NAMES[month - 1]})` : ' (Full Year)'}\n\n`;
      csv += 'Category,Amount\n';
      csv += `Total Revenue,${data.revenue.total.toFixed(2)}\n`;
      csv += `Invoiced Revenue,${data.revenue.invoiced.toFixed(2)}\n`;
      csv += `Job Revenue,${data.revenue.jobs.toFixed(2)}\n\n`;
      csv += `Total Expenses,${data.expenses.total.toFixed(2)}\n`;
      csv += `Tax-Deductible Expenses,${data.expenses.taxDeductible.toFixed(2)}\n`;
      Object.entries(data.expenses.byCategory).forEach(([k, v]) => {
        csv += `  ${EXPENSE_LABELS[k] || k},${Number(v).toFixed(2)}\n`;
      });
      csv += `\nGross Payroll,${data.payroll.gross.toFixed(2)}\n`;
      csv += `Net Payroll,${data.payroll.net.toFixed(2)}\n\n`;
      csv += `Gross Profit,${data.profit.gross.toFixed(2)}\n`;
      csv += `Net Profit,${data.profit.net.toFixed(2)}\n`;

      if (data.monthlyBreakdown) {
        csv += '\n\nMonthly Breakdown\nMonth,Revenue,Expenses,Payroll,Net Profit\n';
        data.monthlyBreakdown.forEach(r => {
          csv += `${MONTH_NAMES[r.month - 1]},${r.revenue.toFixed(2)},${r.expenses.toFixed(2)},${r.payroll.toFixed(2)},${r.netProfit.toFixed(2)}\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pl-summary-${year}${month ? `-${month}` : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPL(false);
    }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => initialYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax & Financial Summary</h1>
          <p className="text-sm text-gray-500 mt-0.5">P&L report, expense categories, and 1099 prep</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="relative">
            <select
              value={year}
              onChange={e => { setYear(parseInt(e.target.value)); setMonth(null); }}
              className="appearance-none rounded-lg border-2 border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-medium focus:border-blue-400 focus:outline-none"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {/* Month selector */}
          <div className="relative">
            <select
              value={month ?? ''}
              onChange={e => setMonth(e.target.value ? parseInt(e.target.value) : null)}
              className="appearance-none rounded-lg border-2 border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-medium focus:border-blue-400 focus:outline-none"
            >
              <option value="">Full Year</option>
              {MONTH_NAMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <Button variant="outline" size="icon" onClick={load} className="border-2 border-gray-200" title="Refresh">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </Button>
          {canExport && (
            <>
              <Button variant="outline" onClick={exportPLCSV} disabled={exportingPL || !data} className="border-2 border-gray-200 text-sm">
                {exportingPL ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                P&L CSV
              </Button>
              <Button variant="outline" onClick={export1099CSV} disabled={exporting1099} className="border-2 border-gray-200 text-sm">
                {exporting1099 ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
                1099 CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : !data ? (
        <p className="text-center text-gray-500 py-12">Failed to load financial data.</p>
      ) : (
        <>
          {/* Top KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Revenue"
              value={formatCurrency(data.revenue.total)}
              icon={TrendingUp}
              color="bg-emerald-100"
              iconColor="text-emerald-600"
            />
            <KpiCard
              label="Total Expenses"
              value={formatCurrency(data.expenses.total)}
              icon={ReceiptText}
              color="bg-red-100"
              iconColor="text-red-600"
            />
            <KpiCard
              label="Gross Payroll"
              value={formatCurrency(data.payroll.gross)}
              icon={Users}
              color="bg-blue-100"
              iconColor="text-blue-600"
            />
            <KpiCard
              label="Net Profit"
              value={formatCurrency(data.profit.net)}
              icon={data.profit.net >= 0 ? TrendingUp : TrendingDown}
              color={data.profit.net >= 0 ? 'bg-emerald-100' : 'bg-red-100'}
              iconColor={data.profit.net >= 0 ? 'text-emerald-600' : 'text-red-600'}
              highlight
            />
          </div>

          {/* P&L Summary */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue breakdown */}
            <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Revenue
              </h3>
              <div className="space-y-3">
                <PLRow label="Invoiced & Collected" value={data.revenue.invoiced} />
                <PLRow label="Job Revenue (actual cost)" value={data.revenue.jobs} />
                <div className="border-t-2 border-gray-100 pt-3">
                  <PLRow label="Total Revenue (used)" value={data.revenue.total} bold />
                </div>
              </div>
            </div>

            {/* Expense breakdown */}
            <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" /> Expenses
              </h3>
              <div className="space-y-2">
                {Object.entries(data.expenses.byCategory).map(([key, val]) => (
                  Number(val) > 0 && (
                    <div key={key} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${EXPENSE_COLORS[key] || 'bg-gray-400'}`} />
                      <span className="text-sm text-gray-600 flex-1">{EXPENSE_LABELS[key] || key}</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(val))}</span>
                    </div>
                  )
                ))}
                <div className="border-t-2 border-gray-100 pt-2 mt-2">
                  <PLRow label="Tax-Deductible" value={data.expenses.taxDeductible} className="text-emerald-700" />
                  <PLRow label="Total Expenses" value={data.expenses.total} bold />
                </div>
              </div>
            </div>
          </div>

          {/* Net P&L waterfall */}
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" /> Profit & Loss
            </h3>
            <div className="space-y-2 max-w-lg">
              <PLRow label="Total Revenue" value={data.revenue.total} />
              <PLRow label="− Total Expenses" value={-data.expenses.total} signed />
              <div className="border-t border-gray-200 pt-2">
                <PLRow label="Gross Profit" value={data.profit.gross} bold />
              </div>
              <PLRow label="− Gross Payroll" value={-data.payroll.gross} signed />
              <div className="border-t-2 border-gray-900 pt-2">
                <PLRow
                  label="Net Profit"
                  value={data.profit.net}
                  bold
                  className={data.profit.net >= 0 ? 'text-emerald-700' : 'text-red-600'}
                />
              </div>
            </div>
          </div>

          {/* Monthly bar chart — only for full-year view */}
          {data.monthlyBreakdown && (
            <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Breakdown — {year}</h3>
              <MonthlyChart rows={data.monthlyBreakdown} />
            </div>
          )}

          {/* 1099 prep */}
          {canViewDetailed && (
            <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
              <div className="p-5 border-b-2 border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-violet-600" />
                    1099-NEC Prep — {year}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Subcontractors paid ≥ $600 require a 1099-NEC filing
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {data.tax1099.subcontractors.some(s => s.missingTaxId) && (
                    <Badge className="bg-red-100 text-red-700 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {data.tax1099.subcontractors.filter(s => s.missingTaxId).length} Missing Tax ID
                    </Badge>
                  )}
                  {canExport && (
                    <Button size="sm" variant="outline" onClick={export1099CSV} disabled={exporting1099} className="border-gray-200">
                      {exporting1099 ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                      Export CSV
                    </Button>
                  )}
                </div>
              </div>

              {data.tax1099.subcontractors.length === 0 ? (
                <div className="p-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">No subcontractors reached the $600 threshold</p>
                  <p className="text-sm text-gray-500">No 1099s required for {year}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="px-5 py-3 text-left">Company</th>
                        <th className="px-5 py-3 text-left">Contact</th>
                        <th className="px-5 py-3 text-left">Tax ID (EIN)</th>
                        <th className="px-5 py-3 text-right">Jobs</th>
                        <th className="px-5 py-3 text-right">Total Paid</th>
                        <th className="px-5 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.tax1099.subcontractors.map(sub => (
                        <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900">{sub.companyName}</td>
                          <td className="px-5 py-3 text-gray-600">{sub.contactName}</td>
                          <td className="px-5 py-3">
                            {sub.taxId ? (
                              <span className="font-mono text-gray-700">{sub.taxId}</span>
                            ) : (
                              <span className="text-red-600 font-semibold flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" /> Missing
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-600">{sub.jobCount}</td>
                          <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(sub.total)}</td>
                          <td className="px-5 py-3 text-right">
                            {sub.missingTaxId ? (
                              <Badge className="bg-red-100 text-red-700">Action Required</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={4} className="px-5 py-3 text-gray-700">Total 1099 Payments</td>
                        <td className="px-5 py-3 text-right text-gray-900">{formatCurrency(data.tax1099.totalPaid)}</td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, iconColor, highlight }: {
  label: string; value: string; icon: React.ElementType;
  color: string; iconColor: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border-2 ${highlight ? 'border-gray-900' : 'border-gray-200'} bg-white p-5 shadow-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-gray-900' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function PLRow({ label, value, bold, signed, className }: {
  label: string; value: number; bold?: boolean; signed?: boolean; className?: string;
}) {
  const display = signed
    ? (value < 0 ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value))
    : formatCurrency(value);
  return (
    <div className={`flex justify-between items-center py-0.5 ${bold ? 'font-bold' : 'text-sm'} ${className || 'text-gray-700'}`}>
      <span>{label}</span>
      <span className={signed && value < 0 ? 'text-red-600' : ''}>{display}</span>
    </div>
  );
}

function MonthlyChart({ rows }: { rows: MonthRow[] }) {
  const max = Math.max(...rows.map(r => Math.max(r.revenue, r.expenses + r.payroll)), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2 min-w-[640px] h-48 pb-6 relative">
        {rows.map(r => {
          const revH = Math.round((r.revenue / max) * 160);
          const expH = Math.round(((r.expenses + r.payroll) / max) * 160);
          return (
            <div key={r.month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="flex items-end gap-0.5 w-full">
                <div
                  className="flex-1 bg-emerald-400 rounded-t-sm transition-all"
                  style={{ height: `${revH}px` }}
                  title={`Revenue: ${formatCurrency(r.revenue)}`}
                />
                <div
                  className="flex-1 bg-red-400 rounded-t-sm transition-all"
                  style={{ height: `${expH}px` }}
                  title={`Expenses+Payroll: ${formatCurrency(r.expenses + r.payroll)}`}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1">{MONTH_NAMES[r.month - 1]}</span>
              {/* Tooltip */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap pointer-events-none shadow-lg">
                <p>Rev: {formatCurrency(r.revenue)}</p>
                <p>Exp: {formatCurrency(r.expenses)}</p>
                <p>Pay: {formatCurrency(r.payroll)}</p>
                <p className={r.netProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  Net: {formatCurrency(r.netProfit)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400 inline-block" /> Revenue</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-400 inline-block" /> Expenses + Payroll</span>
      </div>
    </div>
  );
}
