'use client';

/**
 * JobChecklistPanel
 *
 * Interactive checklist / punch list backed by ContractorJobMilestone. Crew can
 * check items off, add new items, optionally attach a payment milestone amount,
 * and track progress. Shows a completion progress bar.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Circle, Plus, Trash2, RefreshCw, X, DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  status: string;
  completedAt?: string | null;
  paymentAmount?: number | string | null;
  paymentDue: boolean;
  paymentPaid: boolean;
}

interface Props {
  jobId: string;
  canEdit?: boolean;
}

export function JobChecklistPanel({ jobId, canEdit = true }: Props) {
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/milestones`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.milestones ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setAdding(false);
    setTitle(''); setDescription(''); setPaymentAmount('');
  };

  const handleAdd = async () => {
    if (!title.trim()) { toast.error('Item title is required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          paymentAmount: paymentAmount ? Number(paymentAmount) : null,
        }),
      });
      if (res.ok) {
        toast.success('Item added');
        resetForm();
        fetchItems();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to add item');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: Milestone) => {
    setBusyId(item.id);
    // optimistic update
    const completed = item.status !== 'completed';
    setItems((prev) => prev.map((m) =>
      m.id === item.id ? { ...m, status: completed ? 'completed' : 'pending' } : m
    ));
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/milestones/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) {
        // revert
        setItems((prev) => prev.map((m) =>
          m.id === item.id ? { ...m, status: completed ? 'pending' : 'completed' } : m
        ));
        toast.error('Failed to update item');
      }
    } finally {
      setBusyId(null);
    }
  };

  const togglePaid = async (item: Milestone) => {
    const res = await fetch(`/api/contractor/jobs/${jobId}/milestones/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentPaid: !item.paymentPaid }),
    });
    if (res.ok) fetchItems();
    else toast.error('Failed to update payment');
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/contractor/jobs/${jobId}/milestones/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Item removed'); fetchItems(); }
    else toast.error('Failed to remove');
  };

  const completedCount = items.filter((m) => m.status === 'completed').length;
  const pct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-gray-800">Checklist / Punch List</h3>
          {items.length > 0 && (
            <span className="text-[11px] text-gray-500">{completedCount}/{items.length} done</span>
          )}
        </div>
        {canEdit && !adding && (
          <Button size="sm" onClick={() => setAdding(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
            style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-800">New checklist item</p>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Task (e.g. Prime all surfaces)"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Details (optional)"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
              Payment milestone amount (optional)
            </label>
            <input type="number" min="0" step="0.01" value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00"
              className="w-40 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={resetForm} className="border-gray-200 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Add Item'}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No checklist items yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Break the job into tasks the crew can check off as they go.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
          {items.map((item) => {
            const done = item.status === 'completed';
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => canEdit && toggle(item)}
                  disabled={!canEdit || busyId === item.id}
                  className="shrink-0 disabled:opacity-50"
                >
                  {done
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    : <Circle className="h-5 w-5 text-gray-300 hover:text-violet-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-[10px] text-gray-500">{item.description}</p>
                  )}
                </div>
                {item.paymentAmount != null && Number(item.paymentAmount) > 0 && (
                  <button
                    onClick={() => canEdit && togglePaid(item)}
                    disabled={!canEdit}
                    className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.paymentPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                    title={item.paymentPaid ? 'Paid' : 'Mark paid'}
                  >
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(Number(item.paymentAmount))}
                    {item.paymentPaid ? ' · paid' : ''}
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => handleDelete(item.id)}
                    className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
