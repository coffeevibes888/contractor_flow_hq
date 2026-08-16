'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import {
  Briefcase, TrendingUp, FileText, DollarSign, Users,
  Star, CheckCircle2, ChevronRight, Clock, AlertTriangle,
  Calendar, Wrench, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { DashboardQuickActions } from '@/components/contractor/dashboard-quick-actions';

interface DashboardStats {
  activeJobs: number;
  completedJobsThisMonth: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  hotLeads: number;
  pendingQuotes: number;
  quotesThisWeek: number;
  revenueMonth: number;
  revenueYear: number;
  activeEmployees: number;
  conversionRate: string;
  avgRating: number;
  totalReviews: number;
  completedJobsAllTime: number;
  subscriptionTier: string;
}

interface RecentLead {
  id: string;
  lead: {
    id: string;
    projectTitle: string | null;
    projectType: string;
    propertyCity: string | null;
    propertyState: string | null;
    priority: string;
  };
}

interface RecentJob {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  customer: { name: string | null; email: string | null } | null;
}

interface ContractorDashboardClientProps {
  stats: DashboardStats;
  recentLeads: RecentLead[];
  recentJobs: RecentJob[];
  monthlyRevenueData: { month: string; revenue: number; jobs: number }[];
  businessName: string;
  /**
   * Permissions of the signed-in user against this contractor account. The
   * dashboard renders the same shell for everyone but hides revenue, leads,
   * and other sensitive widgets for users without the matching permission.
   */
  permissions: string[];
  /** True if the user owns the contractor account. Owner sees everything. */
  isOwner: boolean;
}

