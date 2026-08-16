'use client';

/**
 * JobSignoffCard
 *
 * Customer completion sign-off. Captures a signature + signer name, uploads the
 * signature image, and records it via /api/contractor/jobs/[id]/sign-off. Once
 * signed, shows the captured signature.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileSignature, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { InlineSignaturePad } from '@/components/contractor/inline-signature-pad';

interface SignOff {
  id: string;
  url: string;
  caption?: string | null;
  takenAt: string;
}

interface Props {
  jobId: string;
  jobStatus: string;
  canEdit?: boolean;
}

export function JobSignoffCard({ jobId, jobStatus, canEdit = true }: Props) {
  const [signOff, setSignOff] = useState<SignOff | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [markComplete, setMarkComplete] = useState(jobStatus !== 'completed');
  const [saving, setSaving] = useState(false);

  const fetchSignOff = useCallback(async () => {
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/sign-off`);
      if (res.ok) {
        const data = await res.json();
        setSignOff(data.signOff ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchSignOff(); }, [fetchSignOff]);

  const handleCapture = async (dataUrl: string) => {
    if (!signerName.trim()) { toast.error('Enter the signer name first'); return; }
    setSaving(true);
    try {
      // Upload signature image
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append('file', new File([blob], 'sign-off.png', { type: 'image/png' }));
      fd.append('folder', 'contractor-signatures');
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const upData = await up.json();
      if (!up.ok || !upData.url) {
        toast.error('Failed to upload signature');
        return;
      }

      const res = await fetch(`/api/contractor/jobs/${jobId}/sign-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureUrl: upData.url,
          signerName: signerName.trim(),
          markComplete,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Sign-off recorded');
        setSignOff({
          id: data.signOff.id,
          url: data.signOff.url,
          caption: data.signOff.caption,
          takenAt: data.signOff.takenAt,
        });
        setOpen(false);
      } else {
        toast.error(data.error || 'Failed to record sign-off');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-gray-800">Customer Sign-off</h3>
        </div>
        {signOff && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Signed
          </span>
        )}
      </div>

      {signOff ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signOff.url} alt="Customer signature"
            className="h-24 w-full object-contain rounded-lg bg-white border border-emerald-100" />
          <p className="text-[11px] text-emerald-700 mt-2">
            {signOff.caption || 'Signed'} · {new Date(signOff.takenAt).toLocaleString()}
          </p>
        </div>
      ) : !canEdit ? (
        <p className="text-xs text-gray-400">No sign-off captured.</p>
      ) : open ? (
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
          <input type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)}
            placeholder="Customer name"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800" />
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={markComplete}
              onChange={(e) => setMarkComplete(e.target.checked)}
              className="rounded text-violet-600 focus:ring-violet-500" />
            Mark job as completed on sign-off
          </label>
          <InlineSignaturePad onCapture={handleCapture} disabled={saving} />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}
              className="border-gray-200 text-xs h-7">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8 w-full">
          <FileSignature className="h-3.5 w-3.5 mr-1" /> Capture Customer Sign-off
        </Button>
      )}
    </div>
  );
}
