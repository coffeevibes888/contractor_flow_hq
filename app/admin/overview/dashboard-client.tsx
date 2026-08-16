'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import {
  Building2, Users, FileText, Wrench, DollarSign, Wallet,
  MessageCircle, TrendingUp, ArrowUpRight, ArrowDownRight,
  ChevronRight, Calendar, AlertTriangle, CheckCircle2, Clock,
  Home, ClipboardList, Shield, Plus, ExternalLink, Copy, Share2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import ShareListingCard from '@/components/admin/share-listing-card';
import ShareContractorCard from '@/components/admin/share-contractor-card';
import SetupWizardStrip, { type SetupWizardStep } from '@/components/admin/setup-wizard-strip';
import InviteTenantDialog from '@/components/admin/invite-tenant-dialog';

interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  propertiesCount: number;
  tenantsCount: number;
  applicationsCount: number;
  ticketsCount: number;
  urgentTickets: number;
  openTickets: number;
  messagesCount: number;
  rentCollectedThisMonth: number;
  rentCollectedYtd: number;
  scheduledRentMonthly: number;
  collectionRate: number;
  availableBalance: number;
  leasesExpiringSoon: number;
}

interface RecentLease {
  id: string;
  status: string;
  rentAmount: number;
  startDate: string;
  createdAt: string;
  tenant: { name: string | null } | null;
  unit: { name: string; property: { name: string } | null } | null;
}

interface RecentApplication {
  id: string;
  fullName: string | null;
  status: string;
  createdAt: string;
  unit: { name: string; property: { name: string } | null } | null;
}

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  tenant: { name: string | null } | null;
}

interface DashboardClientProps {
  stats: DashboardStats;
  recentLeases: RecentLease[];
  recentApplications: RecentApplication[];
  recentTickets: RecentTicket[];
  expiringLeases: { id: string; endDate: string; rentAmount: number; tenant: { name: string | null } | null; unit: { name: string; property: { name: string } | null } | null }[];
  monthlyRentData: { month: string; collected: number; scheduled: number }[];
  listingUrl: string;
  contractorUrl: string;
  landlordName: string;
  isAdmin: boolean;
  wizardSteps?: SetupWizardStep[];
  trialDaysLeft?: number;
  isTrialing?: boolean;
  tenantInviteInfo?: { inviteCode: string; tenantStartUrl: string; landlordEmail: string } | null;
}

