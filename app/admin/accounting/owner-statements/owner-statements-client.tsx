'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Lock, Crown, Loader2, RefreshCw, Plus, CheckCheck, X, Mail, FileDown, FileText } from 'lucide-react';
import Link from 'next/link';
import { fmtCurrency, fmtDate } from '../_components/format';
import AccountingHelp from '../_components/accounting-help';

interface Owner {
  id: string;
  name: string;
  email: string | null;
  payoutSplit: number;
}

interface OwnerStatement {
  id: string;
  ownerId: string;
  periodStart: string;
  periodEnd: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  managementFeePct: number;
  managementFee: number;
  distribution: number;
  status: 'draft' | 'finalized' | 'sent';
  generatedAt: string;
  finalizedAt: string | null;
  emailSentAt: string | null;
  owner: { id: string; name: string; email: string | null; payoutSplit: number };
}

interface ApiResponse {
  statements: OwnerStatement[];
  owners: Owner[];
}

const statusBadge: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700',
  finalized: 'bg-sky-100 text-sky-700',
  sent: 'bg-emerald-100 text-emerald-700',
};

export default function OwnerStatementsClient({ landlordId }: { landlordId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<{ message: string; requiredTier: 'pro' | 'enterprise' } | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreateOwner, setShowCreateOwner] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounting/owner-statements?landlordId=${landlordId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        if (json?.code === 'TIER_LOCKED') {
          setLocked({ message: json.message, requiredTier: json.requiredTier });
        } else {
          setError(json?.message ?? 'Failed to load statements');
        }
        return;
      }
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => { load(); }, [load]);

  const action = async (payload: Record<string, unknown>, id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/accounting/owner-statements`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.message ?? 'Action failed');
      } else {
        if (payload.action === 'send' && json?.meta?.recipients) {
          alert(`Statement emailed to ${json.meta.recipients.join(', ')}`);
        }
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  if (locked) {
    return (
      <div className='max-w-lg mx-auto mt-20 text-center space-y-5'>
        <div className='mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center'>
          <Lock className='h-8 w-8 text-amber-400' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-black'>Owner Statements</h1>
          <p className='text-sm text-gray-500 mt-1'>{locked.message}</p>
        </div>
        <div className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold'>
          <Crown className='h-4 w-4' />
          Requires {locked.requiredTier === 'enterprise' ? 'Enterprise' : 'Pro'} plan
        </div>
        <div>
          <Link href='/admin/overview?upgrade=1' className='text-sm text-sky-600 hover:underline'>Upgrade your plan →</Link>
        </div>
      </div>
    );
  }

  return (
    <main className='w-full'>
      <div className='max-w-7xl space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'>
          <div>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Owner Statements</h1>
            <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Generate a monthly report for each property owner showing their share of income, expenses, and the distribution they get.</p>
          </div>
          <div className='flex gap-2'>
            <Link
              href='/admin/accounting/owners'
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50'
            >
              Manage Owners
            </Link>
            <button
              type='button'
              onClick={() => setShowCreateOwner(true)}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50'
            >
              <Plus className='h-3.5 w-3.5' />
              New Owner
            </button>
            <button
              type='button'
              onClick={() => setShowGenerate(true)}
              disabled={!data?.owners?.length}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 disabled:opacity-50'
            >
              <Plus className='h-3.5 w-3.5' />
              Generate Statement
            </button>
            <button
              type='button'
              onClick={load}
              disabled={loading}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50'
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <AccountingHelp
          block={{
            summary: 'A monthly report you send to each property owner with their share of the income, expenses, and distribution.',
            whatItShows: 'For a date range, the system pulls every income and expense for the owner (based on the properties they own), subtracts your management fee, and arrives at the distribution they get. The PDF or CSV can be emailed straight to the owner with a secure download link.',
            whenToUse: 'Generate these once a month, after the books for the month have settled. Most landlords run them on the 1st or 2nd of the next month and email them the same day.',
            tips: [
              'A statement goes through three states: Draft (you can still edit), Finalized (numbers are locked), Sent (emailed to the owner with a 90-day download link).',
              'You can adjust the default 8% management fee per owner in the owners page, or per-property in the property settings.',
              'Owners can download the PDF without logging in — the link is signed and expires in 90 days. No more "can you re-send the PDF" emails.',
            ],
          }}
        />

        {error ? (
          <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>
        ) : loading ? (
          <div className='flex items-center justify-center py-20 text-gray-400'>
            <Loader2 className='h-6 w-6 animate-spin mr-2' /> Loading…
          </div>
        ) : (
          <>
            {/* Owner roster */}
            <section className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
              <div className='px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between'>
                <h2 className='text-sm font-semibold'>Owners</h2>
                <span className='text-xs text-gray-500'>{data?.owners.length ?? 0} active</span>
              </div>
              {!data?.owners?.length ? (
                <div className='px-4 py-8 text-sm text-gray-500 text-center'>
                  No owners yet. Click <strong>New Owner</strong> to add one.
                </div>
              ) : (
                <table className='w-full text-sm'>
                  <thead className='text-xs text-gray-500 uppercase tracking-wide'>
                    <tr>
                      <th className='text-left px-4 py-2'>Name</th>
                      <th className='text-left px-4 py-2'>Email</th>
                      <th className='text-right px-4 py-2'>Payout %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.owners.map((o) => (
                      <tr key={o.id} className='border-t border-gray-100'>
                        <td className='px-4 py-2 font-medium'>{o.name}</td>
                        <td className='px-4 py-2 text-gray-600'>{o.email ?? '—'}</td>
                        <td className='px-4 py-2 text-right tabular-nums'>{Number(o.payoutSplit).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Statements list */}
            <section className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
              <div className='px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between'>
                <h2 className='text-sm font-semibold'>Statements</h2>
                <span className='text-xs text-gray-500'>{data?.statements.length ?? 0} total</span>
              </div>
              {!data?.statements?.length ? (
                <div className='px-4 py-8 text-sm text-gray-500 text-center'>
                  No statements generated yet.
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead className='text-xs text-gray-500 uppercase tracking-wide'>
                      <tr>
                        <th className='text-left px-4 py-2'>Owner</th>
                        <th className='text-left px-4 py-2'>Period</th>
                        <th className='text-right px-4 py-2'>Income</th>
                        <th className='text-right px-4 py-2'>Expense</th>
                        <th className='text-right px-4 py-2'>Net</th>
                        <th className='text-right px-4 py-2'>Mgmt Fee</th>
                        <th className='text-right px-4 py-2'>Distribution</th>
                        <th className='text-left px-4 py-2'>Status</th>
                        <th className='text-right px-4 py-2'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.statements.map((s) => (
                        <tr key={s.id} className='border-t border-gray-100 hover:bg-gray-50/50'>
                          <td className='px-4 py-2 font-medium'>{s.owner.name}</td>
                          <td className='px-4 py-2 text-gray-600 text-xs'>{fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}</td>
                          <td className='px-4 py-2 text-right tabular-nums text-emerald-700'>{fmtCurrency(s.totalIncome)}</td>
                          <td className='px-4 py-2 text-right tabular-nums text-red-600'>{fmtCurrency(s.totalExpense)}</td>
                          <td className='px-4 py-2 text-right tabular-nums font-medium'>{fmtCurrency(s.netIncome)}</td>
                          <td className='px-4 py-2 text-right tabular-nums text-gray-600'>{fmtCurrency(s.managementFee)} <span className='text-xs text-gray-400'>({Number(s.managementFeePct).toFixed(0)}%)</span></td>
                          <td className='px-4 py-2 text-right tabular-nums font-bold'>{fmtCurrency(s.distribution)}</td>
                          <td className='px-4 py-2'>
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${statusBadge[s.status]}`}>{s.status}</span>
                          </td>
                          <td className='px-4 py-2'>
                            <div className='flex items-center justify-end gap-1'>
                              <a
                                href={`/api/admin/accounting/owner-statements/${s.id}/pdf`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50'
                                title='View PDF'
                              >
                                <FileText className='h-3 w-3' /> PDF
                              </a>
                              <a
                                href={`/api/admin/accounting/owner-statements/${s.id}/csv`}
                                className='inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50'
                                title='Download CSV'
                              >
                                <FileDown className='h-3 w-3' /> CSV
                              </a>
                              {s.status === 'draft' && (
                                <button
                                  type='button'
                                  onClick={() => action({ landlordId, statementId: s.id, action: 'finalize' }, s.id)}
                                  disabled={busy === s.id}
                                  className='inline-flex items-center gap-1 px-2 py-1 text-xs bg-sky-50 text-sky-700 border border-sky-200 rounded hover:bg-sky-100 disabled:opacity-50'
                                  title='Finalize (lock numbers)'
                                >
                                  <CheckCheck className='h-3 w-3' /> Finalize
                                </button>
                              )}
                              {s.status === 'finalized' && (
                                <button
                                  type='button'
                                  onClick={() => action({ landlordId, statementId: s.id, action: 'send' }, s.id)}
                                  disabled={busy === s.id || !s.owner.email}
                                  className='inline-flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50'
                                  title={s.owner.email ? 'Email this statement to the owner' : 'Add an email to the owner first'}
                                >
                                  <Mail className='h-3 w-3' /> Send
                                </button>
                              )}
                              {s.status === 'sent' && (
                                <span className='inline-flex items-center gap-1 px-2 py-1 text-xs text-emerald-700' title={s.emailSentAt ? `Sent ${fmtDate(s.emailSentAt)}` : ''}>
                                  <Mail className='h-3 w-3' /> Sent
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {showGenerate && data?.owners && (
          <GenerateStatementDialog
            owners={data.owners}
            landlordId={landlordId}
            onClose={() => setShowGenerate(false)}
            onDone={async () => { setShowGenerate(false); await load(); }}
          />
        )}

        {showCreateOwner && (
          <CreateOwnerDialog
            landlordId={landlordId}
            onClose={() => setShowCreateOwner(false)}
            onDone={async () => { setShowCreateOwner(false); await load(); }}
          />
        )}
      </div>
    </main>
  );
}

function GenerateStatementDialog({ owners, landlordId, onClose, onDone }: {
  owners: Owner[];
  landlordId: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? '');
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!ownerId) { setErr('Pick an owner'); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/accounting/owner-statements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          landlordId, ownerId,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          action: 'generate',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.message ?? 'Failed');
        return;
      }
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} title='Generate Owner Statement'>
      <div className='space-y-4'>
        <div>
          <label className='text-xs font-medium text-gray-600'>Owner</label>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name} {o.email ? `(${o.email})` : ''}</option>
            ))}
          </select>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='text-xs font-medium text-gray-600'>Period Start</label>
            <input type='date' value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm' />
          </div>
          <div>
            <label className='text-xs font-medium text-gray-600'>Period End</label>
            <input type='date' value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm' />
          </div>
        </div>
        {err && <p className='text-sm text-red-600'>{err}</p>}
        <div className='flex justify-end gap-2 pt-2'>
          <button type='button' onClick={onClose} className='px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg'>Cancel</button>
          <button type='button' onClick={submit} disabled={busy} className='px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50'>
            {busy ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateOwnerDialog({ landlordId, onClose, onDone }: {
  landlordId: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutSplit, setPayoutSplit] = useState(100);
  const [payoutMethod, setPayoutMethod] = useState<'ach' | 'check' | 'hold'>('ach');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name) { setErr('Name is required'); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/accounting/owners', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          landlordId, name,
          email: email || undefined,
          phone: phone || undefined,
          payoutSplit,
          payoutMethod,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json?.message ?? 'Failed'); return; }
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} title='New Owner'>
      <div className='space-y-4'>
        <div>
          <label className='text-xs font-medium text-gray-600'>Name *</label>
          <input type='text' value={name} onChange={(e) => setName(e.target.value)} className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm' />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='text-xs font-medium text-gray-600'>Email</label>
            <input type='email' value={email} onChange={(e) => setEmail(e.target.value)} className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm' />
          </div>
          <div>
            <label className='text-xs font-medium text-gray-600'>Phone</label>
            <input type='tel' value={phone} onChange={(e) => setPhone(e.target.value)} className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm' />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='text-xs font-medium text-gray-600'>Payout Split %</label>
            <input type='number' min={0} max={100} step='0.01' value={payoutSplit} onChange={(e) => setPayoutSplit(Number(e.target.value))} className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm' />
          </div>
          <div>
            <label className='text-xs font-medium text-gray-600'>Payout Method</label>
            <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as 'ach' | 'check' | 'hold')} className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'>
              <option value='ach'>ACH</option>
              <option value='check'>Check</option>
              <option value='hold'>Hold</option>
            </select>
          </div>
        </div>
        {err && <p className='text-sm text-red-600'>{err}</p>}
        <div className='flex justify-end gap-2 pt-2'>
          <button type='button' onClick={onClose} className='px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg'>Cancel</button>
          <button type='button' onClick={submit} disabled={busy} className='px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50'>
            {busy ? 'Creating…' : 'Create Owner'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40' onClick={onClose}>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-md' onClick={(e) => e.stopPropagation()}>
        <div className='flex items-center justify-between px-5 py-3 border-b border-gray-200'>
          <h2 className='text-base font-semibold'>{title}</h2>
          <button type='button' onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <X className='h-5 w-5' />
          </button>
        </div>
        <div className='p-5'>{children}</div>
      </div>
    </div>
  );
}
