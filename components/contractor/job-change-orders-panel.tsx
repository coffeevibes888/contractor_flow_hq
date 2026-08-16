'use client';

/**
 * JobChangeOrdersPanel
 *
 * Capture extra work / scope changes mid-job, with an approval + e-signature
 * flow. Approving a change order rolls its cost into the job value server-side.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  FilePlus, Plus, Trash2, RefreshCw, X, Check, Clock, XCircle, PenLine,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { InlineSignaturePad } from '@/components/contractor/inline-signature-pad';

interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  reason?: string | null;
  additionalCost: number | string;
  additionalHours?: number | null;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  signatureUrl?: string | null;
  createdAt: string;
}

interface Props {
  jobId: string;
  canEdit?: boolean;
}

async function uploadDataUrl(dataUrl: string): Promise<string | null> {
  const blob = await (await fetch(dataUrl)).blob();
  const fd = new FormData();
  fd.append('file', new File([blob], 'signature.png', { type: 'image/png' }));
  fd.append('folder', 'contractor-signatures');
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  return res.ok && data.url ? data.url : null;
}

export function JobChangeOrdersPanel({ jobId, canEdit = true }: Props) {
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [additionalCost, setAdditionalCost] = useState('');
  const [additionalHours, setAdditionalHours] = useState('');

  // Approval flow
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approving, setApproving] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/change-orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.changeOrders ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const resetForm = () => {
    setAdding(false);
    setTitle(''); setDescription(''); setReason('');
    setAdditionalCost(''); setAdditionalHours('');
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!description.trim()) { toast.error('Description is required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          reason: reason.trim() || null,
          additionalCost: Number(additionalCost || 0),
          additionalHours: additionalHours ? Number(additionalHours) : null,
        }),
      });
      if (res.ok) {
        toast.success('Change order created');
        resetForm();
        fetchOrders();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to create change order');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch(`/api/contractor/jobs/${jobId}/change-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    });
    if (res.ok) {
      toast.success(`Change order ${status}`);
      fetchOrders();
      return true;
    }
    const d = await res.json();
    toast.error(d.error || 'Failed to update');
    return false;
  };

  const handleApproveWithSignature = async (id: string, dataUrl: string) => {
    if (!approverName.trim()) { toast.error('Enter the approver name'); return; }
    setApproving(true);
    try {
      const url = await uploadDataUrl(dataUrl);
      const ok = await updateStatus(id, 'approved', {
        approvedBy: approverName.trim(),
        signatureUrl: url ?? undefined,
      });
      if (ok) {
        setApprovingId(null);
        setApproverName('');
      }
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/contractor/jobs/${jobId}/change-orders/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Change order removed'); fetchOrders(); }
    else toast.error('Failed to remove');
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><Check className="h-3 w-3" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700"><XCircle className="h-3 w-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const approvedTotal = orders
    .filter((o) => o.status === 'approved')
    .reduce((s, o) => s + Number(o.additionalCost), 0);
  const pendingTotal = orders
    .filter((o) => o.status === 'pending')
    .reduce((s, o) => s + Number(o.additionalCost), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FilePlus className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-gray-800">Change Orders</h3>
          <span className="text-[11px] text-gray-500">
            Approved {formatCurrency(approvedTotal)}
            {pendingTotal > 0 ? ` · Pending ${formatCurrency(pendingTotal)}` : ''}
          </span>
        </div>
        {canEdit && !adding && (
          <Button size="sm" onClick={() => setAdding(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> New Change Order
          </Button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-800">New change order</p>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Add recessed lighting)"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="Describe the additional work..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800 resize-none" />
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional — e.g. customer request, hidden damage)"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Additional Cost</label>
              <input type="number" min="0" step="0.01" value={additionalCost}
                onChange={(e) => setAdditionalCost(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Additional Hours</label>
              <input type="number" min="0" value={additionalHours}
                onChange={(e) => setAdditionalHours(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={resetForm} className="border-gray-200 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <FilePlus className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No change orders yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Document scope additions and get customer approval before doing extra work.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((co) => (
            <div key={co.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-gray-800">{co.title}</p>
                  {statusBadge(co.status)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-gray-800">
                    +{formatCurrency(Number(co.additionalCost))}
                  </span>
                  {canEdit && co.status === 'pending' && (
                    <button onClick={() => handleDelete(co.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{co.description}</p>
              {co.reason && <p className="text-[10px] text-gray-400 mt-1">Reason: {co.reason}</p>}
              {co.additionalHours ? (
                <p className="text-[10px] text-gray-400">+{co.additionalHours} hrs</p>
              ) : null}

              {co.status === 'approved' && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-600">
                  <Check className="h-3 w-3" />
                  Approved{co.approvedBy ? ` by ${co.approvedBy}` : ''}
                  {co.approvedAt ? ` · ${new Date(co.approvedAt).toLocaleDateString()}` : ''}
                  {co.signatureUrl && (
                    <a href={co.signatureUrl} target="_blank" rel="noopener noreferrer"
                      className="underline">view signature</a>
                  )}
                </div>
              )}

              {/* Approval actions */}
              {canEdit && co.status === 'pending' && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  {approvingId === co.id ? (
                    <div className="space-y-2">
                      <input type="text" value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        placeholder="Customer name (approver)"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
                      <InlineSignaturePad
                        disabled={approving}
                        onCapture={(dataUrl) => handleApproveWithSignature(co.id, dataUrl)}
                      />
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => setApprovingId(null)}
                          className="border-gray-200 text-xs h-7">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => { setApprovingId(co.id); setApproverName(''); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7">
                        <PenLine className="h-3 w-3 mr-1" /> Approve &amp; Sign
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(co.id, 'rejected')}
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-7">
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
