'use client';

import { useState } from 'react';
import {
  Umbrella, Plus, CheckCircle, XCircle, Clock, Calendar,
  Loader2, AlertTriangle, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeOffRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  hours: number | null;
  reason: string | null;
  status: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

interface Props {
  employeeId: string;
  contractorId: string;
  requests: TimeOffRequest[];
}

const REQUEST_TYPES = [
  { value: 'vacation', label: 'Vacation / PTO', icon: '🏖️' },
  { value: 'sick', label: 'Sick Day', icon: '🤒' },
  { value: 'personal', label: 'Personal Day', icon: '👤' },
  { value: 'family', label: 'Family Emergency', icon: '👨‍👩‍👧' },
  { value: 'jury_duty', label: 'Jury Duty', icon: '⚖️' },
  { value: 'bereavement', label: 'Bereavement', icon: '🕊️' },
  { value: 'other', label: 'Other', icon: '📋' },
];

export default function TimeOffClient({ employeeId, contractorId, requests }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allRequests, setAllRequests] = useState(requests);

  const [formData, setFormData] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    hours: '',
    reason: '',
  });

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;
  const approvedCount = allRequests.filter(r => r.status === 'approved').length;

  const handleSubmit = async () => {
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('End date must be after start date.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/employee/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          contractorId,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          hours: formData.hours ? Number(formData.hours) : null,
          reason: formData.reason || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to submit request.'); return; }

      setSuccess('Time-off request submitted! Your employer will review it.');
      setShowForm(false);
      setFormData({ type: 'vacation', startDate: '', endDate: '', hours: '', reason: '' });

      // Add to local state
      setAllRequests(prev => [{
        id: json.id || Date.now().toString(),
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        hours: formData.hours ? Number(formData.hours) : null,
        reason: formData.reason || null,
        status: 'pending',
        reviewedAt: null,
        reviewNotes: null,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Off</h1>
          <p className="text-sm text-slate-500">{pendingCount} pending · {approvedCount} approved</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all"
        >
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Request Time Off</h2>

          {/* Type selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REQUEST_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setFormData(prev => ({ ...prev, type: t.value }))}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    formData.type === t.value
                      ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-500/20'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span>{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Hours (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Hours (optional)</label>
            <input
              type="number"
              value={formData.hours}
              onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
              placeholder="e.g. 8 for one full day"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={2}
              placeholder="Brief reason for time off..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* Requests list */}
      <div className="space-y-3">
        {allRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Umbrella className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No time-off requests yet.</p>
          </div>
        ) : (
          allRequests.map((req) => {
            const typeInfo = REQUEST_TYPES.find(t => t.value === req.type) || REQUEST_TYPES[6];
            return (
              <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{typeInfo.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 text-sm">{typeInfo.label}</p>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(req.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {req.startDate !== req.endDate && ` – ${new Date(req.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        {req.hours && ` · ${req.hours}h`}
                      </p>
                      {req.reason && <p className="text-xs text-slate-400 mt-1">{req.reason}</p>}
                      {req.reviewNotes && (
                        <p className="text-xs text-slate-500 mt-1 italic bg-slate-50 rounded px-2 py-1">
                          Manager note: {req.reviewNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
      status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
      status === 'denied' || status === 'rejected' ? 'bg-red-100 text-red-700' :
      'bg-amber-100 text-amber-700'
    )}>
      {status === 'approved' && <CheckCircle className="h-2.5 w-2.5" />}
      {(status === 'denied' || status === 'rejected') && <XCircle className="h-2.5 w-2.5" />}
      {status === 'pending' && <Clock className="h-2.5 w-2.5" />}
      {status}
    </span>
  );
}
