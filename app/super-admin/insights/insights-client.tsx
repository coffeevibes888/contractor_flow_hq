'use client';

import { useState } from 'react';
import {
  ShieldAlert,
  Banknote,
  TrendingUp,
  Activity,
  Lock,
  AlertTriangle,
  Plane,
  KeyRound,
  Globe,
  Users,
  CircleDot,
} from 'lucide-react';

type SecurityMetrics = {
  failedLogins24h: number;
  failedLogins7d: number;
  successfulLogins24h: number;
  rateLimited24h: number;
  topFailedIps: Array<{ ip: string | null; count: number }>;
  topFailedEmails: Array<{ email: string | null; count: number }>;
  newCountryLogins: Array<{ userId: string; email: string | null; country: string; at: string }>;
  impossibleTravel: Array<{
    userId: string;
    email: string | null;
    from: { country: string; at: string };
    to: { country: string; at: string };
    distanceKm: number;
    hoursBetween: number;
    impliedSpeedKmh: number;
  }>;
  mfa: {
    totalUsers: number;
    mfaUsers: number;
    adoptionPct: number;
    adminUsers: number;
    mfaAdminUsers: number;
    adminAdoptionPct: number;
  };
  recentFailedAttempts: Array<{
    id: string;
    email: string | null;
    ipAddress: string | null;
    country: string | null;
    reason: string | null;
    createdAt: string;
  }>;
};

type FinanceMetrics = {
  statusBreakdown: Array<{ status: string; count: number }>;
  trialingCount: number;
  pastDueCount: number;
  canceledLast30d: number;
  logoChurnPct: number;
  churnDeltaPct: number;
  trialConversionPct: number;
  longPastDue: Array<{
    id: string;
    name: string;
    subdomain: string;
    subscriptionTier: string | null;
    updatedAt: string;
  }>;
  activeNow: number;
};

type GrowthMetrics = {
  totalVisitors: number;
  newVisitors30d: number;
  returningVisitors30d: number;
  returningPct: number;
  attributionBySource: Array<{ source: string; count: number }>;
  topLandingPages: Array<{ path: string; count: number }>;
  recentSignups7d: number;
};

type ReliabilityMetrics = {
  jobs: Array<{
    jobName: string;
    status: string;
    lastRun: string;
    durationMs: number | null;
    error: string | null;
  }>;
  staleJobs: Array<{ jobName: string; lastRun: string; status: string }>;
  failedRuns24h: number;
  runsByJob24h: Array<{ jobName: string; status: string; count: number }>;
  webhooks: {
    total24h: number;
    failures24h: number;
    signatureInvalid24h: number;
    failureRate24h: number;
  };
};

type PiiSummary = {
  byActor: Array<{
    actor: { id: string; email: string | null; name: string | null; role: string | null };
    count: number;
  }>;
  recent: Array<{
    id: string;
    actorUserId: string;
    subjectUserId: string | null;
    resourceType: string;
    resourceId: string | null;
    reason: string | null;
    createdAt: string;
  }>;
};

const tabs = [
  { id: 'security', label: 'Security', icon: ShieldAlert },
  { id: 'finance', label: 'Finance', icon: Banknote },
  { id: 'growth', label: 'Growth', icon: TrendingUp },
  { id: 'reliability', label: 'Reliability', icon: Activity },
  { id: 'pii', label: 'PII Access', icon: Lock },
] as const;

type TabId = (typeof tabs)[number]['id'];

function Stat({
  label,
  value,
  subtext,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: 'default' | 'ok' | 'warn' | 'danger';
}) {
  const toneClass = {
    default: 'bg-slate-900/60 border-white/10',
    ok: 'bg-emerald-950/40 border-emerald-800/40',
    warn: 'bg-amber-950/40 border-amber-800/40',
    danger: 'bg-red-950/40 border-red-800/40',
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className='text-[11px] uppercase tracking-wider text-slate-400'>{label}</p>
      <p className='mt-1 text-2xl font-bold text-white break-words'>{value}</p>
      {subtext && <p className='mt-1 text-xs text-slate-400'>{subtext}</p>}
    </div>
  );
}

