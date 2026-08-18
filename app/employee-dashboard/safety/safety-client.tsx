'use client';

import { useState } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, ClipboardCheck,
  Plus, Send, Loader2, Camera, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Checklist {
  id: string;
  name: string;
  description: string | null;
  items: string[];
  jobType: string | null;
}

interface Completion {
  id: string;
  checklistId: string;
  jobId: string | null;
  completedAt: string | null;
  notes: string | null;
}

interface Incident {
  id: string;
  type: string;
  severity: string;
  description: string;
  location: string | null;
  status: string;
  createdAt: string;
  photos: string[];
}

interface Props {
  employeeId: string;
  contractorId: string;
  employeeName: string;
  checklists: Checklist[];
  completions: Completion[];
  incidents: Incident[];
}

const INCIDENT_TYPES = [
  { value: 'injury', label: 'Injury', icon: '🤕' },
  { value: 'near_miss', label: 'Near Miss', icon: '⚠️' },
  { value: 'property_damage', label: 'Property Damage', icon: '🏚️' },
  { value: 'equipment_failure', label: 'Equipment Failure', icon: '🔧' },
  { value: 'hazard', label: 'Hazard Found', icon: '☢️' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export default function SafetyClient({ employeeId, contractorId, employeeName, checklists, completions, incidents }: Props) {
  const [tab, setTab] = useState<'checklists' | 'incidents'>('checklists');
  const [activeChecklist, setActiveChecklist] = useState<Checklist | null>(null);
  const [checklistResponses, setChecklistResponses] = useState<Record<number, boolean>>({});
  const [checklistNotes, setChecklistNotes] = useState('');
  const [submittingChecklist, setSubmittingChecklist] = useState(false);

  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ type: 'near_miss', severity: 'medium', description: '', location: '' });
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmitChecklist = async () => {
    if (!activeChecklist) return;
    const allChecked = activeChecklist.items.every((_, i) => checklistResponses[i]);
    if (!allChecked) { setError('All items must be checked before submitting.'); return; }

    setSubmittingChecklist(true);
    setError('');
    try {
      await fetch('/api/employee/safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_checklist',
          employeeId, contractorId,
          checklistId: activeChecklist.id,
          responses: checklistResponses,
          notes: checklistNotes || null,
        }),
      });
      setSuccess(`${activeChecklist.name} completed!`);
      setActiveChecklist(null);
      setChecklistResponses({});
      setChecklistNotes('');
    } catch { setError('Failed to submit.'); }
    finally { setSubmittingChecklist(false); }
  };

  const handleSubmitIncident = async () => {
    if (!incidentForm.description.trim()) { setError('Description is required.'); return; }
    setSubmittingIncident(true);
    setError('');
    try {
      await fetch('/api/employee/safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report_incident',
          employeeId, contractorId,
          ...incidentForm,
        }),
      });
      setSuccess('Incident report submitted. Your employer has been notified.');
      setShowIncidentForm(false);
      setIncidentForm({ type: 'near_miss', severity: 'medium', description: '', location: '' });
    } catch { setError('Failed to submit.'); }
    finally { setSubmittingIncident(false); }
  };

  // ── Active checklist view ─────────────────────────────────────────────────
  if (activeChecklist) {
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveChecklist(null)} className="text-sm text-slate-500 hover:text-slate-900">← Back to Safety</button>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardCheck className="h-6 w-6 text-emerald-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{activeChecklist.name}</h2>
              {activeChecklist.description && <p className="text-sm text-slate-500">{activeChecklist.description}</p>}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {activeChecklist.items.map((item, i) => (
              <label key={i} className={cn(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                checklistResponses[i] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'
              )}>
                <input
                  type="checkbox"
                  checked={!!checklistResponses[i]}
                  onChange={(e) => setChecklistResponses(prev => ({ ...prev, [i]: e.target.checked }))}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className={cn('text-sm', checklistResponses[i] ? 'text-emerald-800 line-through' : 'text-slate-700')}>{item}</span>
              </label>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea value={checklistNotes} onChange={(e) => setChecklistNotes(e.target.value)} rows={2} placeholder="Any issues or observations..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>

          {error && <p className="text-sm text-red-600 mb-3 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {error}</p>}

          <button onClick={handleSubmitChecklist} disabled={submittingChecklist}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
            {submittingChecklist ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Complete Checklist
          </button>
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Safety</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setTab('checklists')} className={cn('px-4 py-2 rounded-lg text-sm font-medium', tab === 'checklists' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              <ClipboardCheck className="h-4 w-4 inline mr-1" /> Checklists
            </button>
            <button onClick={() => setTab('incidents')} className={cn('px-4 py-2 rounded-lg text-sm font-medium', tab === 'incidents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              <AlertTriangle className="h-4 w-4 inline mr-1" /> Incidents
            </button>
          </div>
          <button onClick={() => { setShowIncidentForm(true); setTab('incidents'); setError(''); setSuccess(''); }}
            className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
            <AlertTriangle className="h-3.5 w-3.5" /> Report
          </button>
        </div>
      </div>

      {success && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700"><CheckCircle className="h-4 w-4" /> {success}</div>}

      {/* Checklists tab */}
      {tab === 'checklists' && (
        <div className="space-y-3">
          {checklists.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Shield className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No safety checklists assigned yet.</p>
            </div>
          ) : (
            checklists.map((cl) => {
              const completed = completions.some(c => c.checklistId === cl.id);
              return (
                <button key={cl.id} onClick={() => !completed && setActiveChecklist(cl)}
                  className={cn('w-full text-left bg-white rounded-xl border p-4 transition-all', completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:shadow-md hover:border-slate-300')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {completed ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <ClipboardCheck className="h-5 w-5 text-slate-400" />}
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{cl.name}</p>
                        <p className="text-xs text-slate-500">{cl.items.length} items{cl.jobType ? ` · ${cl.jobType}` : ''}</p>
                      </div>
                    </div>
                    {completed ? <span className="text-xs font-bold text-emerald-600">✓ Done</span> : <span className="text-xs text-slate-400">Tap to start</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Incidents tab */}
      {tab === 'incidents' && (
        <div className="space-y-4">
          {/* Incident form */}
          {showIncidentForm && (
            <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Report Incident
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {INCIDENT_TYPES.map(t => (
                    <button key={t.value} onClick={() => setIncidentForm(prev => ({ ...prev, type: t.value }))}
                      className={cn('px-3 py-2 rounded-lg border text-sm font-medium text-left', incidentForm.type === t.value ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Severity</label>
                <div className="flex gap-2">
                  {SEVERITY_LEVELS.map(s => (
                    <button key={s.value} onClick={() => setIncidentForm(prev => ({ ...prev, severity: s.value }))}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-bold', incidentForm.severity === s.value ? `${s.color} ring-2 ring-offset-1 ring-current` : 'bg-slate-100 text-slate-500')}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea value={incidentForm.description} onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))} rows={3}
                  placeholder="What happened? Include details about circumstances, injuries, and immediate actions taken..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input type="text" value={incidentForm.location} onChange={(e) => setIncidentForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Job site address or area description"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>

              {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowIncidentForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleSubmitIncident} disabled={submittingIncident}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {submittingIncident ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Report
                </button>
              </div>
            </div>
          )}

          {/* Incidents list */}
          {incidents.length === 0 && !showIncidentForm ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Shield className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No incidents reported. Keep up the safe work!</p>
            </div>
          ) : (
            incidents.map((inc) => {
              const typeInfo = INCIDENT_TYPES.find(t => t.value === inc.type) || INCIDENT_TYPES[5];
              const sevInfo = SEVERITY_LEVELS.find(s => s.value === inc.severity) || SEVERITY_LEVELS[1];
              return (
                <div key={inc.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{typeInfo.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900 text-sm">{typeInfo.label}</p>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', sevInfo.color)}>{sevInfo.label}</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', inc.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                            {inc.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{inc.description}</p>
                        {inc.location && <p className="text-xs text-slate-400 mt-1">📍 {inc.location}</p>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 flex-shrink-0">{new Date(inc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
