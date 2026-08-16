'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Phone, Mail, Building2, Edit, Star, AlertTriangle,
  Plus, DollarSign, CheckCircle, Clock, XCircle, FileText,
  ChevronRight, Loader2, X, MapPin, Calendar, TrendingUp,
  Receipt, Shield, Hash, Banknote, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sub {
  id: string; companyName: string; contactName: string; email: string;
  phone: string | null; licenseNumber: string | null; licenseState: string | null;
  insuranceExpiry: string | null; taxId: string | null; specialties: string[];
  status: string; paymentTerms: string; preferredPayment: string;
  bankAccountName: string | null; bankName: string | null;
  rating: number | null; notes: string | null; createdAt: string;
  insuranceCertificate: string | null; w9Form: string | null;
}

interface Job { id: string; title: string; jobNumber: string; status: string; address: string | null; city: string | null; state: string | null; estimatedStartDate: string | null; estimatedEndDate: string | null }
interface Assignment {
  id: string; jobId: string; scopeOfWork: string; agreedPrice: number;
  estimatedHours: number | null; startDate: string | null; endDate: string | null;
  status: string; actualHours: number | null; finalPrice: number | null;
  completedDate: string | null; qualityRating: number | null;
  paymentStatus: string; paidAmount: number | null; paidDate: string | null;
  job: Job;
}
interface Payment {
  id: string; amount: number; method: string; referenceNumber: string | null;
  notes: string | null; paidAt: string; assignmentId: string | null;
}
interface AvailableJob { id: string; title: string; jobNumber: string; status: string }

interface Props {
  subcontractor: Sub;
  assignments: Assignment[];
  payments: Payment[];
  availableJobs: AvailableJob[];
  ytdTotal: number;
  totalOwed: number;
  contractorId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusCfg: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  assigned:    { label: 'Assigned',    className: 'bg-blue-50 text-blue-700 border-blue-200',    icon: Clock },
  in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: RefreshCw },
  completed:   { label: 'Completed',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  canceled:    { label: 'Canceled',    className: 'bg-red-50 text-red-700 border-red-200',       icon: XCircle },
};

const payStatusCfg: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Unpaid',   className: 'bg-gray-100 text-gray-600' },
  invoiced: { label: 'Partial',  className: 'bg-amber-50 text-amber-700' },
  paid:     { label: 'Paid',     className: 'bg-emerald-50 text-emerald-700' },
};

const paymentTermLabels: Record<string, string> = {
  net_15: 'Net 15', net_30: 'Net 30', net_45: 'Net 45',
  net_60: 'Net 60', net_90: 'Net 90', due_on_receipt: 'Due on Receipt',
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange?.(n)}
          className={`text-lg ${n <= value ? 'text-amber-400' : 'text-gray-200'} ${onChange ? 'hover:text-amber-300 cursor-pointer' : 'cursor-default'}`}>
          ★
        </button>
      ))}
    </div>
  );
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Assign to Job Modal ──────────────────────────────────────────────────────

