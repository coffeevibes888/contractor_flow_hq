'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  Users, Building2, CreditCard, Mail, CheckCircle2,
  Clock, TrendingUp, Search, ExternalLink,
  AlertTriangle, Download, Eye, Send, Loader2, ChevronDown,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SignupRow {
  id:                 string;
  name:               string;
  email:              string;
  createdAt:          string;
  propertiesCount:    number;
  tenantsCount:       number;
  subscriptionStatus: string;
  subscriptionTier:   string;
  hasPaid:            boolean;
  daysLeft:           number | null;
  hasBankConnected:   boolean;
  sentDay1:           boolean;
  sentDay2:           boolean;
  sentDay7:           boolean;
  openedDay1:         boolean;
  openedDay2:         boolean;
  openedDay7:         boolean;
  bounced:            boolean;
  complained:         boolean;
}

interface Props {
  rows: SignupRow[];
  stats: {
    total:     number;
    active:    number;
    trialing:  number;
    thisMonth: number;
  };
}

type LifecycleType = 'day1_explainer' | 'day2_no_property' | 'day7_no_stripe' | 'day21_winback';

const EMAIL_OPTIONS: { value: LifecycleType; label: string }[] = [
  { value: 'day1_explainer',   label: 'D1 — Automation explainer' },
  { value: 'day2_no_property', label: 'D2 — No property nudge' },
  { value: 'day7_no_stripe',   label: 'D7 — Connect bank account' },
  { value: 'day21_winback',    label: 'D21 — Win-back / reactivate' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(row: SignupRow) {
  if (row.hasPaid)
    return <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300'>Paid</span>;
  if (row.subscriptionStatus === 'trialing' && (row.daysLeft ?? 0) > 0)
    return <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300'>Trial · {row.daysLeft}d</span>;
  if (row.subscriptionStatus === 'past_due')
    return <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300'>Past Due</span>;
  if (row.subscriptionStatus === 'canceled')
    return <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300'>Canceled</span>;
  return <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400'>{row.subscriptionStatus}</span>;
}

function EmailDot({ sent, opened, label }: { sent: boolean; opened: boolean; label: string }) {
  if (!sent) return (
    <span title={`${label}: not sent`} className='inline-flex items-center gap-0.5 text-xs text-slate-600'>
      <span className='h-2 w-2 rounded-full bg-slate-700' />
      {label}
    </span>
  );
  if (opened) return (
    <span title={`${label}: opened ✓`} className='inline-flex items-center gap-0.5 text-xs text-emerald-400 font-semibold'>
      <Eye className='h-3 w-3' />
      {label}
    </span>
  );
  return (
    <span title={`${label}: sent, not opened`} className='inline-flex items-center gap-0.5 text-xs text-amber-400'>
      <Mail className='h-3 w-3' />
      {label}
    </span>
  );
}

function ActivationDots({ row }: { row: SignupRow }) {
  const steps = [
    { done: row.propertiesCount > 0, label: 'Prop',   icon: Building2 },
    { done: row.tenantsCount > 0,    label: 'Tenant', icon: Users },
    { done: row.hasBankConnected,    label: 'Bank',   icon: CreditCard },
  ];
  return (
    <div className='flex items-center gap-1.5'>
      {steps.map(({ done, label, icon: Icon }) => (
        <span key={label} title={`${label}: ${done ? 'done' : 'pending'}`}
          className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${
            done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-500'
          }`}>
          <Icon className='h-3 w-3' />
          {label}
        </span>
      ))}
    </div>
  );
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (d === 0) return 'today';
  if (d === 1) return '1d ago';
  return `${d}d ago`;
}

// ── Per-row manual send button ────────────────────────────────────────────────

function SendEmailButton({ landlordId, name }: { landlordId: string; name: string }) {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState<LifecycleType>('day1_explainer');
  const [status, setStatus]     = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg]     = useState('');
  const [, startTransition]     = useTransition();

  const fire = () => {
    setStatus('sending');
    setErrMsg('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/super-admin/send-lifecycle-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landlordId, emailType: selected }),
        });
        const json = await res.json();
        if (!res.ok) {
          setErrMsg(json.error ?? 'Send failed');
          setStatus('err');
        } else {
          setStatus('ok');
          setTimeout(() => { setStatus('idle'); setOpen(false); }, 2500);
        }
      } catch {
        setErrMsg('Network error');
        setStatus('err');
      }
    });
  };

  return (
    <div className='relative'>
      <button
        onClick={() => setOpen((o) => !o)}
        className='inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border border-violet-500/20 transition-colors'
      >
        <Send className='h-3 w-3' />
        Send
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className='absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl bg-slate-800 border border-white/10 shadow-2xl p-3 space-y-2'>
          <p className='text-xs font-semibold text-slate-300 truncate'>Send to {name}</p>

          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as LifecycleType)}
            className='w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500'
          >
            {EMAIL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {status === 'err' && (
            <p className='text-xs text-red-400 bg-red-500/10 rounded-lg px-2.5 py-1.5'>{errMsg}</p>
          )}
          {status === 'ok' && (
            <p className='text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1'>
              <CheckCircle2 className='h-3 w-3' /> Sent successfully
            </p>
          )}

          <div className='flex gap-2'>
            <button
              onClick={fire}
              disabled={status === 'sending'}
              className='flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold transition-colors'
            >
              {status === 'sending'
                ? <><Loader2 className='h-3 w-3 animate-spin' /> Sending…</>
                : <><Send className='h-3 w-3' /> Send now</>
              }
            </button>
            <button
              onClick={() => setOpen(false)}
              className='px-3 py-2 rounded-lg border border-white/10 text-slate-400 text-xs hover:text-white transition-colors'
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SignupsCrmClient({ rows, stats }: Props) {
  const [search,           setSearch]       = useState('');
  const [statusFilter,     setStatusFilter] = useState('all');
  const [activationFilter, setActivFilter]  = useState('all');

  const filtered = useMemo(() => rows.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
    }
    if (statusFilter === 'paid'     && !r.hasPaid) return false;
    if (statusFilter === 'trialing' && (r.hasPaid || r.subscriptionStatus !== 'trialing')) return false;
    if (statusFilter === 'bounced'  && !r.bounced) return false;
    if (activationFilter === 'no_property' && r.propertiesCount > 0) return false;
    if (activationFilter === 'no_tenant'   && r.tenantsCount    > 0) return false;
    if (activationFilter === 'no_bank'     && r.hasBankConnected)     return false;
    if (activationFilter === 'full'        && !(r.propertiesCount > 0 && r.tenantsCount > 0 && r.hasBankConnected)) return false;
    return true;
  }), [rows, search, statusFilter, activationFilter]);

  function exportCsv() {
    const header = ['Name','Email','Signed Up','Properties','Tenants','Status','Trial Days Left','Bank','D1 Sent','D1 Opened','D2 Sent','D2 Opened','D7 Sent','D7 Opened','Bounced'];
    const body = filtered.map((r) => [
      r.name, r.email, new Date(r.createdAt).toLocaleDateString(),
      r.propertiesCount, r.tenantsCount, r.subscriptionStatus,
      r.daysLeft ?? '', r.hasBankConnected ? 'yes' : 'no',
      r.sentDay1 ? 'yes' : 'no', r.openedDay1 ? 'yes' : 'no',
      r.sentDay2 ? 'yes' : 'no', r.openedDay2 ? 'yes' : 'no',
      r.sentDay7 ? 'yes' : 'no', r.openedDay7 ? 'yes' : 'no',
      r.bounced ? 'yes' : 'no',
    ].join(','));
    const blob = new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className='space-y-6'>

      {/* Header */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-white'>Signups CRM</h1>
          <p className='text-sm text-slate-400 mt-1'>
            Every landlord signup — activation status, emails sent, open tracking
          </p>
        </div>
        <button onClick={exportCsv}
          className='flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors'>
          <Download className='h-4 w-4' /> Export CSV
        </button>
      </div>

      {/* KPI strip */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {[
          { label: 'Total Signups', value: stats.total,     color: 'from-cyan-600 to-blue-600',     icon: Users },
          { label: 'Paying',        value: stats.active,    color: 'from-emerald-600 to-green-600', icon: CreditCard },
          { label: 'On Trial',      value: stats.trialing,  color: 'from-violet-600 to-purple-600', icon: Clock },
          { label: 'New (30 days)', value: stats.thisMonth, color: 'from-amber-600 to-orange-600',  icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-xl bg-gradient-to-br ${color} p-4`}>
            <div className='flex items-center gap-2 text-white/80 mb-1'>
              <Icon className='h-4 w-4' />
              <span className='text-xs font-medium'>{label}</span>
            </div>
            <p className='text-2xl font-bold text-white'>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-3'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
          <input
            placeholder='Search name or email…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/20'
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className='bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white'>
          <option value='all'>All statuses</option>
          <option value='paid'>Paying</option>
          <option value='trialing'>Trialing</option>
          <option value='bounced'>Bounced email</option>
        </select>
        <select value={activationFilter} onChange={(e) => setActivFilter(e.target.value)}
          className='bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white'>
          <option value='all'>All activation</option>
          <option value='no_property'>No property yet</option>
          <option value='no_tenant'>No tenant yet</option>
          <option value='no_bank'>No bank connected</option>
          <option value='full'>Fully activated</option>
        </select>
      </div>

      {/* Table */}
      <div className='rounded-xl border border-white/10 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-white/10 bg-slate-900/40'>
              {['Landlord','Signed up','Activation','Status','Emails sent / opened','Actions'].map((h) => (
                <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-white/5'>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className='px-4 py-10 text-center text-slate-500'>No signups match these filters</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id} className='hover:bg-white/[0.02] transition-colors'>

                {/* Landlord */}
                <td className='px-4 py-3'>
                  <p className='font-semibold text-white truncate max-w-[180px]'>{row.name}</p>
                  <p className='text-xs text-slate-400 truncate max-w-[180px]'>{row.email}</p>
                  {row.bounced    && <span className='inline-flex items-center gap-1 text-xs text-red-400 mt-0.5'><AlertTriangle className='h-3 w-3' /> bounced</span>}
                  {row.complained && <span className='inline-flex items-center gap-1 text-xs text-red-400 mt-0.5'><AlertTriangle className='h-3 w-3' /> spam report</span>}
                </td>

                {/* Signed up */}
                <td className='px-4 py-3 text-slate-300 whitespace-nowrap'>
                  <p>{daysAgo(row.createdAt)}</p>
                  <p className='text-xs text-slate-500'>{new Date(row.createdAt).toLocaleDateString()}</p>
                </td>

                {/* Activation */}
                <td className='px-4 py-3'>
                  <ActivationDots row={row} />
                  <p className='text-xs text-slate-500 mt-1'>
                    {row.propertiesCount} prop · {row.tenantsCount} tenant{row.tenantsCount !== 1 ? 's' : ''}
                  </p>
                </td>

                {/* Status */}
                <td className='px-4 py-3'>
                  {statusBadge(row)}
                  <p className='text-xs text-slate-500 mt-1'>{row.subscriptionTier}</p>
                </td>

                {/* Email tracking */}
                <td className='px-4 py-3'>
                  <div className='flex flex-col gap-1'>
                    <EmailDot sent={row.sentDay1} opened={row.openedDay1} label='D1' />
                    <EmailDot sent={row.sentDay2} opened={row.openedDay2} label='D2' />
                    <EmailDot sent={row.sentDay7} opened={row.openedDay7} label='D7' />
                  </div>
                </td>

                {/* Actions */}
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    {!row.hasPaid && (
                      <SendEmailButton landlordId={row.id} name={row.name} />
                    )}
                    <a
                      href={`/admin/overview?impersonate=${row.id}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1 text-xs text-slate-400 hover:text-violet-300 transition-colors'
                    >
                      <ExternalLink className='h-3.5 w-3.5' />
                      View
                    </a>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className='flex flex-wrap items-center gap-4 text-xs text-slate-500'>
        <span className='flex items-center gap-1'><Eye className='h-3 w-3 text-emerald-400' /> opened</span>
        <span className='flex items-center gap-1'><Mail className='h-3 w-3 text-amber-400' /> sent, not opened</span>
        <span className='flex items-center gap-1'><span className='h-2 w-2 rounded-full bg-slate-700' /> not sent</span>
        <span className='ml-auto'>{filtered.length} of {rows.length} signups</span>
      </div>

    </div>
  );
}
