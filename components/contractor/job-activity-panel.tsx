'use client';

/**
 * JobActivityPanel
 *
 * Read-only unified timeline of everything that happened on a job: notes,
 * status changes, photos, expenses, change orders, milestone completions.
 * Backed by /api/contractor/jobs/[id]/activity.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, MessageSquare, Camera, DollarSign, FilePlus,
  CheckCircle2, Sparkles, RefreshCw, AlertTriangle, Megaphone, Info,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'note' | 'photo' | 'expense' | 'change_order' | 'milestone' | 'created';
  title: string;
  detail?: string;
  amount?: number;
  at: string;
  meta?: Record<string, any>;
}

interface Props {
  jobId: string;
}

function iconFor(item: ActivityItem) {
  switch (item.type) {
    case 'note':
      if (item.meta?.noteType === 'issue') return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      if (item.meta?.noteType === 'customer_communication') return <Megaphone className="h-3.5 w-3.5 text-violet-500" />;
      if (item.meta?.noteType === 'update') return <Info className="h-3.5 w-3.5 text-blue-500" />;
      return <MessageSquare className="h-3.5 w-3.5 text-gray-500" />;
    case 'photo': return <Camera className="h-3.5 w-3.5 text-cyan-500" />;
    case 'expense': return <DollarSign className="h-3.5 w-3.5 text-emerald-500" />;
    case 'change_order': return <FilePlus className="h-3.5 w-3.5 text-amber-500" />;
    case 'milestone': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case 'created': return <Sparkles className="h-3.5 w-3.5 text-violet-500" />;
    default: return <Activity className="h-3.5 w-3.5 text-gray-400" />;
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function JobActivityPanel({ jobId }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.activity ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-gray-800">Activity Timeline</h3>
        </div>
        <button onClick={fetchActivity}
          className="text-[11px] text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <Activity className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No activity yet.</p>
        </div>
      ) : (
        <div className="relative pl-5">
          {/* vertical line */}
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-gray-200" />
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <div className="absolute -left-5 top-0.5 h-[18px] w-[18px] rounded-full bg-white border border-gray-200 flex items-center justify-center">
                  {iconFor(item)}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{item.title}</p>
                    {item.detail && (
                      <p className="text-[11px] text-gray-500 whitespace-pre-wrap break-words">{item.detail}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {item.amount != null && (
                      <p className="text-xs font-bold text-gray-700">{formatCurrency(item.amount)}</p>
                    )}
                    <p className="text-[10px] text-gray-400">{timeAgo(item.at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
