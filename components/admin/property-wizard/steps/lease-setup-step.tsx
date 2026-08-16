'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, CheckCircle2, Loader2, Wand2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';
import { useToast } from '@/hooks/use-toast';
import { LeaseBuilderModal } from '@/components/admin/lease-builder';

interface LeaseSetupStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

type LeaseOption = 'default' | 'upload' | 'builder';

export function LeaseSetupStep({ setValidate }: LeaseSetupStepProps) {
  const { state, updateFormData } = useWizard();
  const { toast } = useToast();

  const [option, setOption] = useState<LeaseOption | null>(null);
  const [uploading, setUploading] = useState(false);
  const [seedingDefault, setSeedingDefault] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    (state.formData as any).leaseDocumentId ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Free Lease Builder state
  const [showLeaseBuilder, setShowLeaseBuilder] = useState(false);

  // Persist the selected doc id back to wizard formData
  useEffect(() => {
    if (selectedDocId) {
      updateFormData({ leaseDocumentId: selectedDocId } as any);
    }
  }, [selectedDocId, updateFormData]);

  // Lease is optional — landlords can skip and attach a lease later from property settings
  useEffect(() => {
    setValidate(null);
    return () => setValidate(null);
  }, [setValidate]);

  // --- Handlers ---

  const handleUseDefault = async () => {
    setSeedingDefault(true);
    try {
      const propertyState = (state.formData.state || 'NV').toUpperCase();
      const res = await fetch('/api/legal-documents/seed-default-lease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: propertyState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setSelectedDocId(data.document.id);
      toast({
        title: data.created ? 'Default lease added' : 'Default lease selected',
        description: data.document.name,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to add default lease', description: err.message });
    } finally {
      setSeedingDefault(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name.replace(/\.[^/.]+$/, ''));
      fd.append('type', 'lease');
      fd.append('isTemplate', 'true');

      const res = await fetch('/api/legal-documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      setSelectedDocId(data.document.id);
      toast({ title: 'Lease uploaded', description: data.document.name });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isConfirmed = !!(state.formData as any).leaseDocumentId;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Lease Template</h2>
        <p className="text-gray-500 mt-2 text-sm">
          Optional — skip this if you don't need a lease right now. You can attach one later from the property settings, or use it only when you're ready to place a tenant.
        </p>
      </div>

      {/* Confirmation pill */}
      {isConfirmed && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-emerald-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Lease template selected — you can proceed to review.
        </div>
      )}

      {/* Option cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 — Use Property Flow Default Lease */}
        <button
          type="button"
          onClick={() => {
            setOption('default');
            handleUseDefault();
          }}
          disabled={seedingDefault}
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-left transition-all',
            option === 'default'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50',
            seedingDefault && 'opacity-70 cursor-not-allowed'
          )}
        >
          {seedingDefault ? (
            <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
          ) : (
            <Building2 className="h-8 w-8 text-amber-400" />
          )}
          <div>
            <p className="font-semibold text-gray-900 text-sm">Use Property Flow Default Lease</p>
            <p className="text-xs text-gray-500 mt-1">Use our free state-standard lease template.</p>
          </div>
          {option === 'default' && !seedingDefault && (
            <CheckCircle2 className="h-4 w-4 text-amber-400 self-end mt-auto" />
          )}
        </button>

        {/* Card 2 — Upload your lease */}
        <button
          type="button"
          onClick={() => setOption('upload')}
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-left transition-all',
            option === 'upload'
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50'
          )}
        >
          <Upload className="h-8 w-8 text-cyan-400" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Upload your lease</p>
            <p className="text-xs text-gray-500 mt-1">Upload a PDF or Word document you already have.</p>
          </div>
          {option === 'upload' && <CheckCircle2 className="h-4 w-4 text-cyan-400 self-end mt-auto" />}
        </button>

        {/* Card 3 — Free Lease Builder */}
        <button
          type="button"
          onClick={() => {
            setOption('builder');
            setShowLeaseBuilder(true);
          }}
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-left transition-all',
            option === 'builder'
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'
          )}
        >
          <Wand2 className="h-8 w-8 text-emerald-400" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Free Lease Builder</p>
            <p className="text-xs text-gray-500 mt-1">Generate a comprehensive, state-aware lease in seconds.</p>
          </div>
          {option === 'builder' && <CheckCircle2 className="h-4 w-4 text-emerald-400 self-end mt-auto" />}
        </button>
      </div>

      {/* ── Panel: Upload ── */}
      {option === 'upload' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <Label className="text-gray-700 text-sm font-medium">Upload a lease document</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleUpload}
          />
          {selectedDocId && option === 'upload' ? (
            <div className="flex items-center gap-2 text-emerald-300 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Lease uploaded successfully.
              <button
                type="button"
                className="ml-auto text-gray-500 hover:text-gray-900 text-xs underline"
                onClick={() => { setSelectedDocId(null); updateFormData({ leaseDocumentId: undefined } as any); }}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 text-sm text-gray-500 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5',
                uploading && 'opacity-60 cursor-not-allowed'
              )}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="h-4 w-4" /> Click to select PDF or Word file</>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Lease Builder Modal — populated directly from wizard formData ── */}
      <LeaseBuilderModal
        open={showLeaseBuilder}
        onClose={() => {
          setShowLeaseBuilder(false);
          if (option === 'builder' && !selectedDocId) setOption(null);
        }}
        property={{ id: '', name: state.formData.name || 'New Property' }}
        unit={state.formData.rentAmount ? {
          id: '',
          name: state.formData.unitNumber || 'Unit',
          type: 'unit',
          rentAmount: state.formData.rentAmount,
        } : undefined}
        inlinePropertyData={{
          name: state.formData.name || 'New Property',
          slug: state.formData.slug,
          address: {
            street: state.formData.streetAddress || '',
            city: state.formData.city || '',
            state: state.formData.state || '',
            zipCode: state.formData.zipCode || '',
          },
          amenities: state.formData.amenities || [],
        }}
        onLeaseGenerated={(doc) => {
          if (doc?.id) {
            setSelectedDocId(doc.id);
          }
        }}
      />
    </div>
  );
}