const PAYMENT_TERM_OPTIONS = [
  { value: 'due_on_receipt', label: 'Due on receipt' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'net_90', label: 'Net 90' },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH' },
  { value: 'wire', label: 'Wire' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cash', label: 'Cash' },
  { value: 'wallet', label: 'In-app wallet' },
] as const;

function AssignJobModal({
  subId, availableJobs, paymentTerms, preferredPayment, onClose, onCreated,
}: {
  subId: string;
  availableJobs: AvailableJob[];
  paymentTerms: string;
  preferredPayment: string;
  onClose: () => void;
  onCreated: (a: Assignment) => void;
}) {
  const [form, setForm] = useState({
    jobId: '', scopeOfWork: '', agreedPrice: '',
    estimatedHours: '', startDate: '', endDate: '',
    // Default to whatever's set on the subcontractor record so the user
    // sees their existing preference, but each is editable per-job.
    paymentTerms: paymentTerms || 'net_30',
    paymentMethod: preferredPayment || 'check',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.jobId || !form.scopeOfWork || !form.agreedPrice) {
      toast.error('Job, scope of work, and agreed price are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contractor/subcontractors/${subId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: form.jobId,
          scopeOfWork: form.scopeOfWork,
          agreedPrice: parseFloat(form.agreedPrice),
          estimatedHours: form.estimatedHours ? parseInt(form.estimatedHours) : null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          paymentTerms: form.paymentTerms,
          paymentMethod: form.paymentMethod,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Assignment created');
        onCreated(data.assignment);
        onClose();
      } else {
        toast.error(data.error ?? data.detail ?? 'Failed to create assignment');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Assign to Job</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job *</label>
            <select value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800">
              <option value="">Select a job...</option>
              {availableJobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title} ({j.jobNumber})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Scope of Work *</label>
            <textarea value={form.scopeOfWork} onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })}
              rows={3} placeholder="Describe what this subcontractor will do..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Agreed Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" value={form.agreedPrice}
                  onChange={(e) => setForm({ ...form, agreedPrice: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800"
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Est. Hours</label>
              <input type="number" min="0" value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800"
                placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Terms</label>
              <select
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800"
              >
                {PAYMENT_TERM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800"
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[10px] text-gray-500">
            Defaults pulled from {/* sub.companyName not in scope here */}this sub&apos;s saved preferences. Override per-job here.
          </p>
        </div>
        <div className="flex gap-2 p-5 border-t border-gray-100">
          <Button onClick={save} disabled={saving}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {saving ? 'Creating…' : 'Create Assignment'}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-gray-200">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({
  subId, assignments, onClose, onRecorded,
}: {
  subId: string; assignments: Assignment[];
  onClose: () => void; onRecorded: (p: Payment) => void;
}) {
  const unpaidAssignments = assignments.filter((a) => a.paymentStatus !== 'paid');
  const [form, setForm] = useState({
    amount: '', method: 'check', assignmentId: '',
    referenceNumber: '', notes: '', paidAt: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  // Auto-fill amount when assignment selected
  const handleAssignmentChange = (assignmentId: string) => {
    const a = assignments.find((x) => x.id === assignmentId);
    if (a) {
      const owed = Number(a.agreedPrice) - Number(a.paidAmount ?? 0);
      setForm((f) => ({ ...f, assignmentId, amount: owed.toFixed(2) }));
    } else {
      setForm((f) => ({ ...f, assignmentId }));
    }
  };

  const save = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contractor/subcontractors/${subId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          method: form.method,
          assignmentId: form.assignmentId || null,
          referenceNumber: form.referenceNumber || null,
          notes: form.notes || null,
          paidAt: form.paidAt,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Payment recorded');
        onRecorded(data.payment);
        onClose();
      } else {
        toast.error(data.error ?? 'Failed to record payment');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Record Payment to Sub</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {unpaidAssignments.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Link to Assignment (optional)</label>
              <select value={form.assignmentId} onChange={(e) => handleAssignmentChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800">
                <option value="">General payment (not linked to a job)</option>
                {unpaidAssignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.job.title} — {formatCurrency(Number(a.agreedPrice) - Number(a.paidAmount ?? 0))} owed
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min="0.01" step="0.01" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800"
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date Paid</label>
              <input type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Method</label>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800">
              {['check', 'ach', 'wire', 'zelle', 'cash', 'other'].map((m) => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reference # (check #, wire ref, etc.)</label>
            <input type="text" value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800"
              placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-800"
              placeholder="Optional" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-gray-100">
          <Button onClick={save} disabled={saving}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
            {saving ? 'Recording…' : 'Record Payment'}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-gray-200">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Assignment Row ───────────────────────────────────────────────────────────

function AssignmentRow({
  assignment, subId, onUpdated,
}: {
  assignment: Assignment; subId: string; onUpdated: (a: Assignment) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [rating, setRating] = useState(assignment.qualityRating ?? 0);

  const cfg = statusCfg[assignment.status] ?? statusCfg.assigned;
  const StatusIcon = cfg.icon;
  const payCfg = payStatusCfg[assignment.paymentStatus] ?? payStatusCfg.pending;
  const owed = Number(assignment.agreedPrice) - Number(assignment.paidAmount ?? 0);
  const addr = [assignment.job.address, assignment.job.city, assignment.job.state].filter(Boolean).join(', ');

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const res = await fetch(
        `/api/contractor/subcontractors/${subId}/assignments/${assignment.id}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }
      );
      const data = await res.json();
      if (res.ok) { toast.success('Status updated'); onUpdated(data.assignment); }
      else toast.error(data.error ?? 'Failed');
    } finally { setUpdating(false); }
  };

  const submitRating = async () => {
    setUpdating(true);
    try {
      const res = await fetch(
        `/api/contractor/subcontractors/${subId}/assignments/${assignment.id}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qualityRating: rating }) }
      );
      const data = await res.json();
      if (res.ok) { toast.success('Rating saved'); onUpdated(data.assignment); setShowRate(false); }
      else toast.error(data.error ?? 'Failed');
    } finally { setUpdating(false); }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link href={`/contractor-dashboard/jobs/${assignment.jobId}`}
              className="text-sm font-bold text-gray-900 hover:text-amber-600 truncate">
              {assignment.job.title}
            </Link>
            <span className="text-[10px] font-mono text-gray-400">{assignment.job.jobNumber}</span>
          </div>
          {addr && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <MapPin className="h-3 w-3" />{addr}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.className}`}>
            <StatusIcon className="h-3 w-3" />{cfg.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${payCfg.className}`}>
            {payCfg.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-700 leading-relaxed">{assignment.scopeOfWork}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] text-gray-500 font-medium">Agreed Price</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(assignment.agreedPrice))}</p>
          </div>
          {assignment.finalPrice && (
            <div>
              <p className="text-[10px] text-gray-500 font-medium">Final Price</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(assignment.finalPrice))}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-gray-500 font-medium">Paid</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(Number(assignment.paidAmount ?? 0))}</p>
          </div>
          {owed > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 font-medium">Still Owed</p>
              <p className="text-sm font-bold text-red-600">{formatCurrency(owed)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
          {assignment.startDate && (
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Start: {fmt(assignment.startDate)}</span>
          )}
          {assignment.endDate && (
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />End: {fmt(assignment.endDate)}</span>
          )}
          {assignment.estimatedHours && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{assignment.estimatedHours}h est.</span>
          )}
          {assignment.actualHours && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{assignment.actualHours}h actual</span>
          )}
        </div>

        {/* Quality rating */}
        {assignment.qualityRating ? (
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-gray-500 font-medium">Quality:</p>
            <StarRating value={assignment.qualityRating} />
          </div>
        ) : assignment.status === 'completed' && !showRate ? (
          <button onClick={() => setShowRate(true)}
            className="text-[10px] text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1">
            <Star className="h-3 w-3" /> Rate this work
          </button>
        ) : null}

        {showRate && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <StarRating value={rating} onChange={setRating} />
            <Button size="sm" onClick={submitRating} disabled={updating || rating === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7">
              {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
            <button onClick={() => setShowRate(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Status actions */}
        {assignment.status !== 'completed' && assignment.status !== 'canceled' && (
          <div className="flex gap-2 pt-1 border-t border-gray-50 flex-wrap">
            {assignment.status === 'assigned' && (
              <Button size="sm" variant="outline" onClick={() => updateStatus('in_progress')} disabled={updating}
                className="border-amber-200 text-amber-700 hover:bg-amber-50 text-xs h-7">
                Mark In Progress
              </Button>
            )}
            {assignment.status === 'in_progress' && (
              <Button size="sm" onClick={() => updateStatus('completed')} disabled={updating}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-7">
                <CheckCircle className="h-3 w-3 mr-1" /> Mark Complete
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => updateStatus('canceled')} disabled={updating}
              className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-7">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SubcontractorDetailClient({
  subcontractor: initialSub, assignments: initialAssignments,
  payments: initialPayments, availableJobs, ytdTotal, totalOwed, contractorId,
}: Props) {
  const [sub] = useState<Sub>(initialSub);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const insuranceExpiring = sub.insuranceExpiry &&
    new Date(sub.insuranceExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const needs1099 = ytdTotal >= 600;

  const handleAssignmentCreated = useCallback((a: Assignment) => {
    setAssignments((prev) => [a, ...prev]);
  }, []);

  const handleAssignmentUpdated = useCallback((updated: Assignment) => {
    setAssignments((prev) => prev.map((a) => a.id === updated.id ? updated : a));
  }, []);

  const handlePaymentRecorded = useCallback((p: Payment) => {
    setPayments((prev) => [p, ...prev]);
    // Refresh assignments to show updated paidAmount
    fetch(`/api/contractor/subcontractors/${sub.id}/assignments`)
      .then((r) => r.json())
      .then((d) => { if (d.assignments) setAssignments(d.assignments); });
  }, [sub.id]);

  const handleDelete = async () => {
    if (!confirm(`Delete ${sub.companyName}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contractor/subcontractors/${sub.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Subcontractor deleted');
        window.location.href = '/contractor-dashboard/subcontractors';
      } else {
        toast.error('Failed to delete');
      }
    } finally {
      setDeleting(false);
    }
  };

  const activeAssignments = assignments.filter((a) => a.status !== 'canceled');
  const completedAssignments = assignments.filter((a) => a.status === 'completed');
  const unpaidAssignments = assignments.filter((a) => a.paymentStatus !== 'paid' && a.status !== 'canceled');

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/contractor-dashboard/subcontractors">
            <Button variant="outline" size="icon" className="border-gray-200 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-black">{sub.companyName}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                sub.status === 'blacklisted' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>{sub.status}</span>
              {insuranceExpiring && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  <AlertTriangle className="h-3 w-3" /> Insurance Expiring
                </span>
              )}
              {needs1099 && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                  <FileText className="h-3 w-3" /> 1099 Required
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{sub.contactName}</p>
            {sub.rating && (
              <div className="flex items-center gap-1 mt-1">
                <StarRating value={Math.round(Number(sub.rating))} />
                <span className="text-xs text-gray-500">{Number(sub.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowAssignModal(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Assign to Job
          </Button>
          <Button onClick={() => setShowPayModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-semibold">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Record Payment
          </Button>
          <Link href={`/contractor-dashboard/subcontractors/${sub.id}/edit`}>
            <Button variant="outline" size="sm" className="border-gray-200 text-xs">
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}
            className="border-red-200 text-red-600 hover:bg-red-50 text-xs">
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete'}
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Jobs', value: String(activeAssignments.length), icon: Briefcase, color: 'from-blue-400 to-indigo-400' },
          { label: 'Completed', value: String(completedAssignments.length), icon: CheckCircle, color: 'from-emerald-400 to-cyan-400' },
          { label: 'Total Owed', value: formatCurrency(totalOwed), icon: DollarSign, color: totalOwed > 0 ? 'from-red-400 to-rose-400' : 'from-gray-300 to-gray-400', alert: totalOwed > 0 },
          { label: `YTD Paid (${new Date().getFullYear()})`, value: formatCurrency(ytdTotal), icon: TrendingUp, color: 'from-violet-400 to-purple-400' },
        ].map(({ label, value, icon: Icon, color, alert }) => (
          <div key={label} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden">
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${color} opacity-10 rounded-bl-full`} />
            {alert && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 1099 alert */}
      {needs1099 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-violet-200 bg-violet-50">
          <FileText className="h-4 w-4 text-violet-600 shrink-0" />
          <p className="text-xs text-violet-800">
            <strong>1099 Required:</strong> You've paid {sub.companyName} {formatCurrency(ytdTotal)} this year.
            Payments ≥ $600 require a 1099-NEC. Ensure you have their W-9 on file.
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="jobs">
        <TabsList className="bg-white border border-gray-200 rounded-xl p-1 gap-1">
          {[
            { value: 'jobs', label: `Jobs (${activeAssignments.length})` },
            { value: 'payments', label: `Payments (${payments.length})` },
            { value: 'profile', label: 'Profile' },
            { value: 'documents', label: 'Documents' },
          ].map(({ value, label }) => (
            <TabsTrigger key={value} value={value}
              className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg px-3 py-1.5">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Jobs Tab ── */}
        <TabsContent value="jobs" className="mt-4 space-y-3">
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <Briefcase className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-600">No job assignments yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Assign this sub to a job to track their work and payments.</p>
              <Button onClick={() => setShowAssignModal(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Assign to First Job
              </Button>
            </div>
          ) : (
            assignments.map((a) => (
              <AssignmentRow key={a.id} assignment={a} subId={sub.id} onUpdated={handleAssignmentUpdated} />
            ))
          )}
        </TabsContent>

        {/* ── Payments Tab ── */}
        <TabsContent value="payments" className="mt-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Payment History</h3>
              <Button size="sm" onClick={() => setShowPayModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Record Payment
              </Button>
            </div>

            {/* Unpaid assignments summary */}
            {unpaidAssignments.length > 0 && (
              <div className="p-4 border-b border-gray-100 bg-amber-50/50">
                <p className="text-xs font-semibold text-gray-700 mb-2">Outstanding Balances</p>
                <div className="space-y-1.5">
                  {unpaidAssignments.map((a) => {
                    const owed = Number(a.agreedPrice) - Number(a.paidAmount ?? 0);
                    return (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate flex-1">{a.job.title}</span>
                        <span className="font-bold text-red-600 ml-2">{formatCurrency(owed)}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200">
                    <span className="font-bold text-gray-800">Total Owed</span>
                    <span className="font-bold text-red-600">{formatCurrency(totalOwed)}</span>
                  </div>
                </div>
              </div>
            )}

            {payments.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No payments recorded yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Banknote className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{formatCurrency(Number(p.amount))}</p>
                      <p className="text-[10px] text-gray-500">
                        {p.method.toUpperCase()}
                        {p.referenceNumber ? ` · Ref: ${p.referenceNumber}` : ''}
                        {p.notes ? ` · ${p.notes}` : ''}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 shrink-0">{fmt(p.paidAt)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* YTD total */}
            {payments.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <span className="text-xs font-semibold text-gray-600">YTD Total ({new Date().getFullYear()})</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(ytdTotal)}</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" /> Contact
              </h3>
              <div className="space-y-2 text-xs">
                <div><p className="text-gray-500">Contact Name</p><p className="font-semibold text-gray-800">{sub.contactName}</p></div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`mailto:${sub.email}`} className="text-blue-600 hover:underline">{sub.email}</a>
                </div>
                {sub.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <a href={`tel:${sub.phone}`} className="text-blue-600 hover:underline">{sub.phone}</a>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" /> Payment Terms
              </h3>
              <div className="space-y-2 text-xs">
                <div><p className="text-gray-500">Terms</p><p className="font-semibold text-gray-800">{paymentTermLabels[sub.paymentTerms] ?? sub.paymentTerms}</p></div>
                <div><p className="text-gray-500">Preferred Method</p><p className="font-semibold text-gray-800 uppercase">{sub.preferredPayment}</p></div>
                {sub.bankName && <div><p className="text-gray-500">Bank</p><p className="font-semibold text-gray-800">{sub.bankName}</p></div>}
                {sub.bankAccountName && <div><p className="text-gray-500">Account Name</p><p className="font-semibold text-gray-800">{sub.bankAccountName}</p></div>}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" /> License & Insurance
              </h3>
              <div className="space-y-2 text-xs">
                {sub.licenseNumber && (
                  <div><p className="text-gray-500">License</p>
                    <p className="font-semibold text-gray-800">{sub.licenseNumber}{sub.licenseState ? ` (${sub.licenseState})` : ''}</p>
                  </div>
                )}
                {sub.insuranceExpiry && (
                  <div><p className="text-gray-500">Insurance Expires</p>
                    <p className={`font-semibold ${insuranceExpiring ? 'text-red-600' : 'text-gray-800'}`}>
                      {fmt(sub.insuranceExpiry)}
                      {insuranceExpiring && ' ⚠ Expiring soon'}
                    </p>
                  </div>
                )}
                {sub.taxId && (
                  <div><p className="text-gray-500">Tax ID (EIN)</p>
                    <p className="font-semibold text-gray-800 font-mono">{sub.taxId}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-400" /> Specialties
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {sub.specialties?.length > 0
                  ? sub.specialties.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium">{s}</span>
                  ))
                  : <p className="text-xs text-gray-400">No specialties listed</p>
                }
              </div>
              {sub.notes && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">Notes</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{sub.notes}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Documents Tab ── */}
        <TabsContent value="documents" className="mt-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Documents on File</h3>
              <p className="text-xs text-gray-500 mt-0.5">W-9, insurance certificates, contracts</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: 'W-9 Form', url: sub.w9Form, required: true, note: 'Required for 1099 filing' },
                { label: 'Insurance Certificate', url: sub.insuranceCertificate, required: true, note: sub.insuranceExpiry ? `Expires ${fmt(sub.insuranceExpiry)}` : 'Certificate of insurance' },
              ].map(({ label, url, required, note }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${url ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <FileText className={`h-4 w-4 ${url ? 'text-emerald-500' : 'text-gray-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{label}</p>
                    <p className="text-[10px] text-gray-500">{note}</p>
                  </div>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="border-gray-200 text-xs h-7">
                        View
                      </Button>
                    </a>
                  ) : (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${required ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {required ? 'Missing' : 'Not uploaded'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <Link href={`/contractor-dashboard/subcontractors/${sub.id}/edit`}>
                <Button size="sm" variant="outline" className="border-gray-200 text-xs">
                  <Edit className="h-3.5 w-3.5 mr-1.5" /> Upload Documents
                </Button>
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showAssignModal && (
        <AssignJobModal
          subId={sub.id}
          availableJobs={availableJobs}
          paymentTerms={sub.paymentTerms}
          preferredPayment={sub.preferredPayment}
          onClose={() => setShowAssignModal(false)}
          onCreated={handleAssignmentCreated}
        />
      )}
      {showPayModal && (
        <RecordPaymentModal
          subId={sub.id}
          assignments={assignments}
          onClose={() => setShowPayModal(false)}
          onRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  );
}

// Missing import fix
function Briefcase({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}
