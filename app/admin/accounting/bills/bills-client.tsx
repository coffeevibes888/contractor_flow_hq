'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Search, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Property { id: string; name: string }
interface Bill {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  dueDate: string | null;
  status: 'draft' | 'approved' | 'paid' | 'overdue';
  paidAt: string | null;
  notes: string | null;
  incurredAt: string;
  property: Property | null;
  propertyId: string | null;
}

const STATUS_BADGE: Record<Bill['status'], string> = {
  draft:    'bg-gray-100 text-gray-600',
  approved: 'bg-blue-50 text-blue-700',
  paid:     'bg-emerald-50 text-emerald-700',
  overdue:  'bg-red-50 text-red-700',
};
const STATUS_ICON: Record<Bill['status'], React.ReactNode> = {
  draft:    <FileText className='h-3 w-3' />,
  approved: <Clock className='h-3 w-3' />,
  paid:     <CheckCircle2 className='h-3 w-3' />,
  overdue:  <AlertTriangle className='h-3 w-3' />,
};

const EMPTY_FORM = { vendor: '', amount: '', category: 'Repairs & Maintenance', description: '', dueDate: '', propertyId: '', notes: '' };

export default function BillsClient({ landlordId }: { landlordId: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [totals, setTotals] = useState({ total: 0, draft: 0, approved: 0, paid: 0, overdue: 0 });
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [billsRes, propsRes] = await Promise.all([
        fetch(`/api/admin/accounting/bills?landlordId=${landlordId}${filterStatus ? `&status=${filterStatus}` : ''}`),
        fetch(`/api/admin/properties?landlordId=${landlordId}`),
      ]);
      const billsJson = await billsRes.json();
      if (!billsJson.success) throw new Error(billsJson.message);
      setBills(billsJson.data.bills);
      setTotals(billsJson.data.totals);
      if (propsRes.ok) {
        const propsJson = await propsRes.json();
        if (propsJson.success) setProperties(propsJson.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [landlordId, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.vendor || !form.amount || !form.category) { setFormError('Vendor, amount, and category are required'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/accounting/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId, ...form, amount: parseFloat(form.amount) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (bill: Bill, status: Bill['status']) => {
    try {
      const res = await fetch(`/api/admin/accounting/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId, status, paidAt: status === 'paid' ? new Date().toISOString() : null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleDelete = async (bill: Bill) => {
    if (!confirm(`Delete bill from ${bill.vendor}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/accounting/bills/${bill.id}?landlordId=${landlordId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const filtered = bills.filter((b) => {
    if (!search) return true;
    return b.vendor.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className='flex items-center justify-center py-20 text-gray-400'><Loader2 className='h-6 w-6 animate-spin mr-2' />Loading bills…</div>;
  if (error) return <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>;

  return (
    <div className='space-y-5'>
      {/* KPIs */}
      <div className='grid grid-cols-2 sm:grid-cols-5 gap-3'>
        {[
          { label: 'Total AP', value: totals.total, color: 'text-gray-900' },
          { label: 'Draft', value: totals.draft, color: 'text-gray-600' },
          { label: 'Approved', value: totals.approved, color: 'text-blue-700' },
          { label: 'Overdue', value: totals.overdue, color: 'text-red-600' },
          { label: 'Paid', value: totals.paid, color: 'text-emerald-700' },
        ].map((kpi) => (
          <div key={kpi.label} className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
            <p className='text-xs text-gray-500 font-medium'>{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{formatCurrency(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-3'>
        <div className='relative flex-1 min-w-48'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
          <input type='text' placeholder='Search vendor or category…' value={search} onChange={(e) => setSearch(e.target.value)}
            className='w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500' />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className='px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'>
          <option value=''>All statuses</option>
          <option value='draft'>Draft</option>
          <option value='approved'>Approved</option>
          <option value='overdue'>Overdue</option>
          <option value='paid'>Paid</option>
        </select>
        <button onClick={() => { setShowForm(true); setFormError(null); setForm(EMPTY_FORM); }}
          className='inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700'>
          <Plus className='h-4 w-4' />New Bill
        </button>
      </div>

      {/* Bills table */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {filtered.length === 0 ? (
          <div className='p-10 text-center'>
            <FileText className='h-8 w-8 text-gray-300 mx-auto mb-3' />
            <p className='text-sm text-gray-500'>No bills found. Add your first vendor bill to start tracking AP.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  {['Vendor', 'Category', 'Property', 'Due Date', 'Amount', 'Status', ''].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50'>
                {filtered.map((bill) => (
                  <tr key={bill.id} className='hover:bg-gray-50/50 transition-colors'>
                    <td className='px-4 py-3'>
                      <p className='font-medium text-gray-900 text-xs'>{bill.vendor}</p>
                      {bill.notes && <p className='text-[10px] text-gray-400'>{bill.notes}</p>}
                    </td>
                    <td className='px-4 py-3 text-xs text-gray-600'>{bill.category}</td>
                    <td className='px-4 py-3 text-xs text-gray-500'>{bill.property?.name ?? '—'}</td>
                    <td className='px-4 py-3 text-xs text-gray-500'>
                      {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className='px-4 py-3 text-right text-sm font-semibold text-gray-900'>{formatCurrency(bill.amount)}</td>
                    <td className='px-4 py-3'>
                      <select
                        value={bill.status}
                        onChange={(e) => handleStatusChange(bill, e.target.value as Bill['status'])}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_BADGE[bill.status]}`}
                      >
                        {(['draft', 'approved', 'paid', 'overdue'] as Bill['status'][]).map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <button onClick={() => handleDelete(bill)} className='p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors'>
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Bill slide-in */}
      {showForm && (
        <div className='fixed inset-0 z-50 flex'>
          <div className='flex-1 bg-black/40' onClick={() => setShowForm(false)} />
          <div className='w-full max-w-md bg-white shadow-2xl flex flex-col'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200'>
              <h2 className='text-base font-semibold text-gray-900'>New Bill / Vendor Charge</h2>
              <button onClick={() => setShowForm(false)}><X className='h-5 w-5 text-gray-500' /></button>
            </div>
            <div className='flex-1 overflow-y-auto p-5 space-y-4'>
              {formError && <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{formError}</div>}
              {[
                { label: 'Vendor / Payee *', key: 'vendor', placeholder: 'e.g. City Water Dept.' },
                { label: 'Amount ($) *', key: 'amount', placeholder: '0.00', type: 'number' },
                { label: 'Due Date', key: 'dueDate', placeholder: '', type: 'date' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className='block text-xs font-semibold text-gray-700 mb-1'>{label}</label>
                  <input type={type ?? 'text'} value={(form as Record<string, string>)[key]} placeholder={placeholder}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500' />
                </div>
              ))}
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Category *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'>
                  {['Repairs & Maintenance', 'Utilities', 'Insurance', 'Property Taxes', 'Management Fees', 'Landscaping', 'Cleaning', 'Legal Fees', 'Accounting Fees', 'Other'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Property</label>
                <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500'>
                  <option value=''>Portfolio-level</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none' />
              </div>
            </div>
            <div className='px-5 py-4 border-t border-gray-200 flex justify-end gap-3'>
              <button onClick={() => setShowForm(false)} className='px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50'>Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className='inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50'>
                {saving && <Loader2 className='h-4 w-4 animate-spin' />}
                Save Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
