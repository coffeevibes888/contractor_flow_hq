'use client';

/**
 * ContractorAdvancedAnalytics
 * Enterprise-tier analytics dashboard for contractors.
 * Mirrors the PM analytics style with contractor-specific metrics.
 */

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Briefcase, Users,
  CheckCircle, AlertTriangle, Star, Clock, Target, Activity,
  ArrowUpRight, ArrowDownRight, RefreshCw, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  monthlyRevenue: number[];
  monthlyExpenses: number[];
  ytdRevenue: number;
  ytdExpenses: number;
  ytdProfit: number;
  ytdMargin: number;
  revenueGrowth: number;
  thisMonthRevenue: number;
  thisMonthExpenses: number;
  totalJobs: number;
  completedJobs: number;
  canceledJobs: number;
  completionRate: number;
  avgJobValue: number;
  jobsByType: Array<{ type: string; revenue: number; count: number }>;
  expenseByCategory: Array<{ category: string; amount: number }>;
  totalInvoiced: number;
  totalPaid: number;
  overdueInvoices: number;
  collectionRate: number;
  avgDaysToPay: number;
  topCustomers: Array<{ customerId: string; name: string; revenue: number; jobCount: number }>;
  repeatRate: number;
  activeEmployees: number;
  totalHoursBilled: number;
  avgRevenuePerEmployee: number;
  pipelineValue: number;
  pipelineJobs: number;
  avgMonthlyRevenue: number;
  healthScore: number;
  healthTrend: 'improving' | 'stable' | 'declining';
}