export default function DashboardClient({
  stats,
  recentLeases,
  recentApplications,
  recentTickets,
  expiringLeases,
  monthlyRentData,
  listingUrl,
  contractorUrl,
  landlordName,
  isAdmin,
  wizardSteps,
  trialDaysLeft = 0,
  isTrialing = false,
  tenantInviteInfo,
}: DashboardClientProps) {
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);

  const handleCopy = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>
            Property Dashboard
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage your properties, tenants, and operations
          </p>
        </div>
      </div>

      {/* Setup Wizard Strip — shown until all 3 activation steps are done */}
      {wizardSteps && (
        <SetupWizardStrip
          steps={wizardSteps}
          trialDaysLeft={trialDaysLeft}
          isTrialing={isTrialing}
          onInviteTenant={tenantInviteInfo ? () => setInviteDialogOpen(true) : undefined}
        />
      )}

      {/* Invite Tenant Dialog */}
      {tenantInviteInfo && (
        <InviteTenantDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          tenantStartUrl={tenantInviteInfo.tenantStartUrl}
          inviteCode={tenantInviteInfo.inviteCode}
          landlordEmail={tenantInviteInfo.landlordEmail}
        />
      )}

      {/* Share Links Bar */}
      <div className='flex flex-wrap gap-2'>
        {listingUrl && (
          <ShareListingCard listingUrl={listingUrl} landlordName={landlordName} />
        )}
        <ShareContractorCard contractorUrl={contractorUrl} landlordName={landlordName} />
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <KPICard
          title='Rent Collected'
          value={formatCurrency(stats.rentCollectedThisMonth)}
          subtitle={`${stats.collectionRate}% of scheduled`}
          icon={DollarSign}
          gradient='from-emerald-400 to-cyan-400'
          href='/admin/revenue'
        />
        <KPICard
          title='Occupancy Rate'
          value={`${stats.occupancyRate}%`}
          subtitle={`${stats.occupiedUnits} of ${stats.totalUnits} units`}
          icon={Building2}
          gradient='from-blue-400 to-indigo-400'
          href='/admin/dashboard/properties'
        />
        <KPICard
          title='Open Tickets'
          value={String(stats.openTickets)}
          subtitle={`${stats.urgentTickets} urgent`}
          icon={Wrench}
          gradient='from-violet-400 to-purple-400'
          href='/admin/maintenance'
          alert={stats.urgentTickets > 0}
        />
        <KPICard
          title='Applications'
          value={String(stats.applicationsCount)}
          subtitle='Review pending'
          icon={FileText}
          gradient='from-amber-400 to-orange-400'
          href='/admin/applications'
        />
      </div>

      {/* Summary Bar */}
      <div className='relative rounded-xl border border-gray-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 overflow-hidden'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-200/30 to-transparent rounded-bl-full' />
        <div className='relative p-4'>
          <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4'>
            <SummaryItem label='Properties' value={String(stats.propertiesCount)} />
            <SummaryItem label='Total Units' value={String(stats.totalUnits)} />
            <SummaryItem label='Tenants' value={String(stats.tenantsCount)} />
            <SummaryItem label='Vacant Units' value={String(stats.vacantUnits)} />
            <SummaryItem label='Rent (YTD)' value={formatCurrency(stats.rentCollectedYtd)} />
            <SummaryItem label='Available Balance' value={formatCurrency(stats.availableBalance)} />
          </div>
        </div>
      </div>

      {/* Alerts Banner */}
      {(stats.urgentTickets > 0 || stats.leasesExpiringSoon > 0) && (
        <div className='flex flex-wrap gap-2'>
          {stats.urgentTickets > 0 && (
            <Link
              href='/admin/maintenance'
              className='flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors'
            >
              <AlertTriangle className='h-3.5 w-3.5' />
              {stats.urgentTickets} urgent maintenance {stats.urgentTickets === 1 ? 'ticket' : 'tickets'}
              <ChevronRight className='h-3 w-3' />
            </Link>
          )}
          {stats.leasesExpiringSoon > 0 && (
            <Link
              href='/admin/leases'
              className='flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors'
            >
              <Calendar className='h-3.5 w-3.5' />
              {stats.leasesExpiringSoon} {stats.leasesExpiringSoon === 1 ? 'lease expires' : 'leases expire'} within 60 days
              <ChevronRight className='h-3 w-3' />
            </Link>
          )}
        </div>
      )}


      {/* Charts Row */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Rent Collection Trend */}
        <div className='lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Rent Collection</h3>
              <p className='text-[11px] text-gray-500'>Monthly collected vs scheduled rent</p>
            </div>
            <Link href='/admin/revenue' className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'>
              View Details <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          <div className='h-[220px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={monthlyRentData}>
                <defs>
                  <linearGradient id='pmCollectedGrad' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#06B6D4' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#06B6D4' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                <XAxis dataKey='month' tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={formatYAxis} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }} formatter={formatTooltip} />
                <Area type='monotone' dataKey='scheduled' stroke='#D1D5DB' strokeWidth={1.5} fill='none' strokeDasharray='4 4' />
                <Area type='monotone' dataKey='collected' stroke='#06B6D4' strokeWidth={2.5} fill='url(#pmCollectedGrad)' />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Donut */}
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='mb-4'>
            <h3 className='text-sm font-bold text-gray-800'>Occupancy</h3>
            <p className='text-[11px] text-gray-500'>Unit breakdown</p>
          </div>
          <div className='h-[160px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Occupied', value: stats.occupiedUnits || 0 },
                    { name: 'Vacant', value: stats.vacantUnits || 0 },
                  ].filter(d => d.value > 0)}
                  cx='50%' cy='50%' innerRadius={45} outerRadius={70} paddingAngle={3} dataKey='value'
                >
                  <Cell fill='#06B6D4' />
                  <Cell fill='#E5E7EB' />
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [`${v} units`, n]} contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className='space-y-2 mt-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='h-2.5 w-2.5 rounded-full bg-cyan-500' />
                <span className='text-xs text-gray-700 font-medium'>Occupied</span>
              </div>
              <span className='text-xs font-bold text-gray-800'>{stats.occupiedUnits} units</span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='h-2.5 w-2.5 rounded-full bg-gray-300' />
                <span className='text-xs text-gray-700 font-medium'>Vacant</span>
              </div>
              <span className='text-xs font-bold text-gray-800'>{stats.vacantUnits} units</span>
            </div>
            <div className='pt-2 border-t border-gray-100'>
              <div className='flex items-center justify-between'>
                <span className='text-xs text-gray-500'>Occupancy Rate</span>
                <span className='text-sm font-bold text-gray-900'>{stats.occupancyRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Financials + Expiring Leases */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Financial Summary */}
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-sm font-bold text-gray-800'>Financial Summary</h3>
            <Link href='/admin/revenue' className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'>
              Details <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='p-3 rounded-lg bg-gray-50 border border-gray-100'>
              <p className='text-[10px] text-gray-500 font-medium'>Scheduled Rent</p>
              <p className='text-base font-bold text-gray-900 mt-0.5'>{formatCurrency(stats.scheduledRentMonthly)}</p>
            </div>
            <div className='p-3 rounded-lg bg-emerald-50 border border-emerald-100'>
              <p className='text-[10px] text-emerald-600 font-medium'>Collected This Month</p>
              <p className='text-base font-bold text-emerald-700 mt-0.5'>{formatCurrency(stats.rentCollectedThisMonth)}</p>
            </div>
            <div className='p-3 rounded-lg bg-blue-50 border border-blue-100'>
              <p className='text-[10px] text-blue-600 font-medium'>Collected YTD</p>
              <p className='text-base font-bold text-blue-700 mt-0.5'>{formatCurrency(stats.rentCollectedYtd)}</p>
            </div>
            <div className='p-3 rounded-lg bg-cyan-50 border border-cyan-100'>
              <p className='text-[10px] text-cyan-600 font-medium'>Available to Cash Out</p>
              <p className='text-base font-bold text-cyan-700 mt-0.5'>{formatCurrency(stats.availableBalance)}</p>
            </div>
          </div>
          <Link
            href='/admin/payouts'
            className='mt-3 flex items-center justify-center gap-1.5 text-xs text-white font-medium py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-md transition-all'
          >
            <Wallet className='h-3.5 w-3.5' /> Cash Out
          </Link>
        </div>

        {/* Expiring Leases */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Upcoming Lease Expirations</h3>
              <p className='text-[11px] text-gray-500'>Leases ending in the next 90 days</p>
            </div>
            <Link href='/admin/leases' className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'>
              View All <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          {expiringLeases.length === 0 ? (
            <div className='p-8 text-center'>
              <CheckCircle2 className='mx-auto h-8 w-8 text-green-300 mb-2' />
              <p className='text-sm text-gray-500'>No leases expiring soon</p>
              <p className='text-[11px] text-gray-400 mt-0.5'>All active leases are in good standing</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {expiringLeases.map((lease) => {
                const daysLeft = Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysLeft <= 30;
                return (
                  <Link
                    key={lease.id}
                    href={'/admin/leases/' + lease.id}
                    className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'
                  >
                    <div className={'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ' + (isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600')}>
                      <Calendar className='h-4 w-4' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>
                        {lease.tenant?.name || 'Tenant'}
                      </p>
                      <p className='text-[10px] text-gray-500'>
                        {lease.unit?.property?.name} · {lease.unit?.name}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xs font-bold text-gray-800'>{formatCurrency(lease.rentAmount)}/mo</p>
                      <p className={'text-[10px] font-semibold ' + (isUrgent ? 'text-red-600' : 'text-amber-600')}>
                        {daysLeft} days left
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Chart formatters
function formatYAxis(v: number): string {
  return v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v;
}

function formatTooltip(value: number, name: string): [string, string] {
  return ['$' + value.toLocaleString(), name === 'collected' ? 'Collected' : 'Scheduled'];
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
    active: { bg: 'bg-green-50', text: 'text-green-600', label: 'Active' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Pending' },
    approved: { bg: 'bg-green-50', text: 'text-green-600', label: 'Approved' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', label: 'Rejected' },
    denied: { bg: 'bg-red-50', text: 'text-red-600', label: 'Denied' },
    open: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Open' },
    in_progress: { bg: 'bg-violet-50', text: 'text-violet-600', label: 'In Progress' },
    completed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Completed' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Expired' },
    terminated: { bg: 'bg-red-50', text: 'text-red-600', label: 'Terminated' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Draft' },
    signed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Signed' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status.replace(/_/g, ' ') };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text} capitalize`}>{c.label}</span>;
}
