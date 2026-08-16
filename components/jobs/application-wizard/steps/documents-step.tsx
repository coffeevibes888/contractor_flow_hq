'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useJobApplicationWizard } from '../wizard-context';
import { toast } from 'sonner';

interface Props {
  setValidate: (fn: (() => boolean) | null) => void;
}

type DocType = 'id' | 'resume' | 'certification' | 'other';

const DOC_LABELS: Record<DocType, string> = {
  id: 'Government-Issued ID',
  resume: 'Resume / CV',
  certification: 'Certification / License',
  other: 'Other Document',
};

export function DocumentsStep({ setValidate }: Props) {
  const { state, updateFormData } = useJobApplicationWizard();
  const docs = state.formData.documents || [];
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<DocType, HTMLInputElement | null>>({
    id: null,
    resume: null,
    certification: null,
    other: null,
  });

  const hasId = docs.some((d) => d.type === 'id');
  const hasResume = docs.some((d) => d.type === 'resume');

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!hasResume) e.resume = 'Please upload a resume';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [hasResume]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const handleUpload = async (docType: DocType, file: File) => {
    if (!state.applicantId) {
      toast.error('Application not initialized. Please wait.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setUploading(docType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);

      const res = await fetch(`/api/jobs/applicants/${state.applicantId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }
      const newDoc = {
        id: data.document.id,
        type: docType,
        url: data.document.url,
        name: file.name,
        uploadedAt: new Date().toISOString(),
      };
      updateFormData({ documents: [...docs, newDoc] });
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const removeDoc = async (id: string) => {
    try {
      await fetch(`/api/jobs/applicants/${state.applicantId}/documents/${id}`, {
        method: 'DELETE',
      });
    } catch {
      // best-effort
    }
    updateFormData({ documents: docs.filter((d) => d.id !== id) });
  };

  const docsByType = (t: DocType) => docs.filter((d) => d.type === t);

  const UploadSection = ({ docType, required }: { docType: DocType; required?: boolean }) => {
    const typedDocs = docsByType(docType);
    return (
      <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {docType === 'id' ? (
              <ImageIcon className="h-4 w-4 text-emerald-400" />
            ) : (
              <FileText className="h-4 w-4 text-emerald-400" />
            )}
            <Label className="text-white font-medium">
              {DOC_LABELS[docType]} {required && <span className="text-red-400">*</span>}
            </Label>
          </div>
          {typedDocs.length > 0 && (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          )}
        </div>

        {typedDocs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-700"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-300 truncate hover:underline"
              >
                {doc.name}
              </a>
            </div>
            <button
              onClick={() => removeDoc(doc.id)}
              className="text-red-400 hover:text-red-300 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        <input
          ref={(el) => {
            fileRefs.current[docType] = el;
          }}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(docType, file);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading !== null}
          onClick={() => fileRefs.current[docType]?.click()}
          className="w-full border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          {uploading === docType ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" /> Upload {DOC_LABELS[docType]}
            </>
          )}
        </Button>
        <p className="text-xs text-slate-500">Images or PDFs, up to 10MB</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <FileText className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Documents</h2>
        <p className="text-slate-300 mt-2">Upload your resume, ID, and any certifications</p>
      </div>

      <UploadSection docType="resume" required />
      <UploadSection docType="id" />
      <UploadSection docType="certification" />
      <UploadSection docType="other" />

      {errors.resume && <p className="text-sm text-red-400">{errors.resume}</p>}

      {/* Cover letter */}
      <div className="pt-4 border-t border-slate-700/50 space-y-2">
        <Label className="text-slate-200">Cover Letter (optional)</Label>
        <Textarea
          value={state.formData.coverLetter || ''}
          onChange={(e) => updateFormData({ coverLetter: e.target.value })}
          rows={6}
          placeholder="Tell the employer why you're a great fit for this role..."
          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}
