'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, User, Briefcase, ArrowLeft, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface TenantDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  tenantName: string;
}

interface VerificationDocument {
  id: string;
  category: string;
  docType: string;
  originalFileName: string;
  verificationStatus: string;
}

interface VerifiedData {
  identity?: {
    fullName?: string;
    dateOfBirth?: string;
    issuingState?: string;
    expirationDate?: string;
  };
  income?: {
    employerName?: string;
    avgGrossPay?: number;
    monthlyIncome?: number;
  };
}

export function TenantDocumentsModal({
  isOpen,
  onClose,
  applicationId,
  tenantName,
}: TenantDocumentsModalProps) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [verifiedData, setVerifiedData] = useState<VerifiedData | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Document preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadDocuments();
    }
    // Reset preview when modal closes
    if (!isOpen) {
      setPreviewUrl(null);
      setPreviewFileName('');
      setZoom(100);
    }
  }, [isOpen, applicationId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/documents`);
      if (!res.ok) throw new Error('Failed to load documents');
      const data = await res.json();
      setDocuments(data.documents || []);
      setVerifiedData(data.verifiedData || null);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (docId: string, fileName: string) => {
    setLoadingDocId(docId);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/documents/verification/${docId}/url`);
      if (!res.ok) throw new Error('Failed to get document URL');
      const data = await res.json();
      setPreviewUrl(data.url);
      setPreviewFileName(fileName);
      setZoom(100);
    } catch (err) {
      console.error('Failed to view document:', err);
      alert('Failed to load document. Please try again.');
    } finally {
      setLoadingDocId(null);
      setPreviewLoading(false);
    }
  };

  const handleBackToList = () => {
    setPreviewUrl(null);
    setPreviewFileName('');
    setZoom(100);
  };

  const handleDownload = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'verified': return { text: 'Verified', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
      case 'rejected': return { text: 'Rejected', color: 'bg-red-500/20 text-red-300 border-red-400/30' };
      default: return { text: 'Pending', color: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
    }
  };

  const identityDocs = documents.filter(d => d.category === 'identity');
  const incomeDocs = documents.filter(d => d.category === 'employment');

  // Check if file is an image or PDF
  const isImage = previewFileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = previewFileName.match(/\.pdf$/i);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`bg-slate-900 border-white/10 text-white ${previewUrl ? 'max-w-4xl' : 'max-w-lg'}`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {previewUrl ? (
              <>
                <button
                  onClick={handleBackToList}
                  className="p-1 rounded hover:bg-slate-800 transition-colors mr-1"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="truncate">{previewFileName}</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 text-blue-400" />
                {tenantName}&apos;s Documents
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Document Preview View */}
        {previewUrl ? (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(z => Math.max(50, z - 25))}
                  className="border-white/10 text-slate-300 h-8 w-8 p-0"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-400 w-12 text-center">{zoom}%</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(z => Math.min(200, z + 25))}
                  className="border-white/10 text-slate-300 h-8 w-8 p-0"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="border-white/10 text-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>

            {/* Preview Area */}
            <div className="relative bg-slate-950 rounded-lg overflow-auto max-h-[60vh] min-h-[300px]">
              {previewLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
              ) : isImage ? (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={previewUrl}
                    alt={previewFileName}
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                    className="max-w-full rounded-lg transition-transform"
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={`${previewUrl}#toolbar=0`}
                  className="w-full h-[500px] rounded-lg"
                  title={previewFileName}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                  <FileText className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-sm">Preview not available for this file type</p>
                  <Button
                    size="sm"
                    onClick={handleDownload}
                    className="mt-4 bg-blue-600 hover:bg-blue-500"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400">{error}</p>
            <Button onClick={loadDocuments} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Verified Data Summary */}
            {verifiedData && (verifiedData.identity || verifiedData.income) && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="text-sm font-medium text-blue-300 mb-3">Verified Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {verifiedData.identity?.fullName && (
                    <div>
                      <span className="text-slate-400">Name: </span>
                      <span className="text-white">{verifiedData.identity.fullName}</span>
                    </div>
                  )}
                  {verifiedData.identity?.issuingState && (
                    <div>
                      <span className="text-slate-400">ID State: </span>
                      <span className="text-white">{verifiedData.identity.issuingState}</span>
                    </div>
                  )}
                  {verifiedData.income?.employerName && (
                    <div>
                      <span className="text-slate-400">Employer: </span>
                      <span className="text-white">{verifiedData.income.employerName}</span>
                    </div>
                  )}
                  {verifiedData.income?.monthlyIncome && (
                    <div>
                      <span className="text-slate-400">Monthly Income: </span>
                      <span className="text-emerald-400 font-medium">
                        ${verifiedData.income.monthlyIncome.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ID Documents */}
            {identityDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-300">ID Documents</p>
                </div>
                <div className="space-y-2">
                  {identityDocs.map((doc) => {
                    const status = getStatusDisplay(doc.verificationStatus);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{doc.originalFileName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">
                              {doc.docType.replace(/_/g, ' ')}
                            </span>
                            <Badge className={`text-[10px] ${status.color}`}>{status.text}</Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleViewDocument(doc.id, doc.originalFileName)}
                          disabled={loadingDocId === doc.id}
                          className="bg-blue-600 hover:bg-blue-500 text-xs"
                        >
                          {loadingDocId === doc.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'View'
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Income Documents */}
            {incomeDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-300">Income Documents</p>
                </div>
                <div className="space-y-2">
                  {incomeDocs.map((doc) => {
                    const status = getStatusDisplay(doc.verificationStatus);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{doc.originalFileName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">
                              {doc.docType.replace(/_/g, ' ')}
                            </span>
                            <Badge className={`text-[10px] ${status.color}`}>{status.text}</Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleViewDocument(doc.id, doc.originalFileName)}
                          disabled={loadingDocId === doc.id}
                          className="bg-blue-600 hover:bg-blue-500 text-xs"
                        >
                          {loadingDocId === doc.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'View'
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {documents.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No documents uploaded yet</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
