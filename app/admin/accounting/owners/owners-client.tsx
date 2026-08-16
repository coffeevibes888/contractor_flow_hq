'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Lock, Crown, Loader2, Plus, X, RefreshCw, Edit2, Home, Percent } from 'lucide-react';
import Link from 'next/link';
import AccountingHelp from '../_components/accounting-help';

interface Owner {
  id: string;
  name: string;
  email: string | null;
  payoutSplit: number;
  payoutMethod: string;
  isActive: boolean;
  properties: Array<{
    propertyId: string;
    ownershipPct: number;
    effectiveFrom: string;
  }>;
}

interface Property {
  id: string;
  name: string;
  address: any;
  unitCount: number;
  ownerships: Array<{ ownerId: string; ownerName: string; ownershipPct: number; isActive: boolean }>;
  totalOwnershipPct: number;
}

const fmtAddr = (a: any): string => {
  if (!a) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'object') {
    const parts = [a.street, a.city, a.state, a.zip].filter(Boolean);
    return parts.join(', ');
  }
  return '';
};

export default function OwnersClient({ landlordId }: { landlordId: string }) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<{ message: string; requiredTier: 'pro' | 'enterprise' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Owner | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounting/owners?landlordId=${landlordId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        if (json?.code === 'TIER_LOCKED') {
          setLocked({ message: json.message, requiredTier: json.requiredTier });
        } else {
          setError(json?.message ?? 'Failed to load owners');
        }
        return;
      }
      setOwners(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => { load(); }, [load]);

  if (locked) {
    return (
      <div className='max-w-lg mx-auto mt-20 text-center space-y-5'>
        <div className='mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center'>
          <Lock className='h-8 w-8 text-amber-400' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-black'>Owners</h1>
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
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Property Owners</h1>
            <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
              Add the people who own your properties and decide what % of each one they get.
            </p>
          </div>
          <div className='flex gap-2'>
            <Link
              href='/admin/accounting/owner-statements'
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50'
            >
              View Statements
            </Link>
            <button
              type='button'
              onClick={() => setShowCreate(true)}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700'
            >
              <Plus className='h-3.5 w-3.5' />
              New Owner
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
            summary: 'Add the people who own your properties and decide what % of each one they get.',
            whatItShows: 'A list of every property owner you manage for. For each one, you can see their contact info, the default payout split %, and which properties they own. Click "Edit properties" on a card to assign ownership percentages to specific properties.',
            whenToUse: 'Set this up once at the start, then revisit it any time ownership changes (e.g., a partner buys in, you transfer a property to an LLC, etc.). The ownership % feeds directly into owner statements — change the % here and the next statement uses the new number.',
            tips: [
              'Use the same % across all properties for an owner who is the sole owner of their portfolio, or different %s for joint owners.',
              'A 100% payout split is the default; lower it for any owner who takes a smaller share (common with silent partners or syndications).',
              'You can also set a per-property ownership % by clicking "Edit properties" on the card. The system warns you if total ownership goes over 100% for a property.',
            ],
          }}
        />

        {error ? (
          <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>
        ) : loading ? (
          <div className='flex items-center justify-center py-20 text-gray-400'>
            <Loader2 className='h-6 w-6 animate-spin mr-2' /> Loading…
          </div>
        ) : !owners.length ? (
          <div className='bg-white border border-gray-200 rounded-lg p-10 text-center'>
            <Home className='h-10 w-10 text-gray-300 mx-auto mb-3' />
            <h2 className='text-sm font-semibold text-gray-700'>No owners yet</h2>
            <p className='text-xs text-gray-500 mt-1 max-w-md mx-auto'>
              Add a property owner to start generating monthly distribution statements. Most landlords start with one owner (themselves) at 100%.
            </p>
            <button
              type='button'
              onClick={() => setShowCreate(true)}
              className='inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700'
            >
              <Plus className='h-3.5 w-3.5' />
              Add First Owner
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {owners.map((o) => (
              <div key={o.id} className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
                <div className='px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-2'>
                  <div>
                    <h2 className='text-sm font-semibold text-gray-900'>{o.name}</h2>
                    {o.email && <p className='text-xs text-gray-500'>{o.email}</p>}
                    <p className='text-[11px] text-gray-500 mt-0.5'>
                      Payout: <span className='font-medium text-gray-700'>{Number(o.payoutSplit).toFixed(0)}%</span> via <span className='uppercase tracking-wide'>{o.payoutMethod}</span>
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setEditing(o)}
                    className='text-sky-600 hover:text-sky-700 p-1 rounded hover:bg-sky-50'
                    title='Edit properties'
                  >
                    <Edit2 className='h-3.5 w-3.5' />
                  </button>
                </div>
                <div className='px-4 py-3'>
                  {o.properties.length === 0 ? (
                    <p className='text-xs text-gray-500 italic'>Not linked to any properties yet. Click edit to assign.</p>
                  ) : (
                    <ul className='space-y-1.5'>
                      {o.properties.map((p) => (
                        <li key={p.propertyId + p.effectiveFrom.toString()} className='flex items-center justify-between text-xs'>
                          <span className='text-gray-700'>{p.propertyId.slice(0, 8)}…</span>
                          <span className='inline-flex items-center gap-1 text-gray-600'>
                            <Percent className='h-3 w-3' />
                            {p.ownershipPct.toFixed(2)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreate && (
          <CreateOwnerDialog landlordId={landlordId} onClose={() => setShowCreate(false)} onDone={async () => { setShowCreate(false); await load(); }} />
        )}

        {editing && (
          <EditPropertiesDialog
            owner={editing}
            landlordId={landlordId}
            onClose={() => setEditing(null)}
            onDone={async () => { setEditing(null); await load(); }}
          />
        )}
      </div>
    </main>
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
        body: JSON.stringify({ landlordId, name, email: email || undefined, phone: phone || undefined, payoutSplit, payoutMethod }),
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
    <Modal onClose={onClose} title='New Property Owner'>
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

function EditPropertiesDialog({ owner, landlordId, onClose, onDone }: {
  owner: Owner;
  landlordId: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Map<string, number>>(() => {
    // Seed from current links
    const m = new Map<string, number>();
    for (const p of owner.properties) m.set(p.propertyId, p.ownershipPct);
    return m;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/accounting/properties?landlordId=${landlordId}`, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled) setProperties(json.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [landlordId]);

  const toggle = (propertyId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.set(propertyId, 100);
      return next;
    });
  };

  const setPct = (propertyId: string, pct: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(propertyId, pct);
      return next;
    });
  };

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const links = Array.from(selected.entries()).map(([propertyId, ownershipPct]) => ({ propertyId, ownershipPct }));
      const res = await fetch(`/api/admin/accounting/owners/${owner.id}/properties`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ landlordId, links }),
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

  // For each property, compute the *new* total ownership across all owners
  // after this edit, so the UI can warn if total > 100%.
  const newTotals = new Map<string, number>();
  for (const p of properties) {
    let total = 0;
    for (const o of p.ownerships) {
      if (o.ownerId === owner.id) {
        const newPct = selected.get(p.id);
        total += newPct ?? 0; // treat absent as 0 (we're removing the link)
      } else {
        total += o.ownershipPct;
      }
    }
    newTotals.set(p.id, total);
  }

  return (
    <Modal onClose={onClose} title={`Edit Properties — ${owner.name}`} wide>
      {loading ? (
        <div className='flex items-center justify-center py-10 text-gray-400'>
          <Loader2 className='h-5 w-5 animate-spin mr-2' /> Loading properties…
        </div>
      ) : properties.length === 0 ? (
        <p className='text-sm text-gray-500 py-6 text-center'>No properties in this portfolio yet. Add properties first.</p>
      ) : (
        <div className='space-y-2 max-h-[60vh] overflow-y-auto'>
          {properties.map((p) => {
            const isSelected = selected.has(p.id);
            const newTotal = newTotals.get(p.id) ?? 0;
            const overAllocated = newTotal > 100;
            return (
              <div
                key={p.id}
                className={`border rounded-lg p-3 ${isSelected ? 'border-sky-300 bg-sky-50/50' : 'border-gray-200'}`}
              >
                <label className='flex items-start gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={isSelected}
                    onChange={() => toggle(p.id)}
                    className='mt-1 h-4 w-4 text-sky-600 rounded border-gray-300'
                  />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between gap-2'>
                      <p className='text-sm font-medium text-gray-900 truncate'>{p.name}</p>
                      <span className='text-[11px] text-gray-500 shrink-0'>{p.unitCount} unit{p.unitCount === 1 ? '' : 's'}</span>
                    </div>
                    {p.address && <p className='text-xs text-gray-500 truncate'>{fmtAddr(p.address)}</p>}
                    {p.ownerships.length > 0 && (
                      <p className='text-[11px] text-gray-500 mt-1'>
                        Currently allocated: {p.totalOwnershipPct.toFixed(0)}%
                        {' '}({p.ownerships.map((o) => `${o.ownerName} ${o.ownershipPct.toFixed(0)}%`).join(', ')})
                      </p>
                    )}
                    {isSelected && (
                      <div className='mt-2 flex items-center gap-2'>
                        <label className='text-[11px] text-gray-600'>Ownership %:</label>
                        <input
                          type='number'
                          min={0}
                          max={100}
                          step='0.01'
                          value={selected.get(p.id) ?? 100}
                          onChange={(e) => setPct(p.id, Number(e.target.value))}
                          className='w-20 border border-gray-300 rounded px-2 py-1 text-xs'
                        />
                        {overAllocated && (
                          <span className='text-[11px] text-red-600 font-medium'>
                            ⚠ Total will be {newTotal.toFixed(1)}% (over 100%)
                          </span>
                        )}
                        {!overAllocated && p.ownerships.filter((o) => o.ownerId !== owner.id).length > 0 && (
                          <span className='text-[11px] text-amber-600'>
                            New total: {newTotal.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      )}
      {err && <p className='text-sm text-red-600 mt-2'>{err}</p>}
      <div className='flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200'>
        <button type='button' onClick={onClose} className='px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg'>Cancel</button>
        <button type='button' onClick={submit} disabled={busy || loading} className='px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50'>
          {busy ? 'Saving…' : `Save ${selected.size > 0 ? `(${selected.size})` : ''}`}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40' onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
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
