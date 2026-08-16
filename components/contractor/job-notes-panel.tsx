'use client';

/**
 * JobNotesPanel
 *
 * Job-scoped notes log. Lets a contractor add notes manually, tag them by
 * type (general / issue / update / customer communication), and optionally
 * mark a note visible to the customer.
 *
 * Reads/writes through /api/contractor/jobs/[id]/notes.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  MessageSquare, Plus, Trash2, RefreshCw, X,
  AlertTriangle, Info, Megaphone, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  id: string;
  content: string;
  type: string;
  isInternal: boolean;
  createdAt: string;
}

interface Props {
  jobId: string;
  canEdit?: boolean;
}

const TYPES: { value: string; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'issue', label: 'Issue' },
  { value: 'update', label: 'Progress Update' },
  { value: 'customer_communication', label: 'Customer Communication' },
];

const typeStyles: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  general: {
    badge: 'bg-gray-100 text-gray-600',
    icon: <MessageSquare className="h-3 w-3" />,
    label: 'General',
  },
  issue: {
    badge: 'bg-red-50 text-red-600',
    icon: <AlertTriangle className="h-3 w-3" />,
    label: 'Issue',
  },
  update: {
    badge: 'bg-blue-50 text-blue-600',
    icon: <Info className="h-3 w-3" />,
    label: 'Update',
  },
  customer_communication: {
    badge: 'bg-violet-50 text-violet-600',
    icon: <Megaphone className="h-3 w-3" />,
    label: 'Customer',
  },
  status_change: {
    badge: 'bg-amber-50 text-amber-600',
    icon: <Info className="h-3 w-3" />,
    label: 'Status',
  },
};

export function JobNotesPanel({ jobId, canEdit = true }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [visibleToCustomer, setVisibleToCustomer] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const reset = () => {
    setAdding(false);
    setContent('');
    setType('general');
    setVisibleToCustomer(false);
  };

  const handleSave = async () => {
    if (!content.trim()) { toast.error('Note cannot be empty'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          type,
          isInternal: !visibleToCustomer,
        }),
      });
      if (res.ok) {
        toast.success('Note added');
        reset();
        fetchNotes();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to add note');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/contractor/jobs/${jobId}/notes?noteId=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Note removed');
      fetchNotes();
    } else {
      toast.error('Failed to remove note');
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-gray-800">Job Notes</h3>
          {notes.length > 0 && (
            <span className="text-[11px] text-gray-500">{notes.length}</span>
          )}
        </div>
        {canEdit && !adding && (
          <Button size="sm" onClick={() => setAdding(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> Add Note
          </Button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-800">New note</p>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Add a note about this job..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800 resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setVisibleToCustomer((v) => !v)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-xs transition-colors ${
                visibleToCustomer
                  ? 'border-violet-300 bg-violet-100 text-violet-700'
                  : 'border-gray-300 bg-white text-gray-600'
              }`}
            >
              {visibleToCustomer ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {visibleToCustomer ? 'Visible to customer' : 'Internal only'}
            </button>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={reset}
              className="border-gray-200 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Add Note'}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No notes yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Log issues, progress updates, or customer conversations as you go.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const style = typeStyles[note.type] ?? typeStyles.general;
            return (
              <div key={note.id}
                className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${style.badge}`}>
                      {style.icon} {style.label}
                    </span>
                    {!note.isInternal && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <Eye className="h-3 w-3" /> Customer
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <button onClick={() => handleDelete(note.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{note.content}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
