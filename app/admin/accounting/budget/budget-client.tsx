'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BudgetRow {
  code: string;
  name: string;
  type: string;
  budget: number;
  actual: number;
  variance: number;
  variancePct: number | null;
  overBudget: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EXPENSE_CATEGORIES = ['5000','5100','5110','5120','5130','5200','5210','5220','5230','5300','5400','5500','5600','5610','5620','5700','5710','5800','5900','5910','5990'];

export default function BudgetClient({ landlordId }: { landlordId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<{ rows: BudgetRow[]; totalBudget: number; totalActual: number; incomeBudget: number; incomeActual: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounting/budget?landlordId=${landlordId}&year=${year}&month=${month}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  }, [landlordId, year, month]);

  useEffect(() => { load(); }, [load]);

  const handleBudgetSave = async (code: string) => {
    const amount = parseFloat(editValue);
    if (isNaN(amount) || amount < 0) { alert('Enter a valid amount'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/accounting/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId, year, month, accountCode: code, budgetAmount: amount }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditingRow(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const rows = data?.rows ?? [];
  const expenseRows = rows.filter((r) => r.type === 'expense');
  const incomeRows = rows.filter((r) => r.type === 'income');

  if (error) return <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>;

  return (
    <div className='space-y-5'>
      {/* Period selector */}
      <div className='flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm'>
        <div className='flex items-center gap-2'>
          <label className='text-xs font-semibold text-gray-700'>Year</label>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className='flex items-center gap-2'>
          <label className='text-xs font-semibold text-gray-700'>Month</label>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
            className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <p className='text-xs text-gray-400 ml-auto'>Click any Budget cell to edit</p>
      </div>

      {/* KPIs */}
      {data && (
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
            <p className='text-xs text-gray-500'>Income Budget</p>
            <p className='text-xl font-bold text-emerald-700 mt-1'>{formatCurrency(data.incomeBudget)}</p>
            <p className='text-[10px] text-gray-400'>Actual: {formatCurrency(data.incomeActual)}</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
            <p className='text-xs text-gray-500'>Expense Budget</p>
            <p className='text-xl font-bold text-gray-900 mt-1'>{formatCurrency(data.totalBudget)}</p>
            <p className='text-[10px] text-gray-400'>Actual: {formatCurrency(data.totalActual)}</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
            <p className='text-xs text-gray-500'>Expense Variance</p>
            <p className={`text-xl font-bold mt-1 ${data.totalActual > data.totalBudget ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(data.totalActual - data.totalBudget)}
            </p>
            <p className='text-[10px] text-gray-400'>{data.totalActual > data.totalBudget ? 'Over budget' : 'Under budget'}</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
            <p className='text-xs text-gray-500'>Net (Income − Expense)</p>
            <p className={`text-xl font-bold mt-1 ${data.incomeActual - data.totalActual < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(data.incomeActual - data.totalActual)}
            </p>
            <p className='text-[10px] text-gray-400'>Actual this month</p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className='flex items-center justify-center py-16 text-gray-400'><Loader2 className='h-6 w-6 animate-spin mr-2' />Loading…</div>
      ) : (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-100 bg-gray-50'>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Account</th>
                <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Budget</th>
                <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Actual</th>
                <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Variance</th>
                <th className='px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32'>Progress</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {/* Income section */}
              {incomeRows.length > 0 && (
                <>
                  <tr className='bg-emerald-50/40'><td colSpan={5} className='px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700'>Income</td></tr>
                  {incomeRows.map((row) => <BudgetRow key={row.code} row={row} editing={editingRow} editValue={editValue} onStartEdit={(c) => { setEditingRow(c); setEditValue(String(row.budget)); }} onEditChange={setEditValue} onSave={handleBudgetSave} onCancel={() => setEditingRow(null)} saving={saving} />)}
                </>
              )}
              {/* Expense section */}
              {expenseRows.length > 0 && (
                <>
                  <tr className='bg-rose-50/40'><td colSpan={5} className='px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-700'>Expenses</td></tr>
                  {expenseRows.map((row) => <BudgetRow key={row.code} row={row} editing={editingRow} editValue={editValue} onStartEdit={(c) => { setEditingRow(c); setEditValue(String(row.budget)); }} onEditChange={setEditValue} onSave={handleBudgetSave} onCancel={() => setEditingRow(null)} saving={saving} />)}
                </>
              )}
              {rows.length === 0 && (
                <tr><td colSpan={5} className='px-4 py-8 text-center text-sm text-gray-500'>No GL activity this period yet. Add budgets by clicking on any account&apos;s budget cell above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BudgetRow({ row, editing, editValue, onStartEdit, onEditChange, onSave, onCancel, saving }: {
  row: BudgetRow;
  editing: string | null;
  editValue: string;
  onStartEdit: (code: string) => void;
  onEditChange: (v: string) => void;
  onSave: (code: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const isEditing = editing === row.code;
  const pct = row.budget > 0 ? Math.min(100, (row.actual / row.budget) * 100) : 0;
  return (
    <tr className='hover:bg-gray-50/50 transition-colors'>
      <td className='px-4 py-2.5'>
        <span className='font-mono text-xs text-gray-400 mr-2'>{row.code}</span>
        <span className='text-sm text-gray-900'>{row.name}</span>
      </td>
      <td className='px-4 py-2.5 text-right'>
        {isEditing ? (
          <div className='flex items-center justify-end gap-1'>
            <input type='number' value={editValue} onChange={(e) => onEditChange(e.target.value)} autoFocus
              className='w-24 px-2 py-1 text-sm border border-violet-400 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-right' />
            <button onClick={() => onSave(row.code)} disabled={saving} className='px-2 py-1 bg-violet-600 text-white text-xs rounded hover:bg-violet-700 disabled:opacity-50'>✓</button>
            <button onClick={onCancel} className='px-2 py-1 text-xs text-gray-500 hover:text-gray-700'>✕</button>
          </div>
        ) : (
          <button onClick={() => onStartEdit(row.code)}
            className='text-sm font-medium text-gray-700 hover:text-violet-600 hover:underline cursor-pointer tabular-nums'>
            {row.budget > 0 ? formatCurrency(row.budget) : <span className='text-gray-300 text-xs'>set budget</span>}
          </button>
        )}
      </td>
      <td className='px-4 py-2.5 text-right text-sm font-medium tabular-nums'>{formatCurrency(row.actual)}</td>
      <td className={`px-4 py-2.5 text-right text-sm font-semibold tabular-nums ${row.overBudget ? 'text-red-600' : row.variance < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
        {row.variance === 0 ? '—' : (row.variance > 0 ? '+' : '') + formatCurrency(row.variance)}
        {row.variancePct !== null && row.budget > 0 && (
          <span className='text-[10px] text-gray-400 ml-1'>({row.variancePct > 0 ? '+' : ''}{row.variancePct.toFixed(0)}%)</span>
        )}
      </td>
      <td className='px-4 py-2.5'>
        {row.budget > 0 && (
          <div className='flex items-center gap-2'>
            <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
              <div className={`h-full rounded-full transition-all ${row.overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className='text-[10px] text-gray-400 w-8 text-right'>{pct.toFixed(0)}%</span>
          </div>
        )}
      </td>
    </tr>
  );
}
