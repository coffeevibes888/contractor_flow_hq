'use client';

import { useState, useEffect } from 'react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import type { EvictionNotice } from '@/types/tenant-lifecycle';

interface EvictionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string;
  tenantName: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-slate-500/20 text-slate-300 border-slate-400/30', icon: <FileText className="w-3 h-3" /> },
  served: { label: 'Served', color: 'bg-amber-500/20 text-amber-300 border-amber-400/30', icon: <Clock className="w-3 h-3" /> },
  cured: { label: 'Cured', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30', icon: <CheckCircle className="w-3 h-3" /> },
  filed: { label: 'Filed', color: 'bg-red-500/20 text-red-300 border-red-400/30', icon: <AlertTriangle className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'bg-purple-500/20 text-purple-300 border-purple-400/30', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500/20 text-slate-400 border-slate-400/30', icon: <XCircle className="w-3 h-3" /> },
};

const noticeTypeLabels: Record<string, string> = {
  three_day: '3-Day Notice',
  seven_day: '7-Day Notice',
  thirty_day: '30-Day Notice',
};

export function EvictionHistoryPanel({ isOpen, onClose, leaseId, tenantName }: EvictionHistoryPanelProps) {
  const [notices, setNotices] = useState<EvictionNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && leaseId) {
      fetchNotices();
    }
  }, [isOpen, leaseId]);

  const fetchNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/evictions/lease/${leaseId}`);
      if (!res.ok) throw new Error('Failed to fetch eviction history');
      const data = await res.json();
      setNotices(data.notices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Eviction History"
      description={`Eviction notices for ${tenantName}`}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchNotices} className="mt-4 border-white/10">
              Retry
            </Button>
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No eviction notices on record</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => {
              const config = statusConfig[notice.status] || statusConfig.draft;
              return (
                <div
                  key={notice.id}
                  className="rounded-lg border border-white/10 bg-slate-800/60 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">
                        {noticeTypeLabels[notice.noticeType] || notice.noticeType}
                      </p>
                      <p className="text-xs text-slate-400">
                        {notice.servedAt
                          ? `Served: ${new Date(notice.servedAt).toLocaleDateString()}`
                          : `Created: ${new Date(notice.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge className={`${config.color} flex items-center gap-1`}>
                      {config.icon}
                      {config.label}
                    </Badge>
                  </div>

                  {notice.reason && (
                    <p className="text-sm text-slate-300">{notice.reason}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {notice.amountOwed && Number(notice.amountOwed) > 0 && (
                      <div>
                        <span className="text-slate-500">Amount Owed:</span>
                        <span className="text-red-400 ml-1">
                          ${Number(notice.amountOwed).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {notice.deadlineDate && (
                      <div>
                        <span className="text-slate-500">Deadline:</span>
                        <span className="text-slate-300 ml-1">
                          {new Date(notice.deadlineDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {notice.curedAt && (
                      <div>
                        <span className="text-slate-500">Cured:</span>
                        <span className="text-emerald-400 ml-1">
                          {new Date(notice.curedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {notice.filedAt && (
                      <div>
                        <span className="text-slate-500">Filed:</span>
                        <span className="text-red-400 ml-1">
                          {new Date(notice.filedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {notice.additionalNotes && (
                    <p className="text-xs text-slate-500 italic border-t border-white/5 pt-2">
                      {notice.additionalNotes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
