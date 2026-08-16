'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Lock, Unlock, X, Loader2, Calendar } from 'lucide-react';

interface FiscalPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'locked' | 'closed';
  closedAt: string | null;
  _count: { entries: number };
}

const STATUS_BADGE = {
  open:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  locked: 'bg-amber-50 text-amber-700 border border-amber-200',
  closed: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PeriodsClient({ landlordId }: { landlordId: string }) {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const now = new Date();
  const [newYear, setNewYear] = useState(now.getFullYear());
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounting/periods?landlordId=${landlordId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setPeriods(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load periods');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true); setFormError(null);
    try {
      const res = await fetch('/api/admin/accounting/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId, year: newYear, month: newMonth }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create period');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (period: FiscalPeriod, status: 'open' | 'locked' | 'closed') => {
    const confirmMsg = status === 'closed'
      ? `Close this period permanently? This cannot be undone.`
      : `Change period status to ${status}?`;
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/admin/accounting/periods/${period.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const openCount = periods.filter((p) => p.status === 'open').length;
  const lockedCount = periods.filter((p) => p.status === 'locked').length;
  const closedCount = periods.filter((p) => p.status === 'closed').length;

  if (loading) return <div className='flex items-center justify-center py-20 text-gray-400'><Loader2 className='h-6 w-6 animate-spin mr-2' />Loading periods…</div>;
  if (error) return <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>;

  return (
    <div className='space-y-5'>
      {/* KPIs */}
      <div className='grid grid-cols-3 gap-3'>
        {[
          { label: 'Open', value: openCount, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Locked', value: lockedCount, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Closed', value: closedCount, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 shadow-sm ${k.bg}`}>
            <p className='text-xs font-medium text-gray-500'>{k.label} Periods</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className='flex justify-between items-center'>
        <p className='text-xs text-gray-500'>{periods.length} total periods</p>
        <button onClick={() => { setShowForm(true); setFormError(null); }}
          className='inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700'>
          <Plus className='h-4 w-4' />New Period
        </button>
      </div>

      {/* Periods list */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {periods.length === 0 ? (
          <div className='p-10 text-center'>
            <Calendar className='h-8 w-8 text-gray-300 mx-auto mb-3' />
            <p className='text-sm text-gray-500'>No fiscal periods yet. Create your first period to start controlling when entries can be posted.</p>
          </div>
        ) : (
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-100 bg-gray-50'>
                {['Period', 'Dates', 'Status', 'Journal Entries', 'Actions'].map((h) => (
                  <th key={h} className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {periods.map((period) => {
                const start = new Date(period.startDate);
                const monthName = MONTHS[start.getMonth()];
                const year = start.getFullYear();
                const closedDate = period.closedAt ? new Date(period.closedAt).toLocaleDateString() : null;
                return (
                  <tr key={period.id} className='hover:bg-gray-50/50 transition-colors'>
                    <td className='px-4 py-3'>
                      <p className='font-semibold text-gray-900'>{monthName} {year}</p>
                    </td>
                    <td className='px-4 py-3 text-xs text-gray-500'>
                      {new Date(period.startDate).toLocaleDateString()} – {new Date(period.endDate).toLocaleDateString()}
                    </td>
                    <td className='px-4 py-3'>
                      <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[period.status]}`}>
                        {period.status}
                      </span>
                      {closedDate && <p className='text-[10px] text-gray-400 mt-0.5'>Closed {closedDate}</p>}
                    </td>
                    <td className='px-4 py-3 text-sm text-gray-700 font-medium'>{period._count.entries.toLocaleString()}</td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        {period.status === 'open' && (
                          <>
                            <button onClick={() => handleStatusChange(period, 'locked')}
                              className='inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full hover:bg-amber-100'>
                              <Lock className='h-3 w-3' />Lock
                            </button>
                            <button onClick={() => handleStatusChange(period, 'closed')}
                              className='inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded-full hover:bg-slate-200'>
                              Close
                            </button>
                          </>
                        )}
                        {period.status === 'locked' && (
                          <>
                            <button onClick={() => handleStatusChange(period, 'open')}
                              className='inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100'>
                              <Unlock className='h-3 w-3' />Unlock
                            </button>
                            <button onClick={() => handleStatusChange(period, 'closed')}
                              className='inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded-full hover:bg-slate-200'>
                              Close
                            </button>
                          </>
                        )}
                        {period.status === 'closed' && (
                          <span className='text-[10px] text-gray-400'>Permanent</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Period form */}
      {showForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/40' onClick={() => setShowForm(false)} />
          <div className='relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-semibold text-gray-900'>Create Fiscal Period</h2>
              <button onClick={() => setShowForm(false)}><X className='h-5 w-5 text-gray-400' /></button>
            </div>
            {formError && <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{formError}</div>}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Year</label>
                <select value={newYear} onChange={(e) => setNewYear(parseInt(e.target.value))}
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Month</label>
                <select value={newMonth} onChange={(e) => setNewMonth(parseInt(e.target.value))}
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'>
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
            <p className='text-xs text-gray-400'>The period starts on the 1st and ends on the last day of the selected month.</p>
            <div className='flex justify-end gap-3'>
              <button onClick={() => setShowForm(false)} className='px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50'>Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className='inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50'>
                {saving && <Loader2 className='h-4 w-4 animate-spin' />}Create Period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