export default function ContractorDashboardClient({
  stats,
  recentLeads,
  recentJobs,
  monthlyRevenueData,
  businessName,
  permissions,
  isOwner,
}: ContractorDashboardClientProps) {
  // Helper: owner sees everything; otherwise check the permission list.
  const can = (perm: string) => isOwner || permissions.includes(perm);

  // Permission-gated visibility flags for each widget. Keep these named so
  // the JSX below stays readable.
  const showRevenue       = can('financials.view_summary');
  const showLeads         = can('leads.view');
  const showQuotes        = can('estimates.view');
  const showJobs          = can('jobs.view');
  const showTeamCount     = can('team.view');
  const showRatings       = can('reports.view') || can('analytics.view') || isOwner;
  const showFinancialCard = showRevenue;
  const showRecentJobs    = showJobs;
  const showRecentLeads   = showLeads;
  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>
            Contractor Dashboard
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Track jobs, leads, and revenue for {businessName || 'your business'}
          </p>
        </div>
        <span className='self-start text-[10px] bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3 py-1 rounded-full font-bold shadow-sm uppercase'>
          {stats.subscriptionTier}
        </span>
      </div>

      {/* KPI Cards — gated by permission. Field roles (foreman, technician)
           don't see revenue or leads here; they see only what's relevant to
           their day. */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {showRevenue && (
          <KPICard
            title='Revenue This Month'
            value={formatCurrency(stats.revenueMonth)}
            subtitle={`${formatCurrency(stats.revenueYear)} YTD`}
            icon={DollarSign}
            gradient='from-emerald-400 to-cyan-400'
            href='/contractor-dashboard/invoices'
          />
        )}
        {showJobs && (
          <KPICard
            title='Active Jobs'
            value={String(stats.activeJobs)}
            subtitle={`${stats.completedJobsThisMonth} completed this month`}
            icon={Briefcase}
            gradient='from-amber-400 to-orange-400'
            href='/contractor-dashboard/jobs'
          />
        )}
        {showLeads && (
          <KPICard
            title='Open Leads'
            value={String(stats.leadsThisWeek)}
            subtitle={`${stats.hotLeads} hot leads`}
            icon={TrendingUp}
            gradient='from-violet-400 to-purple-400'
            href='/contractor-dashboard/leads'
            alert={stats.hotLeads > 0}
          />
        )}
        {showQuotes && (
          <KPICard
            title='Pending Quotes'
            value={String(stats.pendingQuotes)}
            subtitle={`${stats.quotesThisWeek} sent this week`}
            icon={FileText}
            gradient='from-blue-400 to-indigo-400'
            href='/contractor-dashboard/estimates'
          />
        )}
      </div>

      {/* Summary Bar — only the metrics the user is allowed to see.
           If everything is hidden we skip the bar entirely. */}
      {(showTeamCount || showLeads || showRatings || showJobs) && (
        <div className='relative rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 overflow-hidden'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full' />
          <div className='relative p-4'>
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4'>
              {showTeamCount && (
                <SummaryItem label='Team Members' value={String(stats.activeEmployees)} />
              )}
              {showLeads && (
                <SummaryItem label='Leads This Month' value={String(stats.leadsThisMonth)} />
              )}
              {showLeads && showJobs && (
                <SummaryItem label='Conversion Rate' value={`${stats.conversionRate}%`} />
              )}
              {showRatings && (
                <SummaryItem label='Avg Rating' value={`${stats.avgRating.toFixed(1)} ★`} />
              )}
              {showRatings && (
                <SummaryItem label='Total Reviews' value={String(stats.totalReviews)} />
              )}
              {showJobs && (
                <SummaryItem label='Jobs All Time' value={String(stats.completedJobsAllTime)} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Banner — same gating */}
      {((showLeads && stats.hotLeads > 0) || (showQuotes && stats.pendingQuotes > 0)) && (
        <div className='flex flex-wrap gap-2'>
          {showLeads && stats.hotLeads > 0 && (
            <Link
              href='/contractor-dashboard/leads'
              className='flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors'
            >
              <AlertTriangle className='h-3.5 w-3.5' />
              {stats.hotLeads} hot {stats.hotLeads === 1 ? 'lead' : 'leads'} need attention
              <ChevronRight className='h-3 w-3' />
            </Link>
          )}
          {showQuotes && stats.pendingQuotes > 0 && (
            <Link
              href='/contractor-dashboard/estimates'
              className='flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors'
            >
              <FileText className='h-3.5 w-3.5' />
              {stats.pendingQuotes} pending {stats.pendingQuotes === 1 ? 'quote' : 'quotes'} awaiting response
              <ChevronRight className='h-3 w-3' />
            </Link>
          )}
        </div>
      )}

      {/* Charts Row — revenue chart hides for non-financial roles. The
           job-pipeline donut still shows if the user has jobs.view. */}
      {(showRevenue || showJobs) && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          {/* Revenue Trend */}
          {showRevenue && (
            <div className='lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='text-sm font-bold text-gray-800'>Revenue Trend</h3>
                  <p className='text-[11px] text-gray-500'>Monthly revenue over the last 6 months</p>
                </div>
                <Link href='/contractor-dashboard/invoices' className='text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1'>
                  View Details <ChevronRight className='h-3 w-3' />
                </Link>
              </div>
              <div className='h-[220px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={monthlyRevenueData}>
                    <defs>
                      <linearGradient id='revenueGrad' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#F59E0B' stopOpacity={0.3} />
                        <stop offset='95%' stopColor='#F59E0B' stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                    <XAxis dataKey='month' tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={formatYAxis} />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      formatter={formatRevenueTooltip}
                    />
                    <Area type='monotone' dataKey='revenue' stroke='#F59E0B' strokeWidth={2.5} fill='url(#revenueGrad)' />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Job Completion Donut — anyone with jobs.view */}
          {showJobs && (
            <div className={`${showRevenue ? '' : 'lg:col-span-3'} rounded-xl border border-gray-200 bg-white p-4 shadow-sm`}>
              <div className='mb-4'>
                <h3 className='text-sm font-bold text-gray-800'>Job Pipeline</h3>
                <p className='text-[11px] text-gray-500'>Current job status breakdown</p>
              </div>
              <div className='h-[160px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: stats.activeJobs || 0 },
                        { name: 'Completed', value: stats.completedJobsThisMonth || 0 },
                        { name: 'Quotes', value: stats.pendingQuotes || 0 },
                      ].filter(d => d.value > 0)}
                      cx='50%' cy='50%' innerRadius={45} outerRadius={70} paddingAngle={3} dataKey='value'
                    >
                      <Cell fill='#F59E0B' />
                      <Cell fill='#10B981' />
                      <Cell fill='#8B5CF6' />
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [`${v}`, n]} contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className='space-y-2 mt-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='h-2.5 w-2.5 rounded-full bg-amber-500' />
                    <span className='text-xs text-gray-700 font-medium'>Active Jobs</span>
                  </div>
                  <span className='text-xs font-bold text-gray-800'>{stats.activeJobs}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='h-2.5 w-2.5 rounded-full bg-emerald-500' />
                    <span className='text-xs text-gray-700 font-medium'>Completed</span>
                  </div>
                  <span className='text-xs font-bold text-gray-800'>{stats.completedJobsThisMonth}</span>
                </div>
                {showQuotes && (
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <div className='h-2.5 w-2.5 rounded-full bg-violet-500' />
                      <span className='text-xs text-gray-700 font-medium'>Pending Quotes</span>
                    </div>
                    <span className='text-xs font-bold text-gray-800'>{stats.pendingQuotes}</span>
                  </div>
                )}
                {showLeads && showJobs && (
                  <div className='pt-2 border-t border-gray-100'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-gray-500'>Conversion Rate</span>
                      <span className='text-sm font-bold text-gray-900'>{stats.conversionRate}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Financial Summary + Recent Jobs.
          Financial card hides for field roles; recent jobs shows whenever
          jobs.view is granted. */}
      {(showFinancialCard || showRecentJobs) && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Financial Summary */}
          {showFinancialCard && (
            <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-bold text-gray-800'>Financial Summary</h3>
                <Link href='/contractor-dashboard/invoices' className='text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1'>
                  Details <ChevronRight className='h-3 w-3' />
                </Link>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div className='p-3 rounded-lg bg-gray-50 border border-gray-100'>
                  <p className='text-[10px] text-gray-500 font-medium'>Revenue This Month</p>
                  <p className='text-base font-bold text-gray-900 mt-0.5'>{formatCurrency(stats.revenueMonth)}</p>
                </div>
                <div className='p-3 rounded-lg bg-emerald-50 border border-emerald-100'>
                  <p className='text-[10px] text-emerald-600 font-medium'>Revenue YTD</p>
                  <p className='text-base font-bold text-emerald-700 mt-0.5'>{formatCurrency(stats.revenueYear)}</p>
                </div>
                <div className='p-3 rounded-lg bg-amber-50 border border-amber-100'>
                  <p className='text-[10px] text-amber-600 font-medium'>Pending Quotes Value</p>
                  <p className='text-base font-bold text-amber-700 mt-0.5'>{stats.pendingQuotes} quotes</p>
                </div>
                <div className='p-3 rounded-lg bg-blue-50 border border-blue-100'>
                  <p className='text-[10px] text-blue-600 font-medium'>Jobs Completed</p>
                  <p className='text-base font-bold text-blue-700 mt-0.5'>{stats.completedJobsThisMonth} this month</p>
                </div>
              </div>
              <Link
                href='/contractor-dashboard/invoices'
                className='mt-3 flex items-center justify-center gap-1.5 text-xs text-white font-medium py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-md transition-all'
              >
                <DollarSign className='h-3.5 w-3.5' /> View Invoices
              </Link>
            </div>
          )}

          {/* Recent Jobs */}
          {showRecentJobs && (
            <div className={`${showFinancialCard ? '' : 'lg:col-span-2'} rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden`}>
              <div className='flex items-center justify-between p-4 border-b border-gray-100'>
                <div>
                  <h3 className='text-sm font-bold text-gray-800'>Recent Jobs</h3>
                  <p className='text-[11px] text-gray-500'>Latest job activity</p>
                </div>
                <Link href='/contractor-dashboard/jobs' className='text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1'>
                  View All <ChevronRight className='h-3 w-3' />
                </Link>
              </div>
              {recentJobs.length === 0 ? (
                <div className='p-8 text-center'>
                  <CheckCircle2 className='mx-auto h-8 w-8 text-green-300 mb-2' />
                  <p className='text-sm text-gray-500'>No jobs yet</p>
                  <p className='text-[11px] text-gray-400 mt-0.5'>Browse the marketplace to find work</p>
                </div>
              ) : (
                <div className='divide-y divide-gray-50'>
                  {recentJobs.slice(0, 5).map((job) => (
                    <Link
                      key={job.id}
                      href={`/contractor-dashboard/jobs/${job.id}`}
                      className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-600'
                        : job.status === 'in_progress' ? 'bg-amber-100 text-amber-600'
                        : 'bg-blue-100 text-blue-600'
                      }`}>
                        <Briefcase className='h-4 w-4' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-semibold text-gray-800 truncate'>{job.title}</p>
                        <p className='text-[10px] text-gray-500'>{job.customer?.name || 'No customer'}</p>
                      </div>
                      <StatusBadge status={job.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className='text-sm font-bold text-gray-800 mb-3'>Quick Actions</h3>
        <DashboardQuickActions />
      </div>

      {/* Recent Leads — only for users who can see leads */}
      {showRecentLeads && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Recent Leads</h3>
              <p className='text-[11px] text-gray-500'>Latest marketplace leads</p>
            </div>
            <Link href='/contractor-dashboard/leads' className='text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1'>
              View All <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className='p-8 text-center'>
              <TrendingUp className='mx-auto h-8 w-8 text-gray-300 mb-2' />
              <p className='text-sm text-gray-500'>No leads yet</p>
              <p className='text-[11px] text-gray-400 mt-0.5'>Leads will appear as property managers request work</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {recentLeads.map((match) => (
                <Link
                  key={match.id}
                  href={`/contractor-dashboard/leads/${match.lead.id}`}
                  className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    match.lead.priority === 'hot' ? 'bg-red-100 text-red-600'
                    : match.lead.priority === 'warm' ? 'bg-amber-100 text-amber-600'
                    : 'bg-blue-100 text-blue-600'
                  }`}>
                    <TrendingUp className='h-4 w-4' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800 truncate'>
                      {match.lead.projectTitle || match.lead.projectType}
                    </p>
                    <p className='text-[10px] text-gray-500'>
                      {match.lead.propertyCity}, {match.lead.propertyState}
                    </p>
                  </div>
                  <PriorityBadge priority={match.lead.priority} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Chart formatters
function formatYAxis(v: number): string {
  return v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v;
}

function formatRevenueTooltip(value: number, name: string): [string, string] {
  return ['$' + value.toLocaleString(), name === 'revenue' ? 'Revenue' : 'Jobs'];
}

// --- Sub-components ---

function KPICard({ title, value, subtitle, icon: Icon, gradient, href, alert }: {
  title: string; value: string; subtitle: string; icon: React.ElementType; gradient: string; href: string; alert?: boolean;
}) {
  return (
    <Link href={href} className='relative rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all overflow-hidden group'>
      <div className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`} />
      {alert && <div className='absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse' />}
      <div className='flex items-start justify-between'>
        <div className='space-y-1'>
          <p className='text-[10px] sm:text-xs text-gray-500 font-medium'>{title}</p>
          <p className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900'>{value}</p>
          <p className='text-[10px] text-gray-400'>{subtitle}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
          <Icon className='h-4 w-4' />
        </div>
      </div>
    </Link>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-0.5'>
      <div className='text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wide'>{label}</div>
      <div className='text-sm sm:text-base font-bold text-gray-800'>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Approved' },
    scheduled: { bg: 'bg-indigo-50', text: 'text-indigo-600', label: 'Scheduled' },
    in_progress: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'In Progress' },
    completed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Completed' },
    invoiced: { bg: 'bg-violet-50', text: 'text-violet-600', label: 'Invoiced' },
    paid: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Paid' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-600', label: 'Cancelled' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Pending' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Draft' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status.replace(/_/g, ' ') };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text} capitalize`}>{c.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    hot: { bg: 'bg-red-50', text: 'text-red-600' },
    warm: { bg: 'bg-amber-50', text: 'text-amber-600' },
    cold: { bg: 'bg-blue-50', text: 'text-blue-600' },
  };
  const c = config[priority] || { bg: 'bg-gray-100', text: 'text-gray-500' };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text} capitalize`}>{priority}</span>;
}
