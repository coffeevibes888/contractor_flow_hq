'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DepEntry {
  id: string;
  effectiveDate: string;
  memo: string | null;
  lines: { account: { code: string; name: string }; debit: string; credit: string }[];
}

export default function DepreciationClient({ landlordId }: { landlordId: string }) {
  const [entries, setEntries] = useState<DepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    assetCost: '',
    salvageValue: '0',
    usefulLifeYears: '27.5',
    effectiveDate: new Date().toISOString().slice(0, 10),
    memo: '',
  });

  // Preview calculation
  const monthly = form.assetCost && form.usefulLifeYears
    ? ((parseFloat(form.assetCost) - parseFloat(form.salvageValue || '0')) / parseFloat(form.usefulLifeYears)) / 12
    : 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounting/depreciation?landlordId=${landlordId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEntries(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load depreciation entries');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async () => {
    if (!form.assetCost || !form.usefulLifeYears) { setFormError('Asset cost and useful life are required'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/accounting/depreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId,
          assetCost: parseFloat(form.assetCost),
          salvageValue: parseFloat(form.salvageValue || '0'),
          usefulLifeYears: parseFloat(form.usefulLifeYears),
          effectiveDate: form.effectiveDate,
          memo: form.memo || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to post entry');
    } finally {
      setSaving(false);
    }
  };

  const totalPosted = entries.reduce((s, e) => {
    const depLine = e.lines.find((l) => l.account.code === '5900');
    return s + (depLine ? parseFloat(depLine.debit) : 0);
  }, 0);

  if (loading) return <div className='flex items-center justify-center py-20 text-gray-400'><Loader2 className='h-6 w-6 animate-spin mr-2' />Loading…</div>;
  if (error) return <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>;

  return (
    <div className='space-y-5'>
      {/* KPIs */}
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs text-gray-500'>Entries Posted</p>
          <p className='text-xl font-bold mt-1'>{entries.length}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs text-gray-500'>Total Depreciation</p>
          <p className='text-xl font-bold text-gray-900 mt-1'>{formatCurrency(totalPosted)}</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>Debited to 5900</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm col-span-2 sm:col-span-1'>
          <p className='text-xs text-gray-500'>Standard Useful Life</p>
          <p className='text-xl font-bold mt-1'>27.5 yrs</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>Residential rental (IRS)</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className='flex justify-between items-center'>
        <p className='text-xs text-gray-500'>Straight-line depreciation per IRS Publication 527</p>
        <button onClick={() => { setShowForm(true); setFormError(null); }}
          className='inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700'>
          <Plus className='h-4 w-4' />Post Depreciation
        </button>
      </div>

      {/* History */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {entries.length === 0 ? (
          <div className='p-10 text-center'>
            <Calculator className='h-8 w-8 text-gray-300 mx-auto mb-3' />
            <p className='text-sm text-gray-500'>No depreciation entries yet.</p>
            <p className='text-xs text-gray-400 mt-1'>Use the wizard to calculate and post straight-line depreciation for your properties.</p>
          </div>
        ) : (
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-100 bg-gray-50'>
                {['Date', 'Memo', 'Debit (5900)', 'Credit (1420)'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h.startsWith('Debit') || h.startsWith('Credit') ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {entries.map((entry) => {
                const debitLine = entry.lines.find((l) => l.account.code === '5900');
                const creditLine = entry.lines.find((l) => l.account.code === '1420');
                return (
                  <tr key={entry.id} className='hover:bg-gray-50/50'>
                    <td className='px-4 py-3 text-xs text-gray-600'>
                      {new Date(entry.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className='px-4 py-3 text-xs text-gray-700'>{entry.memo ?? '—'}</td>
                    <td className='px-4 py-3 text-right text-xs font-medium tabular-nums'>
                      {debitLine ? formatCurrency(parseFloat(debitLine.debit)) : '—'}
                    </td>
                    <td className='px-4 py-3 text-right text-xs font-medium tabular-nums'>
                      {creditLine ? formatCurrency(parseFloat(creditLine.credit)) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Wizard modal */}
      {showForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/40' onClick={() => setShowForm(false)} />
          <div className='relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4'>
            <h2 className='text-base font-semibold text-gray-900'>Straight-Line Depreciation Wizard</h2>
            {formError && <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{formError}</div>}

            {[
              { label: 'Asset Cost ($) *', key: 'assetCost', placeholder: '250000', hint: 'Purchase price or basis' },
              { label: 'Salvage Value ($)', key: 'salvageValue', placeholder: '0', hint: 'Usually $0 for real estate' },
              { label: 'Useful Life (years) *', key: 'usefulLifeYears', placeholder: '27.5', hint: 'IRS: 27.5 residential, 39 commercial' },
            ].map(({ label, key, placeholder, hint }) => (
              <div key={key}>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>{label}</label>
                <input type='number' value={(form as Record<string, string>)[key]} placeholder={placeholder}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500' />
                <p className='text-[10px] text-gray-400 mt-0.5'>{hint}</p>
              </div>
            ))}

            <div>
              <label className='block text-xs font-semibold text-gray-700 mb-1'>Effective Date</label>
              <input type='date' value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-700 mb-1'>Memo</label>
              <input type='text' value={form.memo} placeholder='e.g. 123 Main St — monthly depreciation'
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500' />
            </div>

            {monthly > 0 && (
              <div className='rounded-lg bg-violet-50 border border-violet-200 px-4 py-3'>
                <p className='text-xs font-semibold text-violet-700'>Monthly depreciation: <span className='text-violet-900'>{formatCurrency(monthly)}</span></p>
                <p className='text-xs text-violet-600 mt-0.5'>Annual: {formatCurrency(monthly * 12)}</p>
              </div>
            )}

            <div className='flex justify-end gap-3 pt-2'>
              <button onClick={() => setShowForm(false)} className='px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50'>Cancel</button>
              <button onClick={handlePost} disabled={saving || monthly <= 0}
                className='inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50'>
                {saving && <Loader2 className='h-4 w-4 animate-spin' />}Post Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
