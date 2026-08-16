'use client';

/**
 * JobExpensesPanel
 *
 * Job-scoped expense tracking. Lets a contractor add expenses three ways:
 *   1. Manually (category, amount, vendor, date)
 *   2. From inventory (pick an item + qty → auto-priced from unit cost)
 *   3. From a receipt (upload an image, attach to the expense)
 *
 * Reads/writes through /api/contractor/expenses (scoped by jobId).
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DollarSign, Plus, Trash2, Receipt, Package, Pencil,
  RefreshCw, Upload, X, CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number | string;
  vendor?: string | null;
  expenseDate: string;
  receiptUrl?: string | null;
  billable: boolean;
  status: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit: string;
  unitCost: number | string | null;
  category: string | null;
  vendor?: { id: string; name: string } | null;
}

interface Props {
  jobId: string;
  canEdit?: boolean;
}

const CATEGORIES = [
  'Materials', 'Tools', 'Fuel', 'Permits', 'Insurance',
  'Subcontractor', 'Equipment Rental', 'Disposal', 'Other',
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank', label: 'Bank Transfer' },
];

type Mode = null | 'manual' | 'inventory' | 'receipt';

const today = () => new Date().toISOString().split('T')[0];

export function JobExpensesPanel({ jobId, canEdit = true }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Manual / shared form fields
  const [category, setCategory] = useState('Materials');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [expenseDate, setExpenseDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [billable, setBillable] = useState(true);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Inventory mode
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState('1');

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/contractor/expenses?jobId=${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const resetForm = () => {
    setMode(null);
    setEditingId(null);
    setCategory('Materials');
    setDescription('');
    setAmount('');
    setVendor('');
    setExpenseDate(today());
    setPaymentMethod('card');
    setBillable(true);
    setReceiptUrl('');
    setSelectedItemId('');
    setQty('1');
  };

  const loadInventory = async () => {
    if (inventory.length > 0) return;
    const res = await fetch('/api/contractor/inventory');
    if (res.ok) {
      const data = await res.json();
      // /api/contractor/inventory returns an array
      const items: InventoryItem[] = Array.isArray(data) ? data : (data.items ?? []);
      setInventory(items);
    }
  };

  const openMode = (next: Mode) => {
    resetForm();
    setMode(next);
    if (next === 'inventory') loadInventory();
  };

  const startEdit = (exp: Expense) => {
    resetForm();
    setMode('manual');
    setEditingId(exp.id);
    setCategory(exp.category || 'Materials');
    setDescription(exp.description || '');
    setAmount(String(Number(exp.amount)));
    setVendor(exp.vendor || '');
    setExpenseDate(new Date(exp.expenseDate).toISOString().split('T')[0]);
    setBillable(exp.billable);
    setReceiptUrl(exp.receiptUrl || '');
  };

  // When an inventory item is selected, auto-fill description/amount/vendor
  const onSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = inventory.find((i) => i.id === itemId);
    if (item) {
      const unit = Number(item.unitCost ?? 0);
      setDescription(item.name);
      setVendor(item.vendor?.name ?? '');
      setCategory(item.category || 'Materials');
      setAmount((unit * Number(qty || '1')).toFixed(2));
    }
  };

  const onQtyChange = (value: string) => {
    setQty(value);
    const item = inventory.find((i) => i.id === selectedItemId);
    if (item) {
      const unit = Number(item.unitCost ?? 0);
      setAmount((unit * Number(value || '0')).toFixed(2));
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'contractor-receipts');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setReceiptUrl(data.url);
        toast.success('Receipt uploaded');
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!description.trim()) { toast.error('Description is required'); return; }
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }

    setSaving(true);
    try {
      const payload = {
        category,
        description: description.trim(),
        amount: Number(amount),
        vendor: vendor.trim() || null,
        expenseDate,
        paymentMethod,
        billable,
        receiptUrl: receiptUrl || null,
        jobId,
      };

      const res = await fetch(
        editingId ? `/api/contractor/expenses/${editingId}` : '/api/contractor/expenses',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        toast.success(editingId ? 'Expense updated' : 'Expense added');
        resetForm();
        fetchExpenses();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to save expense');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/contractor/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Expense removed');
      fetchExpenses();
    } else {
      toast.error('Failed to remove expense');
    }
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const billableTotal = expenses.filter((e) => e.billable).reduce((s, e) => s + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + totals */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-gray-800">Expenses</h3>
          <span className="text-[11px] text-gray-500">
            Total {formatCurrency(total)} · Billable {formatCurrency(billableTotal)}
          </span>
        </div>
        {canEdit && !mode && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => openMode('manual')}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7">
              <Plus className="h-3 w-3 mr-1" /> Manual
            </Button>
            <Button size="sm" variant="outline" onClick={() => openMode('inventory')}
              className="border-gray-200 text-xs h-7">
              <Package className="h-3 w-3 mr-1" /> From Inventory
            </Button>
            <Button size="sm" variant="outline" onClick={() => openMode('receipt')}
              className="border-gray-200 text-xs h-7">
              <Receipt className="h-3 w-3 mr-1" /> From Receipt
            </Button>
          </div>
        )}
      </div>

      {/* Add / edit form */}
      {mode && (
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-800">
              {editingId ? 'Edit expense'
                : mode === 'inventory' ? 'Add expense from inventory'
                : mode === 'receipt' ? 'Add expense from receipt'
                : 'Add expense manually'}
            </p>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Inventory picker */}
          {mode === 'inventory' && !editingId && (
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedItemId}
                onChange={(e) => onSelectItem(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800"
              >
                <option value="">Select inventory item...</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {formatCurrency(Number(item.unitCost ?? 0))}/{item.unit}
                    {` (${item.quantity} in stock)`}
                  </option>
                ))}
              </select>
              <input
                type="number" min="1" value={qty}
                onChange={(e) => onQtyChange(e.target.value)}
                placeholder="Qty"
                className="w-24 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800"
              />
            </div>
          )}

          {/* Receipt upload */}
          {mode === 'receipt' && (
            <div>
              {receiptUrl ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={receiptUrl} alt="Receipt"
                    className="h-28 rounded-lg border-2 border-gray-200 object-cover" />
                  <button onClick={() => setReceiptUrl('')}
                    className="absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 p-0.5">
                    <X className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-white py-4 text-xs text-gray-600 hover:border-violet-400">
                  {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading...' : 'Upload receipt photo'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={handleReceiptUpload} disabled={uploading} />
                </label>
              )}
            </div>
          )}

          {/* Shared fields */}
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Amount *</label>
              <input type="number" min="0" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Description *</label>
              <input type="text" value={description}
                onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Vendor</label>
              <input type="text" value={vendor}
                onChange={(e) => setVendor(e.target.value)} placeholder="Home Depot, Lowe's..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Date</label>
              <input type="date" value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Payment</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700 mt-1">
              <input type="checkbox" checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="rounded text-violet-600 focus:ring-violet-500" />
              Billable to customer
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={resetForm}
              className="border-gray-200 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              {saving ? <RefreshCw className="h-3 w-3 animate-spin" />
                : editingId ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <Receipt className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No expenses logged for this job yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Add expenses manually, pull from inventory, or snap a receipt.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-800 truncate">{exp.description}</p>
                  {exp.billable && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Billable
                    </span>
                  )}
                  {exp.status === 'approved' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  )}
                </div>
                <p className="text-[10px] text-gray-500">
                  {exp.category}
                  {exp.vendor ? ` · ${exp.vendor}` : ''}
                  {` · ${new Date(exp.expenseDate).toLocaleDateString()}`}
                </p>
              </div>
              {exp.receiptUrl && (
                <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-violet-500 hover:text-violet-700" title="View receipt">
                  <Receipt className="h-4 w-4" />
                </a>
              )}
              <p className="text-xs font-bold text-gray-800 shrink-0">
                {formatCurrency(Number(exp.amount))}
              </p>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(exp)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(exp.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
