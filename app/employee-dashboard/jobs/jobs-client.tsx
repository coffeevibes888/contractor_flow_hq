'use client';

import { useState } from 'react';
import {
  Briefcase, MapPin, Calendar, Clock, User, Phone,
  Camera, MessageSquare, Navigation, ChevronRight,
  Package, CheckCircle, AlertCircle, FileText,
  ArrowLeft, Send, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Material {
  id: string;
  name: string;
  unit: string;
  quantityNeeded: number;
  quantityLoaded: number;
  status: string;
}

interface JobNote {
  id: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
}

interface Job {
  id: string;
  title: string;
  jobNumber: string;
  description: string | null;
  status: string;
  address: string;
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  priority: string;
  notes: string | null;
  photos: string[];
  beforePhotos: string[];
  afterPhotos: string[];
  customer: { name: string; phone: string | null } | null;
  materials: Material[];
  jobNotes: JobNote[];
}

interface Props {
  employeeId: string;
  contractorId: string;
  jobs: Job[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  on_hold: { label: 'On Hold', color: 'bg-slate-100 text-slate-600' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  approved: { label: 'Approved', color: 'bg-violet-100 text-violet-700' },
};

export default function JobsClient({ employeeId, contractorId, jobs }: Props) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [noteText, setNoteText] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  const activeJobs = jobs.filter(j => ['scheduled', 'in_progress', 'approved'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedJob) return;
    setSendingNote(true);
    try {
      await fetch('/api/employee/job-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          contractorId,
          jobId: selectedJob.id,
          content: noteText.trim(),
        }),
      });
      // Add note locally
      selectedJob.jobNotes.unshift({
        id: Date.now().toString(),
        content: noteText.trim(),
        createdAt: new Date().toISOString(),
        isInternal: false,
      });
      setNoteText('');
    } catch {} finally { setSendingNote(false); }
  };

  // ── Job Detail View ───────────────────────────────────────────────────────
  if (selectedJob) {
    const st = STATUS_CONFIG[selectedJob.status] || { label: selectedJob.status, color: 'bg-slate-100 text-slate-600' };
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedJob(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </button>

        {/* Job header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase', st.color)}>{st.label}</span>
                <span className="text-xs text-slate-400">{selectedJob.jobNumber}</span>
                {selectedJob.priority === 'high' || selectedJob.priority === 'urgent' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">{selectedJob.priority}</span>
                ) : null}
              </div>
              <h1 className="text-xl font-bold text-slate-900">{selectedJob.title}</h1>
              {selectedJob.address && (
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" /> {selectedJob.address}
                </p>
              )}
            </div>
            {selectedJob.address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedJob.address)}`} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 h-10 w-10 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600">
                <Navigation className="h-5 w-5" />
              </a>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
            {selectedJob.estimatedStartDate && (
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(selectedJob.estimatedStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
            {selectedJob.estimatedHours && (
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{selectedJob.estimatedHours}h estimated</span>
            )}
            {selectedJob.customer && (
              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {selectedJob.customer.name}</span>
            )}
            {selectedJob.customer?.phone && (
              <a href={`tel:${selectedJob.customer.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                <Phone className="h-3.5 w-3.5" /> {selectedJob.customer.phone}
              </a>
            )}
          </div>
        </div>

        {/* Description */}
        {selectedJob.description && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Scope of Work</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedJob.description}</p>
          </div>
        )}

        {/* Materials needed */}
        {selectedJob.materials.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" /> Materials ({selectedJob.materials.length})
            </h3>
            <div className="space-y-2">
              {selectedJob.materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{m.name}</p>
                    <p className="text-xs text-slate-500">Need {m.quantityNeeded} {m.unit} · Loaded {m.quantityLoaded}</p>
                  </div>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                    m.quantityLoaded >= m.quantityNeeded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {m.quantityLoaded >= m.quantityNeeded ? '✓ Ready' : 'Needs loading'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {(selectedJob.beforePhotos.length > 0 || selectedJob.afterPhotos.length > 0 || selectedJob.photos.length > 0) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-500" /> Photos
            </h3>
            {selectedJob.beforePhotos.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Before</p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedJob.beforePhotos.map((url, i) => (
                    <img key={i} src={url} alt={`Before ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              </div>
            )}
            {selectedJob.afterPhotos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">After</p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedJob.afterPhotos.map((url, i) => (
                    <img key={i} src={url} alt={`After ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-500" /> Notes
          </h3>

          {/* Add note */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              placeholder="Add a note..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button onClick={handleAddNote} disabled={!noteText.trim() || sendingNote}
              className="h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-50">
              {sendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {selectedJob.jobNotes.length === 0 ? (
            <p className="text-sm text-slate-400">No notes yet.</p>
          ) : (
            <div className="space-y-2">
              {selectedJob.jobNotes.map((note) => (
                <div key={note.id} className="bg-slate-50 rounded-lg px-4 py-2.5">
                  <p className="text-sm text-slate-700">{note.content}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Jobs List ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Jobs</h1>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Active ({activeJobs.length})</h2>
          <div className="space-y-3">
            {activeJobs.map((job) => <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />)}
          </div>
        </div>
      )}

      {/* Completed jobs */}
      {completedJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Completed ({completedJobs.length})</h2>
          <div className="space-y-3">
            {completedJobs.map((job) => <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />)}
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No jobs assigned to you yet.</p>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const st = STATUS_CONFIG[job.status] || { label: job.status, color: 'bg-slate-100 text-slate-600' };
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', st.color)}>{st.label}</span>
            <span className="text-xs text-slate-400">{job.jobNumber}</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{job.title}</h3>
          {job.address && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" /> {job.address}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            {job.estimatedStartDate && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(job.estimatedStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
            {job.materials.length > 0 && (
              <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {job.materials.length} materials</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}
