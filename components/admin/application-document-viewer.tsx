'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, CreditCard, Receipt, Eye } from 'lucide-react';

interface Document {
  id: string;
  originalFileName: string;
  category: string;
  docType: string;
  verificationStatus?: string;
  status?: string;
}

interface ApplicationDocumentViewerProps {
  verificationDocuments: Document[];
  applicationDocuments: Document[];
  applicationId: string;
}

export function ApplicationDocumentViewer({
  verificationDocuments,
  applicationDocuments,
  applicationId,
}: ApplicationDocumentViewerProps) {
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const handleViewDocument = async (docId: string, fileName: string, isVerification: boolean) => {
    setLoadingDocId(docId);
    try {
      const endpoint = isVerification
        ? `/api/documents/verification/${docId}/url`
        : `/api/documents/application/${docId}/url`;
      
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error('Failed to get document URL');
      }
      const data = await res.json();
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to view document:', error);
      alert('Failed to load document. Please try again.');
    } finally {
      setLoadingDocId(null);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'verified': return { text: 'Verified', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
      case 'rejected': return { text: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' };
      case 'processing':
      case 'pending':
      case 'needs_review':
      default: return { text: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' };
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'identity') {
      return <CreditCard className="w-4 h-4 text-violet-400" />;
    }
    return <Receipt className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className='mt-6 space-y-4'>
      {/* Verification Documents (ID & Income) */}
      {verificationDocuments.length > 0 && (
        <div className='space-y-3'>
          <h4 className='text-sm font-semibold text-white flex items-center gap-2'>
            <svg className='w-4 h-4 text-violet-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
            </svg>
            ID & Income Documents
          </h4>
          <div className='grid gap-3'>
            {verificationDocuments.map((doc) => {
              const statusDisplay = getStatusDisplay(doc.verificationStatus || 'pending');
              
              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${statusDisplay.bg} backdrop-blur-sm`}
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <div className='w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0'>
                      {getCategoryIcon(doc.category)}
                    </div>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-white truncate'>{doc.originalFileName}</p>
                      <div className='flex items-center gap-2 mt-0.5'>
                        <span className='text-xs text-slate-400'>
                          {doc.category === 'identity' ? 'ID' : 'Income'} • {String(doc.docType).replace(/_/g, ' ')}
                        </span>
                        <span className={`text-xs font-medium ${statusDisplay.color}`}>
                          • {statusDisplay.text}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleViewDocument(doc.id, doc.originalFileName, true)}
                    disabled={loadingDocId === doc.id}
                    className='rounded-lg bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 text-xs font-medium flex-shrink-0'
                  >
                    {loadingDocId === doc.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        View
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Documents */}
      <div className='space-y-3'>
        <h4 className='text-sm font-semibold text-white flex items-center gap-2'>
          <FileText className='w-4 h-4 text-slate-400' />
          Other Documents
        </h4>
        {applicationDocuments.length === 0 ? (
          <div className='p-4 rounded-xl border border-slate-700/50 bg-slate-800/30'>
            <p className='text-sm text-slate-500 text-center'>No additional documents uploaded</p>
          </div>
        ) : (
          <div className='grid gap-3'>
            {applicationDocuments.map((doc) => (
              <div
                key={doc.id}
                className='flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30'
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0'>
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className='min-w-0'>
                    <p className='text-sm font-medium text-white truncate'>{doc.originalFileName}</p>
                    <p className='text-xs text-slate-400 mt-0.5'>
                      {String(doc.category).replace(/_/g, ' ')} • {String(doc.docType).replace(/_/g, ' ')} • {doc.status}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleViewDocument(doc.id, doc.originalFileName, false)}
                  disabled={loadingDocId === doc.id}
                  className='rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 text-xs font-medium flex-shrink-0'
                >
                  {loadingDocId === doc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
