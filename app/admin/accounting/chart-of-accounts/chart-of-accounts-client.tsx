'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Check, ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react';

type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subType: string | null;
  taxLine: string | null;
  description: string | null;
  parentId: string | null;
  isSystem: boolean;
  isActive: boolean;
}

const TYPE_COLORS: Record<AccountType, string> = {
  asset:     'bg-blue-50 text-blue-700 border-blue-200',
  liability: 'bg-orange-50 text-orange-700 border-orange-200',
  equity:    'bg-purple-50 text-purple-700 border-purple-200',
  income:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  expense:   'bg-rose-50 text-rose-700 border-rose-200',
};

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'asset', label: 'Asset (1000s)' },
  { value: 'liability', label: 'Liability (2000s)' },
  { value: 'equity', label: 'Equity (3000s)' },
  { value: 'income', label: 'Income (4000s)' },
  { value: 'expense', label: 'Expense (5000s)' },
];

function AccountRow({
  account,
  onEdit,
  onToggleActive,
}: {
  account: Account;
  onEdit: (a: Account) => void;
  onToggleActive: (a: Account) => void;
}) {
  return (
    <tr className={`border-t border-gray-100 hover:bg-gray-50/60 transition-colors ${!account.isActive ? 'opacity-50' : ''}`}>
      <td className='px-4 py-2.5 font-mono text-xs text-gray-500 w-20'>{account.code}</td>
      <td className='px-4 py-2.5'>
        <p className='text-sm font-medium text-gray-900'>{account.name}</p>
        {account.description && <p className='text-[10px] text-gray-400 mt-0.5'>{account.description}</p>}
      </td>
      <td className='px-4 py-2.5'>
        <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[account.type]}`}>
          {account.type}
        </span>
      </td>
      <td className='px-4 py-2.5 text-xs text-gray-500'>{account.subType?.replace(/_/g, ' ') ?? '—'}</td>
      <td className='px-4 py-2.5 text-xs text-gray-400 font-mono'>{account.taxLine ?? '—'}</td>
      <td className='px-4 py-2.5 text-right'>
        <div className='flex items-center justify-end gap-2'>
          {account.isSystem ? (
            <span className='text-[10px] text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-full'>system</span>
          ) : (
            <>
              <button
                onClick={() => onEdit(account)}
                className='p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors'
                title='Edit account'
              >
                <Pencil className='h-3.5 w-3.5' />
              </button>
              <button
                onClick={() => onToggleActive(account)}
                className={`p-1 rounded transition-colors ${account.isActive ? 'hover:bg-red-50 text-gray-400 hover:text-red-600' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}
                title={account.isActive ? 'Deactivate account' : 'Reactivate account'}
              >
                {account.isActive ? <X className='h-3.5 w-3.5' /> : <Check className='h-3.5 w-3.5' />}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

interface FormState {
  code: string;
  name: string;
  type: AccountType;
  subType: string;
  taxLine: string;
  description: string;
}

const EMPTY_FORM: FormState = { code: '', name: '', type: 'expense', subType: '', taxLine: '', description: '' };

export default function ChartOfAccountsClient({ landlordId }: { landlordId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<AccountType>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounting/chart-of-accounts?landlordId=${landlordId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setAccounts(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => { load(); }, [load]);

  const toggleCollapse = (type: AccountType) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(null); setShowForm(true); };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({ code: a.code, name: a.name, type: a.type, subType: a.subType ?? '', taxLine: a.taxLine ?? '', description: a.description ?? '' });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) { setFormError('Code and name are required'); return; }
    setSaving(true);
    setFormError(null);
    try {
      let res, json;
      if (editing) {
        res = await fetch(`/api/admin/accounting/chart-of-accounts/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landlordId, ...form }),
        });
      } else {
        res = await fetch('/api/admin/accounting/chart-of-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landlordId, ...form }),
        });
      }
      json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (a: Account) => {
    try {
      const res = await fetch(`/api/admin/accounting/chart-of-accounts/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId, isActive: !a.isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update account');
    }
  };

  const filtered = accounts.filter((a) => {
    if (!showInactive && !a.isActive) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return a.code.includes(q) || a.name.toLowerCase().includes(q) || (a.subType ?? '').toLowerCase().includes(q);
  });

  const grouped: Record<AccountType, Account[]> = { asset: [], liability: [], equity: [], income: [], expense: [] };
  for (const a of filtered) grouped[a.type]?.push(a);

  const stats = {
    total: accounts.length,
    active: accounts.filter((a) => a.isActive).length,
    byType: TYPE_ORDER.reduce((acc, t) => { acc[t] = accounts.filter((a) => a.type === t && a.isActive).length; return acc; }, {} as Record<AccountType, number>),
  };

  if (loading) return (
    <div className='flex items-center justify-center py-20 text-gray-400'>
      <Loader2 className='h-6 w-6 animate-spin mr-2' />Loading chart of accounts…
    </div>
  );

  if (error) return (
    <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>
  );

  return (
    <div className='space-y-5'>
      {/* KPI row */}
      <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm col-span-2 sm:col-span-1'>
          <p className='text-[10px] text-gray-500 uppercase tracking-wide'>Total Accounts</p>
          <p className='text-xl font-bold mt-0.5'>{stats.total}</p>
          <p className='text-[10px] text-gray-400'>{stats.active} active</p>
        </div>
        {TYPE_ORDER.map((t) => (
          <div key={t} className={`rounded-xl border p-3 shadow-sm ${TYPE_COLORS[t]}`}>
            <p className='text-[10px] font-bold uppercase tracking-wide capitalize'>{t}</p>
            <p className='text-xl font-bold mt-0.5'>{stats.byType[t]}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-3'>
        <div className='relative flex-1 min-w-48'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
          <input
            type='text'
            placeholder='Search by code or name…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'
          />
        </div>
        <label className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none'>
          <input type='checkbox' checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className='rounded' />
          Show inactive
        </label>
        <button
          onClick={openCreate}
          className='inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors'
        >
          <Plus className='h-4 w-4' />
          Add Account
        </button>
      </div>

      {/* Account groups */}
      {TYPE_ORDER.map((type) => {
        const rows = grouped[type];
        const isCollapsed = collapsed.has(type);
        return (
          <div key={type} className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            {/* Group header */}
            <button
              onClick={() => toggleCollapse(type)}
              className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors'
            >
              <div className='flex items-center gap-3'>
                {isCollapsed ? <ChevronRight className='h-4 w-4 text-gray-400' /> : <ChevronDown className='h-4 w-4 text-gray-400' />}
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${TYPE_COLORS[type]}`}>
                  {type}
                </span>
                <span className='text-xs text-gray-500'>{rows.length} accounts</span>
              </div>
              <span className='text-xs font-mono text-gray-400'>
                {type === 'asset' ? '1000–1999' : type === 'liability' ? '2000–2999' : type === 'equity' ? '3000–3999' : type === 'income' ? '4000–4999' : '5000–5999'}
              </span>
            </button>

            {!isCollapsed && (
              rows.length === 0 ? (
                <p className='px-4 py-4 text-xs text-gray-400 text-center'>No accounts in this category</p>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b border-gray-100'>
                        <th className='text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-20'>Code</th>
                        <th className='text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide'>Name</th>
                        <th className='text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide'>Type</th>
                        <th className='text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide'>Sub-type</th>
                        <th className='text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide'>Tax Line</th>
                        <th className='px-4 py-2 w-20'></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((a) => (
                        <AccountRow key={a.id} account={a} onEdit={openEdit} onToggleActive={handleToggleActive} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        );
      })}

      {/* Slide-in form overlay */}
      {showForm && (
        <div className='fixed inset-0 z-50 flex'>
          <div className='flex-1 bg-black/40' onClick={() => setShowForm(false)} />
          <div className='w-full max-w-md bg-white shadow-2xl flex flex-col'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200'>
              <h2 className='text-base font-semibold text-gray-900'>{editing ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={() => setShowForm(false)} className='p-1 rounded hover:bg-gray-100'>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-5 space-y-4'>
              {formError && (
                <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{formError}</div>
              )}

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-semibold text-gray-700 mb-1'>Account Code *</label>
                  <input
                    type='text'
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    disabled={!!editing}
                    placeholder='e.g. 5150'
                    className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono disabled:bg-gray-50 disabled:text-gray-400'
                  />
                  {!editing && <p className='text-[10px] text-gray-400 mt-1'>Must be unique for your chart</p>}
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-700 mb-1'>Account Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
                    disabled={!!editing?.isSystem}
                    className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400'
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Account Name *</label>
                <input
                  type='text'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={editing?.isSystem}
                  placeholder='e.g. Pool Maintenance'
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Sub-type</label>
                <input
                  type='text'
                  value={form.subType}
                  onChange={(e) => setForm({ ...form, subType: e.target.value })}
                  disabled={editing?.isSystem}
                  placeholder='e.g. operating_expense'
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>IRS Schedule E Tax Line</label>
                <input
                  type='text'
                  value={form.taxLine}
                  onChange={(e) => setForm({ ...form, taxLine: e.target.value })}
                  placeholder='e.g. sch_e_14'
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono'
                />
                <p className='text-[10px] text-gray-400 mt-1'>Used for Schedule E / Tax Summary export</p>
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder='Optional notes for this account…'
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none'
                />
              </div>
            </div>
            <div className='px-5 py-4 border-t border-gray-200 flex justify-end gap-3'>
              <button onClick={() => setShowForm(false)} className='px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className='inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors'
              >
                {saving && <Loader2 className='h-4 w-4 animate-spin' />}
                {editing ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
