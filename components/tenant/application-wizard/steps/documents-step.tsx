'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle, CreditCard, Receipt, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useApplicationWizard } from '../wizard-context';

interface DocumentsStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

interface UploadedDoc {
  id: string;
  url: string;
  name: string;
  type: 'identity' | 'income';
  docType: string;
}

export function DocumentsStep({ setValidate }: DocumentsStepProps) {
  const { state } = useApplicationWizard();
  const [idDocuments, setIdDocuments] = useState<UploadedDoc[]>([]);
  const [incomeDocuments, setIncomeDocuments] = useState<UploadedDoc[]>([]);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingIncome, setUploadingIncome] = useState(false);
  const [selectedIncomeType, setSelectedIncomeType] = useState<string>('pay_stubs');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const idInputRef = useRef<HTMLInputElement>(null);
  const incomeInputRef = useRef<HTMLInputElement>(null);

  // Validation
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (idDocuments.length === 0) {
      newErrors.id = 'Please upload a government-issued ID';
    }
    if (incomeDocuments.length === 0) {
      newErrors.income = 'Please upload at least one income document';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [idDocuments.length, incomeDocuments.length]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  // Fetch existing documents on mount
  useEffect(() => {
    if (state.applicationId) {
      fetchExistingDocuments();
    }
  }, [state.applicationId]);

  const fetchExistingDocuments = async () => {
    if (!state.applicationId) return;
    
    try {
      const response = await fetch(`/api/applications/${state.applicationId}/verification/status`);
      if (response.ok) {
        const data = await response.json();
        // If documents exist, we could populate them here
        // For now, we'll just track upload count
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingId(true);
    setErrors(prev => ({ ...prev, id: '' }));

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          setErrors(prev => ({ ...prev, id: 'Please upload an image or PDF file' }));
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          setErrors(prev => ({ ...prev, id: 'File size must be under 10MB' }));
          continue;
        }

        // Create preview URL immediately
        const previewUrl = URL.createObjectURL(file);
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        
        // Add to state immediately for preview
        setIdDocuments(prev => [...prev, {
          id: tempId,
          url: previewUrl,
          name: file.name,
          type: 'identity',
          docType: 'government_id',
        }]);

        // Upload in background if we have an application ID
        if (state.applicationId) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', 'identity');
          formData.append('docType', 'government_id');

          try {
            const response = await fetch(`/api/applications/${state.applicationId}/verification/upload`, {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              // Update the temp ID with the real one
              setIdDocuments(prev => prev.map(doc => 
                doc.id === tempId ? { ...doc, id: data.documentId || tempId } : doc
              ));
            } else {
              console.error('Upload failed:', await response.text());
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
          }
        }
      }
    } catch (error) {
      console.error('File processing error:', error);
    } finally {
      setUploadingId(false);
      if (idInputRef.current) {
        idInputRef.current.value = '';
      }
    }
  };

  const handleIncomeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingIncome(true);
    setErrors(prev => ({ ...prev, income: '' }));

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          setErrors(prev => ({ ...prev, income: 'Please upload an image or PDF file' }));
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          setErrors(prev => ({ ...prev, income: 'File size must be under 10MB' }));
          continue;
        }

        // Create preview URL immediately
        const previewUrl = URL.createObjectURL(file);
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        
        // Add to state immediately for preview
        setIncomeDocuments(prev => [...prev, {
          id: tempId,
          url: previewUrl,
          name: file.name,
          type: 'income',
          docType: selectedIncomeType,
        }]);

        // Upload in background if we have an application ID
        if (state.applicationId) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', 'employment');
          formData.append('docType', selectedIncomeType);

          try {
            const response = await fetch(`/api/applications/${state.applicationId}/verification/upload`, {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              // Update the temp ID with the real one
              setIncomeDocuments(prev => prev.map(doc => 
                doc.id === tempId ? { ...doc, id: data.documentId || tempId } : doc
              ));
            } else {
              console.error('Upload failed:', await response.text());
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
          }
        }
      }
    } catch (error) {
      console.error('File processing error:', error);
    } finally {
      setUploadingIncome(false);
      if (incomeInputRef.current) {
        incomeInputRef.current.value = '';
      }
    }
  };

  const removeIdDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = idDocuments.find(d => d.id === id);
    if (doc?.url.startsWith('blob:')) {
      URL.revokeObjectURL(doc.url);
    }
    setIdDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const removeIncomeDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = incomeDocuments.find(d => d.id === id);
    if (doc?.url.startsWith('blob:')) {
      URL.revokeObjectURL(doc.url);
    }
    setIncomeDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const getFileIcon = (name: string) => {
    if (name.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-8 w-8 text-red-400" />;
    }
    return null;
  };

  const isImage = (name: string) => {
    const ext = name.toLowerCase();
    return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 mb-4">
          <FileText className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Document Verification</h2>
        <p className="text-slate-300 mt-2">
          Upload your ID and proof of income to verify your application
        </p>
      </div>

      {/* ID Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-400" />
            Government-Issued ID *
          </Label>
          {idDocuments.length > 0 && (
            <span className="text-sm text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {idDocuments.length} uploaded
            </span>
          )}
        </div>

        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-200">
            <strong>Accepted:</strong> Driver's License, State ID, Passport, Green Card, Military ID
          </p>
        </div>

        {/* ID Upload Area */}
        <div
          onClick={() => idInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
            'hover:border-violet-500/50 hover:bg-violet-500/10',
            uploadingId ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600/50'
          )}
        >
          <input
            ref={idInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleIdUpload}
            className="hidden"
          />
          {uploadingId ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
              <p className="text-slate-300">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center">
                <Upload className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <p className="text-white font-medium">Click to upload your ID</p>
                <p className="text-sm text-slate-400 mt-1">PNG, JPG, or PDF up to 10MB</p>
              </div>
            </div>
          )}
        </div>

        {/* ID Document Grid */}
        {idDocuments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {idDocuments.map((doc) => (
              <div
                key={doc.id}
                className="group relative rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-800/50"
              >
                <div className="aspect-[4/3] relative bg-slate-800 flex items-center justify-center">
                  {isImage(doc.name) ? (
                    <Image
                      src={doc.url}
                      alt={doc.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {getFileIcon(doc.name)}
                      <span className="text-xs text-slate-400 px-2 text-center truncate max-w-full">
                        {doc.name}
                      </span>
                    </div>
                  )}
                  
                  {/* Verified badge */}
                  <div className="absolute top-2 left-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    ID
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => removeIdDocument(doc.id, e)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.id && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.id}
          </p>
        )}
      </div>

      {/* Income Documents Section */}
      <div className="space-y-4 pt-6 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-violet-400" />
            Proof of Income *
          </Label>
          {incomeDocuments.length > 0 && (
            <span className="text-sm text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {incomeDocuments.length} uploaded
            </span>
          )}
        </div>

        {/* Income Type Selector */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setSelectedIncomeType('pay_stubs')}
            className={cn(
              'p-4 rounded-xl border-2 transition-all text-left',
              selectedIncomeType === 'pay_stubs'
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-slate-600 hover:border-slate-500'
            )}
          >
            <Receipt className={cn('h-6 w-6 mb-2', selectedIncomeType === 'pay_stubs' ? 'text-violet-400' : 'text-slate-400')} />
            <p className="font-medium text-white text-sm">Pay Stubs</p>
            <p className="text-xs text-slate-400 mt-1">3 recent stubs</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIncomeType('bank_statements')}
            className={cn(
              'p-4 rounded-xl border-2 transition-all text-left',
              selectedIncomeType === 'bank_statements'
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-slate-600 hover:border-slate-500'
            )}
          >
            <Building2 className={cn('h-6 w-6 mb-2', selectedIncomeType === 'bank_statements' ? 'text-violet-400' : 'text-slate-400')} />
            <p className="font-medium text-white text-sm">Bank Statements</p>
            <p className="text-xs text-slate-400 mt-1">3 months</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIncomeType('tax_documents')}
            className={cn(
              'p-4 rounded-xl border-2 transition-all text-left',
              selectedIncomeType === 'tax_documents'
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-slate-600 hover:border-slate-500'
            )}
          >
            <FileText className={cn('h-6 w-6 mb-2', selectedIncomeType === 'tax_documents' ? 'text-violet-400' : 'text-slate-400')} />
            <p className="font-medium text-white text-sm">Tax Documents</p>
            <p className="text-xs text-slate-400 mt-1">W-2 or 1099</p>
          </button>
        </div>

        {/* Income Upload Area */}
        <div
          onClick={() => incomeInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
            'hover:border-violet-500/50 hover:bg-violet-500/10',
            uploadingIncome ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600/50'
          )}
        >
          <input
            ref={incomeInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleIncomeUpload}
            className="hidden"
          />
          {uploadingIncome ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
              <p className="text-slate-300">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center">
                <Upload className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <p className="text-white font-medium">
                  Click to upload {selectedIncomeType === 'pay_stubs' ? 'pay stubs' : selectedIncomeType === 'bank_statements' ? 'bank statements' : 'tax documents'}
                </p>
                <p className="text-sm text-slate-400 mt-1">PNG, JPG, or PDF up to 10MB each</p>
              </div>
            </div>
          )}
        </div>

        {/* Income Document Grid */}
        {incomeDocuments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {incomeDocuments.map((doc) => (
              <div
                key={doc.id}
                className="group relative rounded-xl overflow-hidden border-2 border-blue-500/50 bg-slate-800/50"
              >
                <div className="aspect-[4/3] relative bg-slate-800 flex items-center justify-center">
                  {isImage(doc.name) ? (
                    <Image
                      src={doc.url}
                      alt={doc.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {getFileIcon(doc.name)}
                      <span className="text-xs text-slate-400 px-2 text-center truncate max-w-full">
                        {doc.name}
                      </span>
                    </div>
                  )}
                  
                  {/* Type badge */}
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {doc.docType === 'pay_stubs' ? 'Pay Stub' : doc.docType === 'bank_statements' ? 'Bank' : 'Tax'}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => removeIncomeDocument(doc.id, e)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.income && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.income}
          </p>
        )}

        <p className="text-sm text-slate-400">
          Tip: Upload 3 pay stubs or bank statements for faster approval
        </p>
      </div>
    </div>
  );
}
