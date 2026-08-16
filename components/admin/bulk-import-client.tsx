'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Building2,
  Home,
  Users,
  Layers,
  X,
  Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportType = 'full' | 'properties' | 'units' | 'tenants';

type RowResult = {
  row: number;
  status: 'created' | 'skipped' | 'error';
  message: string;
  data?: Record<string, string>;
};

type ImportSummary = {
  propertiesCreated: number;
  propertiesSkipped: number;
  unitsCreated: number;
  unitsSkipped: number;
  tenantsCreated: number;
  tenantsSkipped: number;
  leasesCreated: number;
  leasesSkipped: number;
};

type ImportResult = {
  success: boolean;
  dryRun: boolean;
  summary: ImportSummary;
  rows: RowResult[];
  errors: string[];
};

// ─── Config ───────────────────────────────────────────────────────────────────

const IMPORT_TYPES: {
  value: ImportType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    value: 'full',
    label: 'Full Import',
    description: 'Properties + units + tenants + leases in one sheet',
    icon: Layers,
    color: 'from-violet-500 to-purple-500',
  },
  {
    value: 'properties',
    label: 'Properties Only',
    description: 'Add new properties (buildings)',
    icon: Building2,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    value: 'units',
    label: 'Properties + Units',
    description: 'Add properties and their units',
    icon: Home,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    value: 'tenants',
    label: 'Tenants + Leases',
    description: 'Add tenants and link them to existing units',
    icon: Users,
    color: 'from-amber-500 to-orange-500',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkImportClient() {
  const [importType, setImportType] = useState<ImportType>('full');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      alert('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  // ── Template download ──────────────────────────────────────────────────────

  const downloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await fetch(`/api/admin/import/template?type=${importType}`);
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `propertyflowhq-import-${importType}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download template. Please try again.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────

  const runImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', importType);
      fd.append('dryRun', String(dryRun));

      const res = await fetch('/api/admin/import', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Import failed');
        return;
      }
      setResult(data);
      setShowAllRows(false);
    } catch {
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const totalCreated =
    (result?.summary.propertiesCreated ?? 0) +
    (result?.summary.unitsCreated ?? 0) +
    (result?.summary.tenantsCreated ?? 0) +
    (result?.summary.leasesCreated ?? 0);

  const totalSkipped =
    (result?.summary.propertiesSkipped ?? 0) +
    (result?.summary.unitsSkipped ?? 0) +
    (result?.summary.tenantsSkipped ?? 0) +
    (result?.summary.leasesSkipped ?? 0);

  const visibleRows = showAllRows ? result?.rows : result?.rows.slice(0, 20);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Bulk Import</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Import properties, units, and tenants from Excel or CSV — perfect for migrating from Buildium, AppFolio, or any other platform.
          </p>
        </div>
      </div>

      {/* Migration tip banner */}
      <div className='flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3'>
        <Info className='h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0' />
        <p className='text-xs text-blue-700'>
          <span className='font-semibold'>Migrating from another platform?</span> Export your data as CSV or Excel from Buildium, AppFolio, Rent Manager, or any spreadsheet. Then download our template below to see the expected column names, copy your data in, and upload.
        </p>
      </div>

      <div className='grid lg:grid-cols-3 gap-5'>
        {/* Left column — config */}
        <div className='lg:col-span-1 space-y-4'>

          {/* Step 1 — Choose type */}
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3'>
            <div className='flex items-center gap-2'>
              <span className='w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0'>1</span>
              <h2 className='text-sm font-bold text-gray-800'>Choose import type</h2>
            </div>
            <div className='space-y-2'>
              {IMPORT_TYPES.map((t) => {
                const Icon = t.icon;
                const active = importType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => { setImportType(t.value); setResult(null); setFile(null); }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all border ${
                      active
                        ? 'border-cyan-300 bg-cyan-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className='h-4 w-4 text-white' />
                    </div>
                    <div className='min-w-0'>
                      <p className={`text-xs font-semibold ${active ? 'text-cyan-700' : 'text-gray-800'}`}>{t.label}</p>
                      <p className='text-[10px] text-gray-500 truncate'>{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 — Download template */}
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3'>
            <div className='flex items-center gap-2'>
              <span className='w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0'>2</span>
              <h2 className='text-sm font-bold text-gray-800'>Download template</h2>
            </div>
            <p className='text-[11px] text-gray-500'>
              Get the Excel template with the correct column headers and an example row. Fill it in with your data.
            </p>
            <button
              onClick={downloadTemplate}
              disabled={downloadingTemplate}
              className='w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors disabled:opacity-60'
            >
              {downloadingTemplate ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Download className='h-3.5 w-3.5 text-emerald-500' />
              )}
              Download {IMPORT_TYPES.find((t) => t.value === importType)?.label} Template
            </button>
          </div>

          {/* Dry run toggle */}
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs font-semibold text-gray-800'>Preview mode</p>
                <p className='text-[10px] text-gray-500 mt-0.5'>
                  {dryRun
                    ? 'No data will be saved — shows what would be created'
                    : 'Data will be saved to your account'}
                </p>
              </div>
              <button
                onClick={() => setDryRun(!dryRun)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  dryRun ? 'bg-cyan-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    dryRun ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {!dryRun && (
              <div className='mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5'>
                <AlertCircle className='h-3 w-3 text-amber-500 flex-shrink-0' />
                <p className='text-[10px] text-amber-700 font-medium'>Live mode — data will be written to your account</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column — upload + results */}
        <div className='lg:col-span-2 space-y-4'>

          {/* Step 3 — Upload */}
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3'>
            <div className='flex items-center gap-2'>
              <span className='w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0'>3</span>
              <h2 className='text-sm font-bold text-gray-800'>Upload your file</h2>
            </div>

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all py-10 px-6 ${
                dragging
                  ? 'border-cyan-400 bg-cyan-50'
                  : file
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type='file'
                accept='.xlsx,.xls,.csv'
                className='hidden'
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />

              {file ? (
                <>
                  <div className='w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-3'>
                    <FileSpreadsheet className='h-6 w-6 text-emerald-600' />
                  </div>
                  <p className='text-sm font-semibold text-gray-800'>{file.name}</p>
                  <p className='text-[11px] text-gray-500 mt-0.5'>
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                    className='mt-2 flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-medium'
                  >
                    <X className='h-3 w-3' /> Remove
                  </button>
                </>
              ) : (
                <>
                  <div className='w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3'>
                    <Upload className='h-6 w-6 text-gray-400' />
                  </div>
                  <p className='text-sm font-semibold text-gray-700'>
                    {dragging ? 'Drop your file here' : 'Drag & drop or click to browse'}
                  </p>
                  <p className='text-[11px] text-gray-400 mt-1'>Supports .xlsx, .xls, .csv — max 500 rows</p>
                </>
              )}
            </div>

            {/* Run button */}
            <button
              onClick={runImport}
              disabled={!file || loading}
              className='w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold py-2.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Processing…
                </>
              ) : (
                <>
                  <Upload className='h-4 w-4' />
                  {dryRun ? 'Preview Import' : 'Run Import'}
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              {/* Result header */}
              <div className={`px-4 py-3 border-b border-gray-100 flex items-center gap-3 ${
                result.errors.length > 0 ? 'bg-amber-50' : 'bg-emerald-50'
              }`}>
                {result.errors.length > 0 ? (
                  <AlertCircle className='h-5 w-5 text-amber-500 flex-shrink-0' />
                ) : (
                  <CheckCircle2 className='h-5 w-5 text-emerald-500 flex-shrink-0' />
                )}
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-bold text-gray-800'>
                    {result.dryRun ? 'Preview complete' : 'Import complete'}
                    {result.dryRun && (
                      <span className='ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700'>
                        Preview only — nothing saved
                      </span>
                    )}
                  </p>
                  <p className='text-[11px] text-gray-500'>
                    {totalCreated} record{totalCreated !== 1 ? 's' : ''} would be {result.dryRun ? 'created' : 'created'} · {totalSkipped} skipped · {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {result.dryRun && totalCreated > 0 && (
                  <button
                    onClick={() => { setDryRun(false); }}
                    className='flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow hover:shadow-md transition-all'
                  >
                    Run for real →
                  </button>
                )}
              </div>

              {/* Summary cards */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100'>
                <SummaryCard
                  label='Properties'
                  created={result.summary.propertiesCreated}
                  skipped={result.summary.propertiesSkipped}
                  color='text-cyan-600'
                />
                <SummaryCard
                  label='Units'
                  created={result.summary.unitsCreated}
                  skipped={result.summary.unitsSkipped}
                  color='text-emerald-600'
                />
                <SummaryCard
                  label='Tenants'
                  created={result.summary.tenantsCreated}
                  skipped={result.summary.tenantsSkipped}
                  color='text-violet-600'
                />
                <SummaryCard
                  label='Leases'
                  created={result.summary.leasesCreated}
                  skipped={result.summary.leasesSkipped}
                  color='text-amber-600'
                />
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className='px-4 py-3 border-b border-gray-100 space-y-1.5'>
                  <p className='text-[11px] font-semibold text-red-600 uppercase tracking-wide'>Errors ({result.errors.length})</p>
                  {result.errors.map((e, i) => (
                    <div key={i} className='flex items-start gap-2 text-[11px] text-red-700'>
                      <XCircle className='h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-red-400' />
                      {e}
                    </div>
                  ))}
                </div>
              )}

              {/* Row results */}
              {result.rows.length > 0 && (
                <div>
                  <div className='px-4 py-2 border-b border-gray-100 flex items-center justify-between'>
                    <p className='text-[11px] font-semibold text-gray-500 uppercase tracking-wide'>
                      Row details ({result.rows.length})
                    </p>
                  </div>
                  <div className='divide-y divide-gray-50 max-h-80 overflow-y-auto'>
                    {visibleRows?.map((r, i) => (
                      <div key={i} className='flex items-start gap-3 px-4 py-2.5'>
                        <div className='flex-shrink-0 mt-0.5'>
                          {r.status === 'created' && <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />}
                          {r.status === 'skipped' && <AlertCircle className='h-3.5 w-3.5 text-amber-400' />}
                          {r.status === 'error' && <XCircle className='h-3.5 w-3.5 text-red-400' />}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-[11px] text-gray-700'>{r.message}</p>
                        </div>
                        <span className='text-[10px] text-gray-400 flex-shrink-0'>Row {r.row}</span>
                      </div>
                    ))}
                  </div>
                  {result.rows.length > 20 && (
                    <button
                      onClick={() => setShowAllRows(!showAllRows)}
                      className='w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 border-t border-gray-100 transition-colors'
                    >
                      {showAllRows ? (
                        <><ChevronUp className='h-3.5 w-3.5' /> Show less</>
                      ) : (
                        <><ChevronDown className='h-3.5 w-3.5' /> Show all {result.rows.length} rows</>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* How it works */}
          {!result && (
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3'>
              <h3 className='text-xs font-bold text-gray-800'>How it works</h3>
              <div className='space-y-2.5'>
                {[
                  { icon: Download, text: 'Download the template for your chosen import type', color: 'text-cyan-500' },
                  { icon: FileSpreadsheet, text: 'Fill in your data — or paste from your existing spreadsheet', color: 'text-emerald-500' },
                  { icon: Upload, text: 'Upload the file and run a preview to check for errors', color: 'text-violet-500' },
                  { icon: CheckCircle2, text: 'If the preview looks good, switch off Preview mode and run the real import', color: 'text-amber-500' },
                ].map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} className='flex items-start gap-3'>
                      <div className='w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0'>
                        <Icon className={`h-3.5 w-3.5 ${step.color}`} />
                      </div>
                      <p className='text-[11px] text-gray-600 pt-0.5'>{step.text}</p>
                    </div>
                  );
                })}
              </div>

              <div className='pt-2 border-t border-gray-100'>
                <p className='text-[11px] font-semibold text-gray-700 mb-1.5'>Supported platforms</p>
                <div className='flex flex-wrap gap-1.5'>
                  {['Buildium', 'AppFolio', 'Rent Manager', 'Yardi', 'TenantCloud', 'Cozy', 'Excel / Google Sheets', 'Any CSV export'].map((p) => (
                    <span key={p} className='text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium'>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  created,
  skipped,
  color,
}: {
  label: string;
  created: number;
  skipped: number;
  color: string;
}) {
  return (
    <div className='bg-white px-4 py-3'>
      <p className='text-[10px] text-gray-500 font-medium'>{label}</p>
      <p className={`text-xl font-bold ${color}`}>{created}</p>
      <p className='text-[10px] text-gray-400'>{skipped} skipped</p>
    </div>
  );
}
