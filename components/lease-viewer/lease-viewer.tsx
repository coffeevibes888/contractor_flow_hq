'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FileCheck,
  FileText,
  ExternalLink,
  AlertCircle,
  X,
  List,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
} from 'lucide-react';
import DocumentOutline from './document-outline';
import { SignatureList, type EmbeddedSignature } from './signature-display';
import {
  extractDocumentSections,
  findActiveSection,
  scrollToSection,
  calculateScrollProgress,
  type DocumentSection,
} from '@/lib/utils/document-sections';

// Re-export types for external use
export type { EmbeddedSignature } from './signature-display';

export interface LeaseViewerProps {
  leaseHtml: string;
  signedPdfUrl?: string | null;
  signatures?: EmbeddedSignature[];
  triggerLabel?: string;
  triggerClassName?: string;
  documentTitle?: string;
}

type ViewMode = 'pdf' | 'html';

export default function LeaseViewer({
  leaseHtml,
  signedPdfUrl,
  signatures = [],
  triggerLabel = 'View Lease',
  triggerClassName,
  documentTitle = 'Lease Agreement',
}: LeaseViewerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(signedPdfUrl ? 'pdf' : 'html');
  const [pdfError, setPdfError] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Extract sections when HTML content is rendered
  useEffect(() => {
    if (!open || viewMode !== 'html' || !contentRef.current) return;

    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      if (contentRef.current) {
        const extracted = extractDocumentSections(contentRef.current);
        setSections(extracted);
        if (extracted.length > 0) {
          setActiveSection(extracted[0].id);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [open, viewMode, leaseHtml]);

  // Handle scroll to update active section
  const handleScroll = useCallback(() => {
    if (!contentRef.current || sections.length === 0) return;

    const active = findActiveSection(sections, contentRef.current.scrollTop);
    if (active) {
      setActiveSection(active.id);
    }

    setScrollProgress(calculateScrollProgress(contentRef.current));
  }, [sections]);

  const handleSectionClick = useCallback((sectionId: string) => {
    if (contentRef.current) {
      scrollToSection(contentRef.current, sectionId);
      setActiveSection(sectionId);
      setShowOutline(false); // Close outline on mobile after selection
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    setIsFullScreen(false);
    setShowOutline(false);
  };

  const isSigned = !!signedPdfUrl;
  const hasSignatures = signatures.length > 0;

  if (!mounted) {
    return (
      <Button
        variant="outline"
        className={cn('rounded-full', triggerClassName)}
        onClick={() => setOpen(true)}
      >
        {isSigned && <FileCheck className="w-4 h-4 mr-2 text-emerald-500" />}
        {triggerLabel}
      </Button>
    );
  }

  const modalContent = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative z-10 bg-white shadow-2xl overflow-hidden flex flex-col',
          // Mobile: full screen
          'w-full h-full',
          // Tablet/Desktop: centered modal (unless fullscreen)
          !isFullScreen && 'sm:w-[95vw] sm:h-[90vh] sm:max-w-6xl sm:max-h-[900px] sm:rounded-2xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button on mobile */}
            <button
              onClick={handleClose}
              className="sm:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {isSigned ? 'Signed Lease' : documentTitle}
              </h2>
              {isSigned && (
                <p className="text-xs sm:text-sm text-emerald-600 flex items-center gap-1">
                  <FileCheck className="h-3 w-3" />
                  Fully executed
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            {signedPdfUrl && (
              <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('pdf')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    viewMode === 'pdf'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <FileCheck className="h-3 w-3 inline mr-1" />
                  PDF
                </button>
                <button
                  onClick={() => setViewMode('html')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    viewMode === 'html'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <FileText className="h-3 w-3 inline mr-1" />
                  Preview
                </button>
              </div>
            )}

            {/* Download button */}
            {signedPdfUrl && (
              <a
                href={signedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Download className="h-3 w-3" />
                Download
              </a>
            )}

            {/* Fullscreen toggle (desktop only) */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4 text-gray-600" />
              ) : (
                <Maximize2 className="h-4 w-4 text-gray-600" />
              )}
            </button>

            {/* Close button (desktop) */}
            <button
              onClick={handleClose}
              className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </header>

        {/* Progress bar */}
        {viewMode === 'html' && (
          <div className="h-1 bg-gray-100 flex-shrink-0">
            <div
              className="h-full bg-violet-500 transition-all duration-150"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar - Table of Contents (desktop) */}
          {viewMode === 'html' && sections.length > 0 && (
            <div className="hidden lg:block w-64 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
              <DocumentOutline
                sections={sections}
                activeSection={activeSection}
                onSectionClick={handleSectionClick}
                collapsible={false}
              />
            </div>
          )}

          {/* Mobile outline overlay */}
          {viewMode === 'html' && showOutline && sections.length > 0 && (
            <div className="lg:hidden absolute inset-0 z-20 flex">
              <div
                className="absolute inset-0 bg-black/30"
                onClick={() => setShowOutline(false)}
              />
              <div className="relative w-72 max-w-[80vw] bg-white shadow-xl overflow-y-auto">
                <DocumentOutline
                  sections={sections}
                  activeSection={activeSection}
                  onSectionClick={handleSectionClick}
                  collapsible={false}
                />
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {viewMode === 'pdf' && signedPdfUrl ? (
              <div className="flex-1 p-4 sm:p-6 overflow-auto">
                {pdfError ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
                    <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Unable to display PDF
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      The signed PDF couldn&apos;t be loaded in the viewer.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={signedPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in New Tab
                      </a>
                      <Button variant="outline" onClick={() => setViewMode('html')}>
                        View Preview
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[500px]">
                    <iframe
                      src={signedPdfUrl}
                      className="w-full h-full rounded-xl border border-gray-200"
                      title="Signed Lease PDF"
                      onError={() => setPdfError(true)}
                      onLoad={(e) => {
                        // Check if iframe loaded successfully
                        try {
                          const iframe = e.target as HTMLIFrameElement;
                          // If we can't access contentDocument, it might be a CORS issue but PDF might still display
                          console.log('PDF iframe loaded');
                        } catch (err) {
                          console.log('PDF iframe load check:', err);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                ref={contentRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
              >
                <div className="max-w-4xl mx-auto">
                  {/* Signatures summary at top if signed */}
                  {hasSignatures && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <SignatureList signatures={signatures} />
                    </div>
                  )}

                  {/* Document content */}
                  {leaseHtml ? (
                    <div
                      className="prose prose-sm sm:prose lg:prose-lg max-w-none text-gray-800"
                      style={{
                        fontSize: 'clamp(14px, 2.5vw, 18px)',
                        lineHeight: '1.7',
                      }}
                      dangerouslySetInnerHTML={{ __html: leaseHtml }}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">
                        Lease content is unavailable. {signedPdfUrl ? 'Try viewing the PDF instead.' : 'Please contact support.'}
                      </p>
                      {signedPdfUrl && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setViewMode('pdf')}
                        >
                          View PDF
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile footer */}
        <footer className="sm:hidden px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0 safe-area-pb">
          {/* Table of contents button */}
          {viewMode === 'html' && sections.length > 0 && (
            <button
              onClick={() => setShowOutline(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg"
            >
              <List className="h-4 w-4" />
              Contents
            </button>
          )}

          {/* View mode toggle on mobile */}
          {signedPdfUrl && (
            <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('pdf')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'pdf'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                )}
              >
                PDF
              </button>
              <button
                onClick={() => setViewMode('html')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'html'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                )}
              >
                Preview
              </button>
            </div>
          )}

          {/* Download button on mobile */}
          {signedPdfUrl && (
            <a
              href={signedPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </footer>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        variant="outline"
        className={cn('rounded-full', triggerClassName)}
        onClick={() => setOpen(true)}
      >
        {isSigned && <FileCheck className="w-4 h-4 mr-2 text-emerald-500" />}
        {triggerLabel}
      </Button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