function Section({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section className='space-y-3'>
      <h2 className='text-base md:text-lg font-semibold text-white flex items-center gap-2'>
        {Icon && <Icon className='h-4 w-4 md:h-5 md:w-5' />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyRow({ text, colSpan = 2 }: { text: string; colSpan?: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className='px-3 py-4 text-sm text-slate-500'>
        {text}
      </td>
    </tr>
  );
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function humanDuration(ms: number | null | undefined) {
  if (!ms || ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab panels
// ─────────────────────────────────────────────────────────────────────────────

function SecurityTab({ data }: { data: SecurityMetrics }) {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <Stat
          label='Failed Logins (24h)'
          value={data.failedLogins24h}
          subtext={`${data.failedLogins7d} over last 7d`}
          tone={data.failedLogins24h > 50 ? 'danger' : data.failedLogins24h > 10 ? 'warn' : 'default'}
        />
        <Stat label='Successful Logins (24h)' value={data.successfulLogins24h} />
        <Stat
          label='Rate-Limited (24h)'
          value={data.rateLimited24h}
          tone={data.rateLimited24h > 0 ? 'warn' : 'default'}
        />
        <Stat
          label='MFA Adoption'
          value={`${data.mfa.adoptionPct}%`}
          subtext={`${data.mfa.mfaUsers} / ${data.mfa.totalUsers} users`}
          tone={data.mfa.adoptionPct < 20 ? 'warn' : 'ok'}
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Stat
          label='Admin MFA Adoption'
          value={`${data.mfa.adminAdoptionPct}%`}
          subtext={`${data.mfa.mfaAdminUsers} / ${data.mfa.adminUsers} admins — should be 100%`}
          tone={data.mfa.adminAdoptionPct < 100 ? 'danger' : 'ok'}
        />
        <Stat
          label='Impossible Travel (48h)'
          value={data.impossibleTravel.length}
          subtext='Logins that would require > 900 km/h travel'
          tone={data.impossibleTravel.length > 0 ? 'danger' : 'ok'}
        />
      </div>

      <Section title='Top attacking IPs (7d)' icon={Globe}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>IP</th>
                <th className='px-3 py-2 font-medium text-right'>Failed Attempts</th>
              </tr>
            </thead>
            <tbody>
              {data.topFailedIps.length === 0 ? (
                <EmptyRow text='No failed logins in the window. 👍' />
              ) : (
                data.topFailedIps.map((r) => (
                  <tr key={r.ip ?? 'unknown'} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-white font-mono text-xs break-all'>{r.ip ?? 'unknown'}</td>
                    <td className='px-3 py-2 text-right text-slate-300'>{r.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title='Impossible travel alerts' icon={Plane}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>User</th>
                <th className='px-3 py-2 font-medium'>From → To</th>
                <th className='px-3 py-2 font-medium text-right'>Gap</th>
                <th className='px-3 py-2 font-medium text-right'>Speed</th>
              </tr>
            </thead>
            <tbody>
              {data.impossibleTravel.length === 0 ? (
                <EmptyRow text='None detected.' colSpan={4} />
              ) : (
                data.impossibleTravel.map((r, i) => (
                  <tr key={i} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-white break-all'>{r.email ?? r.userId.slice(0, 8)}</td>
                    <td className='px-3 py-2 text-slate-300'>
                      {r.from.country} → {r.to.country}
                    </td>
                    <td className='px-3 py-2 text-right text-slate-300'>{r.hoursBetween}h</td>
                    <td className='px-3 py-2 text-right text-red-300'>{r.impliedSpeedKmh} km/h</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title='New-country logins (7d)' icon={KeyRound}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>User</th>
                <th className='px-3 py-2 font-medium'>Country</th>
                <th className='px-3 py-2 font-medium'>When</th>
              </tr>
            </thead>
            <tbody>
              {data.newCountryLogins.length === 0 ? (
                <EmptyRow text='No new-country signins.' colSpan={3} />
              ) : (
                data.newCountryLogins.map((r, i) => (
                  <tr key={i} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-white break-all'>{r.email ?? r.userId.slice(0, 8)}</td>
                    <td className='px-3 py-2 text-slate-300'>{r.country}</td>
                    <td className='px-3 py-2 text-slate-400 text-xs'>{formatDateTime(r.at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title='Recent failed attempts' icon={AlertTriangle}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>Email</th>
                <th className='px-3 py-2 font-medium'>IP</th>
                <th className='px-3 py-2 font-medium'>Country</th>
                <th className='px-3 py-2 font-medium'>Reason</th>
                <th className='px-3 py-2 font-medium'>When</th>
              </tr>
            </thead>
            <tbody>
              {data.recentFailedAttempts.length === 0 ? (
                <EmptyRow text='No failures in the last 24h.' colSpan={5} />
              ) : (
                data.recentFailedAttempts.map((r) => (
                  <tr key={r.id} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-white break-all'>{r.email ?? '—'}</td>
                    <td className='px-3 py-2 text-slate-300 font-mono text-xs break-all'>{r.ipAddress ?? '—'}</td>
                    <td className='px-3 py-2 text-slate-300'>{r.country ?? '—'}</td>
                    <td className='px-3 py-2 text-slate-300'>{r.reason ?? '—'}</td>
                    <td className='px-3 py-2 text-slate-400 text-xs'>{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function FinanceTab({ data }: { data: FinanceMetrics }) {
  const churnTone = data.logoChurnPct > 5 ? 'danger' : data.logoChurnPct > 2 ? 'warn' : 'ok';
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <Stat label='Active Subs' value={data.activeNow} />
        <Stat label='Trialing' value={data.trialingCount} />
        <Stat
          label='Past Due'
          value={data.pastDueCount}
          tone={data.pastDueCount > 0 ? 'warn' : 'ok'}
        />
        <Stat
          label='Logo Churn (30d)'
          value={`${data.logoChurnPct}%`}
          subtext={`${data.canceledLast30d} canceled`}
          tone={churnTone as any}
        />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        <Stat
          label='Trial → Paid (30d)'
          value={`${data.trialConversionPct}%`}
          tone={data.trialConversionPct < 20 ? 'warn' : 'ok'}
        />
        <Stat
          label='Churn Δ vs Prior 30d'
          value={`${data.churnDeltaPct >= 0 ? '+' : ''}${data.churnDeltaPct}%`}
          tone={data.churnDeltaPct > 0 ? 'warn' : 'ok'}
        />
      </div>

      <Section title='Subscription status breakdown' icon={CircleDot}>
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'>
          {data.statusBreakdown.length === 0 ? (
            <p className='text-sm text-slate-500 col-span-full'>No data.</p>
          ) : (
            data.statusBreakdown.map((r) => (
              <Stat key={r.status} label={r.status} value={r.count} />
            ))
          )}
        </div>
      </Section>

      <Section title='Long past-due (> 14 days)' icon={AlertTriangle}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>Landlord</th>
                <th className='px-3 py-2 font-medium'>Tier</th>
                <th className='px-3 py-2 font-medium'>Since</th>
              </tr>
            </thead>
            <tbody>
              {data.longPastDue.length === 0 ? (
                <EmptyRow text='No long past-due accounts.' colSpan={3} />
              ) : (
                data.longPastDue.map((r) => (
                  <tr key={r.id} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-white'>
                      <div>{r.name}</div>
                      <div className='text-xs text-slate-400'>{r.subdomain}</div>
                    </td>
                    <td className='px-3 py-2 text-slate-300'>{r.subscriptionTier ?? '—'}</td>
                    <td className='px-3 py-2 text-slate-400 text-xs'>{formatDateTime(r.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function GrowthTab({ data }: { data: GrowthMetrics }) {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <Stat label='Total Visitors' value={data.totalVisitors} />
        <Stat label='New (30d)' value={data.newVisitors30d} />
        <Stat
          label='Returning (30d)'
          value={data.returningVisitors30d}
          subtext={`${data.returningPct}% of active`}
        />
        <Stat label='Signups (7d)' value={data.recentSignups7d} />
      </div>

      <Section title='First-touch attribution' icon={TrendingUp}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>Source</th>
                <th className='px-3 py-2 font-medium text-right'>New Visitors</th>
              </tr>
            </thead>
            <tbody>
              {data.attributionBySource.length === 0 ? (
                <EmptyRow text='No attribution data yet.' />
              ) : (
                data.attributionBySource.map((r) => (
                  <tr key={r.source} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-white'>{r.source}</td>
                    <td className='px-3 py-2 text-right text-slate-300'>{r.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title='Top landing pages' icon={Users}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>Path</th>
                <th className='px-3 py-2 font-medium text-right'>First-visit count</th>
              </tr>
            </thead>
            <tbody>
              {data.topLandingPages.length === 0 ? (
                <EmptyRow text='No data yet.' />
              ) : (
                data.topLandingPages.map((r) => (
                  <tr key={r.path} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-white break-all'>{r.path}</td>
                    <td className='px-3 py-2 text-right text-slate-300'>{r.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function ReliabilityTab({ data }: { data: ReliabilityMetrics }) {
  const webhookTone =
    data.webhooks.failureRate24h > 5 ? 'danger' : data.webhooks.failureRate24h > 1 ? 'warn' : 'ok';
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <Stat
          label='Failed Cron Runs (24h)'
          value={data.failedRuns24h}
          tone={data.failedRuns24h > 0 ? 'danger' : 'ok'}
        />
        <Stat
          label='Stale Jobs'
          value={data.staleJobs.length}
          subtext='No success in > 24h'
          tone={data.staleJobs.length > 0 ? 'warn' : 'ok'}
        />
        <Stat label='Webhooks Received (24h)' value={data.webhooks.total24h} />
        <Stat
          label='Webhook Failure Rate'
          value={`${data.webhooks.failureRate24h}%`}
          subtext={`${data.webhooks.failures24h} failed, ${data.webhooks.signatureInvalid24h} bad signature`}
          tone={webhookTone as any}
        />
      </div>

      <Section title='Cron jobs — latest run' icon={Activity}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>Job</th>
                <th className='px-3 py-2 font-medium'>Status</th>
                <th className='px-3 py-2 font-medium'>Last Run</th>
                <th className='px-3 py-2 font-medium text-right'>Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.length === 0 ? (
                <EmptyRow
                  text='No cron runs recorded yet. Wrap jobs with withCronLog() to populate this.'
                  colSpan={4}
                />
              ) : (
                data.jobs.map((j) => (
                  <tr key={j.jobName} className='border-t border-white/5 align-top'>
                    <td className='px-3 py-2 text-white font-mono text-xs'>{j.jobName}</td>
                    <td className='px-3 py-2'>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          j.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : j.status === 'failure'
                            ? 'bg-red-500/20 text-red-300'
                            : j.status === 'running'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}
                      >
                        {j.status}
                      </span>
                      {j.error && (
                        <p className='mt-1 text-[11px] text-red-300/80 break-words'>{j.error}</p>
                      )}
                    </td>
                    <td className='px-3 py-2 text-slate-400 text-xs'>{formatDateTime(j.lastRun)}</td>
                    <td className='px-3 py-2 text-right text-slate-300'>{humanDuration(j.durationMs)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function PiiTab({ data }: { data: PiiSummary }) {
  return (
    <div className='space-y-6'>
      <Section title='PII access by admin (7d)' icon={Users}>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>Admin</th>
                <th className='px-3 py-2 font-medium'>Role</th>
                <th className='px-3 py-2 font-medium text-right'>PII views</th>
              </tr>
            </thead>
            <tbody>
              {data.byActor.length === 0 ? (
                <EmptyRow
                  text='No PII access logged yet. Call logPIIAccess() from admin routes that render sensitive data.'
                  colSpan={3}
                />
              ) : (
                data.byActor.map((r, i) => (
                  <tr key={i} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-white break-all'>
                      {r.actor.email ?? r.actor.name ?? r.actor.id.slice(0, 8)}
                    </td>
                    <td className='px-3 py-2 text-slate-300'>{r.actor.role ?? '—'}</td>
                    <td className='px-3 py-2 text-right text-slate-300'>{r.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title='Recent PII access events'>
        <div className='overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400 text-left'>
              <tr>
                <th className='px-3 py-2 font-medium'>When</th>
                <th className='px-3 py-2 font-medium'>Resource</th>
                <th className='px-3 py-2 font-medium'>Resource ID</th>
                <th className='px-3 py-2 font-medium'>Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 ? (
                <EmptyRow text='No recent events.' colSpan={4} />
              ) : (
                data.recent.map((r) => (
                  <tr key={r.id} className='border-t border-white/5'>
                    <td className='px-3 py-2 text-slate-400 text-xs'>{formatDateTime(r.createdAt)}</td>
                    <td className='px-3 py-2 text-white'>{r.resourceType}</td>
                    <td className='px-3 py-2 text-slate-300 font-mono text-xs break-all'>
                      {r.resourceId ?? '—'}
                    </td>
                    <td className='px-3 py-2 text-slate-300'>{r.reason ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  security: SecurityMetrics;
  finance: FinanceMetrics;
  growth: GrowthMetrics;
  reliability: ReliabilityMetrics;
  pii: PiiSummary;
}

export default function InsightsClient({ security, finance, growth, reliability, pii }: Props) {
  const [active, setActive] = useState<TabId>('security');

  return (
    <div className='min-h-screen bg-blue-700 text-white'>
      <div className='max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6'>
        <header className='space-y-1'>
          <h1 className='text-2xl md:text-3xl font-bold'>Operational Insights</h1>
          <p className='text-sm text-white/70'>
            Security, finance, growth, and reliability at a glance.
          </p>
        </header>

        {/* Tabs — horizontally scrollable on mobile so they never overflow the viewport */}
        <div className='-mx-4 px-4 overflow-x-auto'>
          <div className='inline-flex gap-1 bg-slate-900/60 border border-white/10 rounded-xl p-1 min-w-max'>
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                    isActive
                      ? 'bg-white/20 text-white font-semibold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className='h-4 w-4' />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {active === 'security' && <SecurityTab data={security} />}
        {active === 'finance' && <FinanceTab data={finance} />}
        {active === 'growth' && <GrowthTab data={growth} />}
        {active === 'reliability' && <ReliabilityTab data={reliability} />}
        {active === 'pii' && <PiiTab data={pii} />}
      </div>
    </div>
  );
}