const CHART_COLORS = ['#F59E0B', '#06B6D4', '#8B5CF6', '#10B981', '#F43F5E', '#6366F1'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

function KpiCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; trend?: number;
}) {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden">
      <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${color} opacity-10 rounded-bl-full`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          {trend !== undefined && trend !== 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
              trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {trend > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContractorAdvancedAnalytics({ contractorId }: { contractorId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'customers' | 'crew'>('overview');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contractor/analytics');
      const json = await res.json();
      if (res.ok && json.success) setData(json.data);
      else setError(json.error ?? 'Failed to load analytics');
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [contractorId]);

  const exportCSV = () => {
    if (!data) return;
    const now = new Date();
    const rows = [
      ['Metric', 'Value'],
      ['YTD Revenue', data.ytdRevenue],
      ['YTD Expenses', data.ytdExpenses],
      ['YTD Profit', data.ytdProfit],
      ['Profit Margin', `${data.ytdMargin.toFixed(1)}%`],
      ['Total Jobs (YTD)', data.totalJobs],
      ['Completed Jobs', data.completedJobs],
      ['Completion Rate', `${data.completionRate.toFixed(1)}%`],
      ['Avg Job Value', data.avgJobValue],
      ['Collection Rate', `${data.collectionRate.toFixed(1)}%`],
      ['Overdue Invoices', data.overdueInvoices],
      ['Pipeline Value', data.pipelineValue],
      ['Health Score', data.healthScore],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contractor-analytics-${now.getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-red-400 mb-2" />
        <p className="text-sm font-semibold text-red-700">{error ?? 'No data available'}</p>
        <Button size="sm" onClick={load} className="mt-3 bg-red-500 hover:bg-red-600 text-white text-xs">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const healthColor = data.healthScore >= 80 ? 'text-emerald-500' : data.healthScore >= 60 ? 'text-amber-500' : 'text-red-500';
  const trendIcon = data.healthTrend === 'improving'
    ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
    : data.healthTrend === 'declining'
    ? <ArrowDownRight className="h-4 w-4 text-red-500" />
    : null;

  const chartData = MONTHS.map((month, i) => ({
    month,
    revenue: data.monthlyRevenue[i] ?? 0,
    expenses: data.monthlyExpenses[i] ?? 0,
    profit: (data.monthlyRevenue[i] ?? 0) - (data.monthlyExpenses[i] ?? 0),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-800">Advanced Analytics</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">ENTERPRISE</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load}
            className="border-gray-200 text-xs h-7">
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV}
            className="border-gray-200 text-xs h-7">
            <Download className="h-3 w-3 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Health Score Banner */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Business Health</p>
              <p className={`text-4xl font-bold ${healthColor}`}>{data.healthScore}<span className="text-lg text-gray-400">/100</span></p>
              <div className="flex items-center gap-1 justify-center mt-0.5">
                {trendIcon}
                <span className="text-[10px] text-gray-500 capitalize">{data.healthTrend}</span>
              </div>
            </div>
            <div className="h-12 w-px bg-gray-200" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-[10px] text-gray-500">Completion</p>
                <p className="text-sm font-bold text-gray-900">{fmtPct(data.completionRate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Collection</p>
                <p className="text-sm font-bold text-gray-900">{fmtPct(data.collectionRate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Margin</p>
                <p className="text-sm font-bold text-gray-900">{fmtPct(data.ytdMargin)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Repeat Clients</p>
                <p className="text-sm font-bold text-gray-900">{fmtPct(data.repeatRate)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" />Pipeline: {formatCurrency(data.pipelineValue)} ({data.pipelineJobs} jobs)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Revenue (YTD)" value={fmt(data.ytdRevenue)}
          sub={`This month: ${fmt(data.thisMonthRevenue)}`}
          icon={TrendingUp} color="from-emerald-400 to-cyan-400" trend={data.revenueGrowth} />
        <KpiCard label="Expenses (YTD)" value={fmt(data.ytdExpenses)}
          sub={`This month: ${fmt(data.thisMonthExpenses)}`}
          icon={TrendingDown} color="from-red-400 to-rose-400" />
        <KpiCard label="Net Profit (YTD)" value={fmt(data.ytdProfit)}
          sub={`Margin: ${fmtPct(data.ytdMargin)}`}
          icon={DollarSign} color="from-blue-400 to-indigo-400" />
        <KpiCard label="Avg Job Value" value={fmt(data.avgJobValue)}
          sub={`${data.totalJobs} jobs YTD`}
          icon={Briefcase} color="from-amber-400 to-orange-400" />
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['overview', 'jobs', 'customers', 'crew'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Trend */}
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h4 className="text-sm font-bold text-gray-800">Revenue Trend</h4>
                <p className="text-[11px] text-gray-500">Monthly revenue vs expenses (12 months)</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="cRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="cExpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      tickFormatter={(v) => v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      formatter={(v: number, n: string) => [formatCurrency(v), n === 'revenue' ? 'Revenue' : n === 'expenses' ? 'Expenses' : 'Profit']} />
                    <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2.5} fill="url(#cRevGrad)" />
                    <Area type="monotone" dataKey="expenses" stroke="#F43F5E" strokeWidth={1.5} fill="url(#cExpGrad)" strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Breakdown Donut */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h4 className="text-sm font-bold text-gray-800">Expense Breakdown</h4>
                <p className="text-[11px] text-gray-500">YTD by category</p>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={data.expenseByCategory.length > 0
                        ? data.expenseByCategory.map((e) => ({ name: e.category.replace(/_/g, ' '), value: e.amount }))
                        : [{ name: 'No expenses', value: 1 }]}
                      cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {(data.expenseByCategory.length > 0 ? data.expenseByCategory : [{ category: 'none' }]).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatCurrency(v)]}
                      contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-1">
                {data.expenseByCategory.slice(0, 5).map((e, i) => (
                  <div key={e.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-gray-700 capitalize">{e.category.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
                {data.expenseByCategory.length === 0 && (
                  <p className="text-xs text-gray-400 text-center">No expenses recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice + Pipeline row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-3">Invoice Health</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Invoiced (YTD)</span>
                  <span className="font-bold text-gray-900">{formatCurrency(data.totalInvoiced)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Collected</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(data.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Outstanding</span>
                  <span className="font-bold text-amber-600">{formatCurrency(data.totalInvoiced - data.totalPaid)}</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Collection Rate</span>
                    <span className="font-bold text-gray-900">{fmtPct(data.collectionRate)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
                      style={{ width: `${Math.min(data.collectionRate, 100)}%` }} />
                  </div>
                </div>
                {data.overdueInvoices > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="text-[10px] text-red-700 font-semibold">
                      {data.overdueInvoices} overdue invoice{data.overdueInvoices !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                <div className="text-[10px] text-gray-400">
                  Avg {data.avgDaysToPay} days to collect
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-3">Pipeline</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Total Pipeline Value</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.pipelineValue)}</p>
                  <p className="text-[10px] text-gray-400">{data.pipelineJobs} jobs quoted/approved/scheduled</p>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-500 font-medium">3-Month Forecast</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(data.avgMonthlyRevenue * 3)}</p>
                  <p className="text-[10px] text-gray-400">Based on {formatCurrency(data.avgMonthlyRevenue)}/mo avg</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-3">Crew Productivity</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Active Employees</span>
                  <span className="font-bold text-gray-900">{data.activeEmployees}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Hours Billed (YTD)</span>
                  <span className="font-bold text-gray-900">{data.totalHoursBilled.toFixed(0)}h</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Revenue / Employee</span>
                  <span className="font-bold text-gray-900">{formatCurrency(data.avgRevenuePerEmployee)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Jobs Tab ── */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Total Jobs (YTD)" value={String(data.totalJobs)} icon={Briefcase} color="from-blue-400 to-indigo-400" />
            <KpiCard label="Completed" value={String(data.completedJobs)} sub={fmtPct(data.completionRate) + ' rate'} icon={CheckCircle} color="from-emerald-400 to-cyan-400" />
            <KpiCard label="Canceled" value={String(data.canceledJobs)} icon={AlertTriangle} color="from-red-400 to-rose-400" />
            <KpiCard label="Avg Job Value" value={fmt(data.avgJobValue)} icon={DollarSign} color="from-amber-400 to-orange-400" />
          </div>

          {/* Jobs by type bar chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 mb-1">Revenue by Job Type</h4>
            <p className="text-[11px] text-gray-500 mb-4">YTD completed jobs</p>
            {data.jobsByType.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No completed jobs yet</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.jobsByType.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      tickFormatter={(v) => v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v} />
                    <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: '#6B7280' }} width={90} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                      contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                    <Bar dataKey="revenue" fill="#F59E0B" radius={[0, 4, 4, 0]}>
                      {data.jobsByType.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Profit trend */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 mb-1">Monthly Profit</h4>
            <p className="text-[11px] text-gray-500 mb-4">Revenue minus expenses per month</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={(v) => v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Profit']}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                  <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.profit >= 0 ? '#10B981' : '#F43F5E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Customers Tab ── */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard label="Repeat Client Rate" value={fmtPct(data.repeatRate)} sub="Clients with 2+ jobs" icon={Star} color="from-amber-400 to-orange-400" />
            <KpiCard label="Avg Days to Pay" value={`${data.avgDaysToPay}d`} sub="Invoice to payment" icon={Clock} color="from-blue-400 to-indigo-400" />
            <KpiCard label="Collection Rate" value={fmtPct(data.collectionRate)} sub="Invoiced vs collected" icon={Target} color="from-emerald-400 to-cyan-400" />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-800">Top Customers (YTD)</h4>
            </div>
            {data.topCustomers.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No completed jobs yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.topCustomers.map((c, i) => (
                  <div key={c.customerId} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-500">{c.jobCount} job{c.jobCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(c.revenue)}</p>
                      {c.jobCount > 1 && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          Repeat
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Crew Tab ── */}
      {activeTab === 'crew' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard label="Active Employees" value={String(data.activeEmployees)} icon={Users} color="from-blue-400 to-indigo-400" />
            <KpiCard label="Hours Billed (YTD)" value={`${data.totalHoursBilled.toFixed(0)}h`} icon={Clock} color="from-violet-400 to-purple-400" />
            <KpiCard label="Revenue / Employee" value={fmt(data.avgRevenuePerEmployee)} icon={Activity} color="from-emerald-400 to-cyan-400" />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 mb-1">Revenue per Employee</h4>
            <p className="text-[11px] text-gray-500 mb-4">YTD revenue divided across active crew</p>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.avgRevenuePerEmployee)}</p>
                <p className="text-xs text-gray-500">per employee · {data.activeEmployees} active crew members</p>
                <p className="text-xs text-gray-500">{data.totalHoursBilled.toFixed(0)} total hours billed YTD</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3">
              Industry benchmark for residential contractors: $80,000–$150,000 revenue per field employee per year.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
