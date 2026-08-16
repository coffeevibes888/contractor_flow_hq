'use client';

/**
 * Treasury Payroll panel — the new payroll execution layer that sits
 * INSIDE the existing payroll-page (we don't replace the legacy
 * processor; this lives next to it). Renders three sub-sections:
 *   1. Plan-locked card if access.level === 'none'
 *   2. "Payroll Ready" banner (Enterprise only) — on-demand check
 *   3. Approved unpaid timesheets list with Pay Now button
 *   4. Payroll history with $600 1099 badge + CSV export (Enterprise)
 */

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  Inbox,
  Wallet,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { PayrollLockedCard } from './payroll-locked-card';
import { PayNowModal } from './pay-now-modal';
import { TeamMemberPayrollSettings } from './team-member-payroll-settings';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json())?.error || 'failed');
  return res.json();
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface AccessResponse {
  level: 'none' | 'basic' | 'full';
  tier: 'starter' | 'pro' | 'enterprise';
  isOwner: boolean;
}

interface DueResponse {
  due: Array<{
    teamMemberId: string;
    teamMemberName: string;
    paySchedule: string;
    paySchedulePayDate: string | null;
    pendingTimesheets: number;
    pendingHours: number;
  }>;
}

interface HistoryRow {
  id: string;
  teamMemberId: string;
  teamMember: string;
  teamMemberEmail: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  regularHours: number | null;
  overtimeHours: number | null;
  hourlyRate: number;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: string;
  treasuryStatus: string | null;
  paidAt: string | null;
  ytdTotal: number;
  ten99Required: boolean;
}

interface ApprovedTsRow {
  id: string;
  teamMemberId: string;
  teamMemberName: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  hourlyRate: number;
  walletReady: boolean;
}

interface Props {
  approvedTimesheets: ApprovedTsRow[];
  teamMembers: Array<{
    id: string;
    name: string;
    hourlyRate: number | null;
    paySchedule: string | null;
    paySchedulePayDate: string | null;
    treasuryOnboardingStatus: string | null;
    treasuryEnabled: boolean;
  }>;
  ytdByMember: Record<string, number>;
}

