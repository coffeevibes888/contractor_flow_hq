'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, ShieldCheck, Wallet } from 'lucide-react';

type ApplicationDoc = {
  id: string;
  category: string;
  docType: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function TenantOnboardingClient(props: {
  applicationId: string;
  propertySlug: string;
}) {
  const { applicationId, propertySlug } = props;

  const [docs, setDocs] = useState<ApplicationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<'id_verification' | 'income_verification'>('id_verification');
  const [docType, setDocType] = useState<string>('drivers_license');

  const idTypes = useMemo(
    () => [
      { value: 'drivers_license', label: 'Driver\'s license' },
      { value: 'state_id', label: 'State ID' },
      { value: 'passport', label: 'Passport' },
      { value: 'other', label: 'Other ID' },
    ],
    []
  );

  const incomeTypes = useMemo(
    () => [
      { value: 'paystub', label: 'Paystub (recommended)' },
      { value: 'w2', label: 'W-2' },
      { value: 'tax_return', label: 'Tax return' },
      { value: 'bank_statement', label: 'Bank statement' },
      { value: 'other', label: 'Other income document' },
    ],
    []
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/application-documents?applicationId=${encodeURIComponent(applicationId)}`);
        const json = await res.json();
        if (res.ok && json?.success) {
          setDocs(json.data || []);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [applicationId]);

  const hasIdDoc = docs.some((d) => d.category === 'id_verification');

  const activeDocTypes = category === 'id_verification' ? idTypes : incomeTypes;

  useEffect(() => {
    setDocType(activeDocTypes[0]?.value || 'other');
  }, [category, activeDocTypes]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('applicationId', applicationId);
      fd.append('category', category);
      fd.append('docType', docType);
      fd.append('file', file);

      const res = await fetch('/api/application-documents', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        alert(json?.message || 'Upload failed');
        return;
      }

      const refresh = await fetch(`/api/application-documents?applicationId=${encodeURIComponent(applicationId)}`);
      const refreshed = await refresh.json().catch(() => null);
      if (refresh.ok && refreshed?.success) {
        setDocs(refreshed.data || []);
      }
    } finally {
      setUploading(false);
    }
  }

  async function openDoc(docId: string) {
    const res = await fetch(`/api/application-documents/${encodeURIComponent(docId)}/signed-url`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success || !json?.url) {
      alert(json?.message || 'Unable to open document');
      return;
    }
    window.location.href = json.url as string;
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-violet-200/80 ring-1 ring-white/10'>
              Tenant onboarding
            </p>
            <h1 className='mt-3 text-2xl sm:text-3xl font-semibold text-slate-50'>Verify & finish your application</h1>
            <p className='mt-2 text-sm text-slate-300/80'>
              Upload your ID (required) and income documents (optional for now). You can finish the application after.
            </p>
            {propertySlug ? (
              <p className='mt-2 text-xs text-slate-400'>Property: {propertySlug}</p>
            ) : null}
          </div>
          <div className='shrink-0'>
            <div className='h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center'>
              <ShieldCheck className='h-5 w-5 text-violet-200' />
            </div>
          </div>
        </div>
      </div>

      <Card className='border-white/10 bg-slate-900/60 backdrop-blur-xl'>
        <CardHeader>
          <CardTitle className='text-white'>Upload documents</CardTitle>
          <CardDescription className='text-slate-300/80'>
            ID is required before you submit. Income docs can be uploaded now or later.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='space-y-2'>
              <div className='text-xs font-medium text-slate-200'>Category</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className='w-full rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-50'
                disabled={uploading}
              >
                <option value='id_verification'>ID verification (required)</option>
                <option value='income_verification'>Income verification (optional)</option>
              </select>
            </div>

            <div className='space-y-2 sm:col-span-2'>
              <div className='text-xs font-medium text-slate-200'>Document type</div>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className='w-full rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-50'
                disabled={uploading}
              >
                {activeDocTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='rounded-xl border border-dashed border-white/20 bg-slate-950/40 p-6'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center'>
                  <Upload className='h-5 w-5 text-violet-200/90' />
                </div>
                <div>
                  <div className='text-sm font-medium text-slate-50'>Select a file to upload</div>
                  <div className='text-xs text-slate-300/80'>PDF, JPG, PNG. Private & encrypted at rest.</div>
                </div>
              </div>
              <label className='inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 cursor-pointer disabled:opacity-60'>
                <input
                  type='file'
                  className='hidden'
                  accept='application/pdf,image/*'
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleUpload(f);
                      e.target.value = '';
                    }
                  }}
                />
                {uploading ? 'Uploading...' : 'Choose file'}
              </label>
            </div>
          </div>

          <div className='flex items-center justify-between gap-3'>
            <div className='text-xs text-slate-300/80'>
              {hasIdDoc ? (
                <Badge className='bg-emerald-500/20 text-emerald-100 border-emerald-400/40'>ID uploaded</Badge>
              ) : (
                <Badge className='bg-amber-500/20 text-amber-100 border-amber-400/40'>ID required</Badge>
              )}
            </div>
            <div className='flex items-center gap-2'>
              <Link href={`/user/profile/application/${encodeURIComponent(applicationId)}/complete`}>
                <Button variant='outline' className='border-white/20 text-slate-50 hover:bg-white/10'>
                  {hasIdDoc ? 'Continue' : 'Continue anyway'}
                </Button>
              </Link>
              <Link href='/user/dashboard'>
                <Button variant='ghost' className='text-slate-300 hover:text-white hover:bg-white/10'>
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='border-white/10 bg-slate-900/60 backdrop-blur-xl'>
        <CardHeader>
          <CardTitle className='text-white flex items-center gap-2'>
            <FileText className='h-5 w-5 text-violet-200/90' />
            Uploaded documents
          </CardTitle>
          <CardDescription className='text-slate-300/80'>Tap a document to view it.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='text-sm text-slate-300/80'>Loading...</div>
          ) : docs.length === 0 ? (
            <div className='text-sm text-slate-300/80'>No documents uploaded yet.</div>
          ) : (
            <div className='space-y-2'>
              {docs.map((d) => (
                <button
                  key={d.id}
                  type='button'
                  onClick={() => openDoc(d.id)}
                  className='w-full text-left rounded-xl border border-white/10 bg-slate-950/40 hover:bg-slate-950/60 transition-colors px-4 py-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-medium text-slate-50'>{d.originalFileName}</div>
                      <div className='text-xs text-slate-300/80'>
                        {d.category.replace(/_/g, ' ')} • {d.docType.replace(/_/g, ' ')} • {formatBytes(d.fileSize)}
                      </div>
                    </div>
                    <div className='shrink-0 flex items-center gap-2'>
                      <Badge className='bg-white/5 text-slate-200 border-white/10'>{d.status}</Badge>
                      <div className='h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center'>
                        <Wallet className='h-4 w-4 text-slate-200/80' />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