export function TreasuryPayrollPanel({
  approvedTimesheets,
  teamMembers,
  ytdByMember,
}: Props) {
  const { data: access, isLoading: accessLoading } = useSWR<AccessResponse>(
    '/api/payroll/access',
    fetcher,
    { revalidateOnFocus: false }
  );

  if (accessLoading || !access) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-6 animate-pulse'>
        <div className='h-4 w-1/3 bg-slate-100 rounded' />
        <div className='mt-4 h-32 w-full bg-slate-100 rounded-xl' />
      </div>
    );
  }

  if (access.level === 'none') {
    return <PayrollLockedCard currentTier={access.tier} />;
  }

  return (
    <div className='space-y-5'>
      {access.level === 'full' && <PayrollReadyBanner />}

      <Tabs defaultValue='ready' className='w-full'>
        <TabsList>
          <TabsTrigger value='ready'>Ready to pay</TabsTrigger>
          <TabsTrigger value='settings'>Team settings</TabsTrigger>
          <TabsTrigger value='history'>History</TabsTrigger>
        </TabsList>

        <TabsContent value='ready' className='mt-4'>
          <ReadyToPayList
            rows={approvedTimesheets}
            level={access.level}
          />
        </TabsContent>

        <TabsContent value='settings' className='mt-4'>
          <TeamMemberPayrollSettings
            members={teamMembers}
            level={access.level}
            ytdByMember={ytdByMember}
          />
        </TabsContent>

        <TabsContent value='history' className='mt-4'>
          <PayrollHistory level={access.level} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────

function PayrollReadyBanner() {
  // 1-hour cache via SWR — matches the spec's caching directive.
  const { data } = useSWR<DueResponse>(
    '/api/payroll/check-due',
    fetcher,
    { dedupingInterval: 3_600_000, revalidateOnFocus: false }
  );

  if (!data?.due?.length) return null;

  const total = data.due.reduce((s, d) => s + d.pendingHours, 0);
  return (
    <div className='rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5 flex items-start gap-3'>
      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 shrink-0'>
        <Clock className='h-5 w-5' />
      </div>
      <div className='flex-1'>
        <div className='text-sm font-semibold text-slate-900'>
          Payroll ready for {data.due.length} team{' '}
          {data.due.length === 1 ? 'member' : 'members'}
        </div>
        <div className='text-xs text-slate-600 mt-0.5'>
          {total.toFixed(1)} approved hours waiting. Review and confirm each
          payment below.
        </div>
        <ul className='mt-2 text-[12px] text-slate-700 space-y-0.5'>
          {data.due.slice(0, 3).map((d) => (
            <li key={d.teamMemberId}>
              <span className='font-medium'>{d.teamMemberName}</span> —{' '}
              {d.pendingTimesheets} timesheet
              {d.pendingTimesheets === 1 ? '' : 's'} · {d.pendingHours.toFixed(1)} hrs
            </li>
          ))}
          {data.due.length > 3 && (
            <li className='text-slate-500'>+ {data.due.length - 3} more</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function ReadyToPayList({
  rows,
  level,
}: {
  rows: ApprovedTsRow[];
  level: 'basic' | 'full';
}) {
  const [active, setActive] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white py-14 px-6 text-center'>
        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600 mb-3'>
          <Inbox className='h-5 w-5' />
        </div>
        <h4 className='text-sm font-semibold text-slate-900'>
          No timesheets waiting
        </h4>
        <p className='mt-1 text-xs text-slate-500 max-w-md mx-auto'>
          When a team member submits a timesheet and you approve it, it will
          show up here ready for one-click payment.
        </p>
      </div>
    );
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white overflow-hidden'>
      <ul className='divide-y divide-slate-100'>
        {rows.map((r) => {
          const gross = r.totalHours * (r.hourlyRate || 0);
          const overSpec =
            level === 'basic' && r.totalHours > 40 ? true : false;
          return (
            <li key={r.id} className='flex flex-wrap items-center gap-3 p-4'>
              <div className='flex-1 min-w-[180px]'>
                <div className='text-sm font-medium text-slate-900'>
                  {r.teamMemberName}
                </div>
                <div className='text-[11px] text-slate-500 mt-0.5'>
                  {new Date(r.periodStart).toLocaleDateString()} –{' '}
                  {new Date(r.periodEnd).toLocaleDateString()} ·{' '}
                  {r.totalHours.toFixed(2)} hrs
                  {overSpec && (
                    <Badge
                      variant='secondary'
                      className='ml-2 bg-amber-100 text-amber-800 border-amber-200 border text-[10px]'
                    >
                      Over 40h
                    </Badge>
                  )}
                </div>
              </div>
              <div className='text-right'>
                <div className='text-sm font-semibold tabular-nums text-slate-900'>
                  ~{usd.format(gross)}
                </div>
                <div className='text-[11px] text-slate-500'>
                  ${r.hourlyRate?.toFixed(2) || '0.00'}/hr
                </div>
              </div>
              <Button
                size='sm'
                onClick={() => setActive(r.id)}
                disabled={!r.hourlyRate || !r.walletReady}
                className='bg-sky-600 hover:bg-sky-700'
              >
                <Banknote className='h-4 w-4 mr-1.5' />
                Pay Now
              </Button>
              {(!r.hourlyRate || !r.walletReady) && (
                <div className='basis-full text-[11px] text-amber-700 flex items-center gap-1.5'>
                  <AlertTriangle className='h-3.5 w-3.5' />
                  {!r.hourlyRate
                    ? 'Set an hourly rate before paying.'
                    : "Team member hasn't completed payment setup."}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <PayNowModal
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        timesheetId={active}
        onPaid={() => {
          setActive(null);
          // Re-fetch the parent on next mount; simplest cross-component
          // refresh strategy without coupling SWR keys here.
          window.location.reload();
        }}
      />
    </div>
  );
}

function PayrollHistory({ level }: { level: 'basic' | 'full' }) {
  const { data, isLoading, error } = useSWR<{
    payments: HistoryRow[];
  }>('/api/payroll/history', fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-6 animate-pulse'>
        <div className='h-3 w-1/4 bg-slate-100 rounded' />
        <div className='mt-4 space-y-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='h-10 bg-slate-100 rounded' />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800'>
        {(error as Error).message}
      </div>
    );
  }

  const rows = data?.payments ?? [];
  const flagged = new Set(
    rows.filter((r) => r.ten99Required).map((r) => r.teamMemberId)
  );

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-sm font-semibold text-slate-900'>
            Payroll history
          </h3>
          <p className='text-xs text-slate-500'>
            Posted payments only. Pending payments don&apos;t count toward 1099.
          </p>
        </div>
        {level === 'full' && (
          <a href='/api/payroll/history?format=csv' download>
            <Button variant='outline' size='sm'>
              <Download className='h-4 w-4 mr-1.5' />
              Export CSV
            </Button>
          </a>
        )}
      </div>

      {rows.length === 0 ? (
        <div className='rounded-2xl border border-slate-200 bg-white py-12 px-6 text-center text-sm text-slate-500'>
          No payments yet.
        </div>
      ) : (
        <div className='rounded-2xl border border-slate-200 bg-white overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500'>
              <tr>
                <th className='text-left p-3'>Team member</th>
                <th className='text-left p-3'>Period</th>
                <th className='text-right p-3'>Hours</th>
                <th className='text-right p-3'>Rate</th>
                <th className='text-right p-3'>Gross</th>
                <th className='text-right p-3'>Net</th>
                <th className='text-left p-3'>Status</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className='p-3'>
                    <div className='font-medium text-slate-900'>
                      {r.teamMember}
                    </div>
                    {flagged.has(r.teamMemberId) && (
                      <Badge
                        variant='secondary'
                        className='mt-1 text-[10px] bg-amber-100 text-amber-800 border-amber-200 border'
                      >
                        1099 Required ({usd.format(r.ytdTotal)} YTD)
                      </Badge>
                    )}
                    {r.teamMemberEmail && (
                      <div className='text-[11px] text-slate-500'>
                        {r.teamMemberEmail}
                      </div>
                    )}
                  </td>
                  <td className='p-3 text-slate-700 text-[12px]'>
                    {r.periodStart && r.periodEnd
                      ? `${new Date(r.periodStart).toLocaleDateString()} – ${new Date(r.periodEnd).toLocaleDateString()}`
                      : '—'}
                  </td>
                  <td className='p-3 text-right tabular-nums'>
                    {r.regularHours !== null
                      ? r.regularHours.toFixed(2)
                      : '—'}
                    {r.overtimeHours && r.overtimeHours > 0 && (
                      <div className='text-[10px] text-amber-700'>
                        +{r.overtimeHours.toFixed(2)} OT
                      </div>
                    )}
                  </td>
                  <td className='p-3 text-right tabular-nums'>
                    ${r.hourlyRate.toFixed(2)}
                  </td>
                  <td className='p-3 text-right tabular-nums'>
                    {usd.format(r.grossAmount)}
                  </td>
                  <td className='p-3 text-right tabular-nums font-semibold text-emerald-700'>
                    {usd.format(r.netAmount)}
                  </td>
                  <td className='p-3'>
                    <StatusPill status={r.treasuryStatus ?? r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string; icon?: any }> = {
    posted: {
      label: 'Posted',
      classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
    },
    completed: {
      label: 'Posted',
      classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
    },
    pending: {
      label: 'Pending',
      classes: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Loader2,
    },
    processing: {
      label: 'Processing',
      classes: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Loader2,
    },
    failed: {
      label: 'Failed',
      classes: 'bg-rose-100 text-rose-800 border-rose-200',
    },
  };
  const cfg = map[status] ?? {
    label: status,
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const Icon = cfg.icon;
  return (
    <Badge variant='secondary' className={`${cfg.classes} border text-[10px]`}>
      {Icon && (
        <Icon
          className={`h-2.5 w-2.5 mr-0.5 ${status === 'pending' || status === 'processing' ? 'animate-spin' : ''}`}
        />
      )}
      {cfg.label}
    </Badge>
  );
}
