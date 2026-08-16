'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { X, PenTool, Type, Check, Loader2, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SignatureField {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'name' | 'text';
  role: 'tenant' | 'landlord';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
}

interface CustomPDFSigningModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  documentUrl: string;
  documentName: string;
  signatureFields: SignatureField[];
  recipientName: string;
  recipientEmail: string;
  role: 'tenant' | 'landlord';
  leaseDetails: {
    landlordName: string;
    tenantName: string;
    propertyLabel: string;
  };
}

type SignatureMode = 'draw' | 'type';

const SIGNATURE_FONTS = [
  { name: 'Brush Script MT', style: 'brush' },
  { name: 'Lucida Handwriting', style: 'cursive' },
  { name: 'Segoe Script', style: 'elegant' },
];

function generateStampSignature(name: string, style: number = 0): string {
  if (!name) return '';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a1a2e';
  ctx.font = `italic 48px ${SIGNATURE_FONTS[style % SIGNATURE_FONTS.length].name}, cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);
  
  return canvas.toDataURL('image/png');
}

function generateInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function generateInitialStamp(initials: string): string {
  if (!initials) return '';
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'italic 32px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
  
  return canvas.toDataURL('image/png');
}

export default function CustomPDFSigningModal({
  open,
  onClose,
  token,
  documentUrl,
  documentName,
  signatureFields,
  recipientName,
  recipientEmail,
  role,
  leaseDetails,
}: CustomPDFSigningModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [consent, setConsent] = useState(false);
  const [signerName, setSignerName] = useState(recipientName || '');
  const [signerEmail, setSignerEmail] = useState(recipientEmail || '');
  const [submitting, setSubmitting] = useState(false);
  
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('type');
  const [signatureStyleIndex, setSignatureStyleIndex] = useState(0);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [initialsDataUrl, setInitialsDataUrl] = useState<string>('');
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  
  // Resize state
  const [modalSize, setModalSize] = useState({ width: 1280, height: 900 });
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current) return;
      
      const deltaX = moveEvent.clientX - resizeStartRef.current.x;
      const deltaY = moveEvent.clientY - resizeStartRef.current.y;
      
      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      
      if (direction.includes('e')) newWidth = Math.max(600, Math.min(window.innerWidth - 40, resizeStartRef.current.width + deltaX * 2));
      if (direction.includes('w')) newWidth = Math.max(600, Math.min(window.innerWidth - 40, resizeStartRef.current.width - deltaX * 2));
      if (direction.includes('s')) newHeight = Math.max(400, Math.min(window.innerHeight - 40, resizeStartRef.current.height + deltaY * 2));
      if (direction.includes('n')) newHeight = Math.max(400, Math.min(window.innerHeight - 40, resizeStartRef.current.height - deltaY * 2));
      
      setModalSize({ width: newWidth, height: newHeight });
      setIsMaximized(false);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [modalSize]);

  const toggleMaximize = useCallback(() => {
    if (isMaximized) {
      setModalSize({ width: 1280, height: 900 });
      setIsMaximized(false);
    } else {
      setModalSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
      setIsMaximized(true);
    }
  }, [isMaximized]);

  // Generate typed signature/initials when name changes
  useEffect(() => {
    if (signerName && signatureMode === 'type') {
      setSignatureDataUrl(generateStampSignature(signerName, signatureStyleIndex));
      setInitialsDataUrl(generateInitialStamp(generateInitials(signerName)));
    }
  }, [signerName, signatureMode, signatureStyleIndex]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineCap = 'round';
  }, []);

  useEffect(() => {
    if (signatureMode === 'draw' && activeFieldId) {
      setTimeout(setupCanvas, 100);
    }
  }, [signatureMode, activeFieldId, setupCanvas]);

  // Canvas drawing handlers
  useEffect(() => {
    if (signatureMode !== 'draw' || !activeFieldId) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let drawing = false;

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const move = (e: PointerEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const end = (e: PointerEvent) => {
      if (drawing) {
        e.preventDefault();
        canvas.releasePointerCapture(e.pointerId);
        drawing = false;
        ctx.closePath();
      }
    };

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);

    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointerleave', end);
    };
  }, [signatureMode, activeFieldId]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const applyDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFieldId) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    const field = signatureFields.find(f => f.id === activeFieldId);
    
    if (field?.type === 'signature') {
      setSignatureDataUrl(dataUrl);
    } else if (field?.type === 'initial') {
      setInitialsDataUrl(dataUrl);
    }
    
    setCompletedFields(prev => new Set([...prev, activeFieldId]));
    setActiveFieldId(null);
  };

  const applyTypedField = (fieldId: string) => {
    setCompletedFields(prev => new Set([...prev, fieldId]));
    setActiveFieldId(null);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const requiredFields = signatureFields.filter(f => f.required);
  const allRequiredCompleted = requiredFields.every(f => completedFields.has(f.id));

  const handleSubmit = async () => {
    if (!allRequiredCompleted) {
      toast({ title: 'Incomplete', description: 'Please complete all required signature fields.' });
      return;
    }
    if (!consent) {
      toast({ title: 'Consent required', description: 'Please agree to sign electronically.' });
      return;
    }
    if (!signatureDataUrl) {
      toast({ title: 'Missing signature', description: 'Please provide your signature.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureDataUrl,
          initialsDataUrl,
          signerName,
          signerEmail,
          consent: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit signature');
      }

      toast({ title: 'Signed!', description: 'Your signature was recorded successfully.' });
      onClose();
      if (role === 'tenant') {
        router.push('/user/profile/rent-receipts');
      } else {
        router.refresh();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to sign' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !mounted) return null;

  const activeField = activeFieldId ? signatureFields.find(f => f.id === activeFieldId) : null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 bg-blue-200">
      <div className="absolute inset-0 bg-black/15" onClick={onClose} />

      <div 
        ref={modalRef}
        className="relative z-10 rounded-lg bg-slate-50 shadow-2xl overflow-hidden flex flex-col"
        style={{ 
          width: `min(${modalSize.width}px, calc(100vw - 16px))`,
          height: `min(${modalSize.height}px, calc(100dvh - 16px))`,
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'calc(100dvh - 16px)',
          transition: isResizing ? 'none' : 'width 0.2s, height 0.2s',
        }}
      >
        {/* Resize handles */}
        <div 
          className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-violet-500/20 z-20"
          onMouseDown={(e) => handleResizeStart(e, 'n')}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-violet-500/20 z-20"
          onMouseDown={(e) => handleResizeStart(e, 's')}
        />
        <div 
          className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-violet-500/20 z-20"
          onMouseDown={(e) => handleResizeStart(e, 'w')}
        />
        <div 
          className="absolute top-0 bottom-0 right-0 w-2 cursor-e-resize hover:bg-violet-500/20 z-20"
          onMouseDown={(e) => handleResizeStart(e, 'e')}
        />
        {/* Corner resize handles */}
        <div 
          className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-violet-500/30 z-30"
          onMouseDown={(e) => handleResizeStart(e, 'nw')}
        />
        <div 
          className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize hover:bg-violet-500/30 z-30"
          onMouseDown={(e) => handleResizeStart(e, 'ne')}
        />
        <div 
          className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-violet-500/30 z-30"
          onMouseDown={(e) => handleResizeStart(e, 'sw')}
        />
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-violet-500/30 z-30 flex items-center justify-center"
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        >
          <GripHorizontal className="h-3 w-3 text-gray-400 rotate-[-45deg]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sign Document</h2>
            <p className="text-xs text-gray-500">{documentName}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMaximize}
              className="p-2 rounded-full hover:bg-gray-100"
              title={isMaximized ? 'Restore size' : 'Maximize'}
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4 text-gray-500" />
              ) : (
                <Maximize2 className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* PDF Viewer - Continuous Scroll */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
            {/* PDF with Field Overlays - Continuous scroll, no pagination */}
            <div className="flex-1 overflow-auto p-2 sm:p-4">
              <div className="max-w-full mx-auto">
                <Document
                  file={documentUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center h-[700px]">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                    </div>
                  }
                >
                  {Array.from(new Array(numPages), (_, index) => (
                    <div key={`page_${index + 1}`} className="relative bg-white shadow-lg mb-4 mx-auto" style={{ width: 'fit-content' }}>
                      <Page
                        pageNumber={index + 1}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 32 : 800)}
                        scale={1.2}
                      />
                      {/* Signature Field Overlays for this page */}
                      {signatureFields.filter(f => f.page === index + 1).map(field => {
                        const isCompleted = completedFields.has(field.id);
                        const isActive = activeFieldId === field.id;
                        
                        return (
                          <div
                            key={field.id}
                            onClick={() => !isCompleted && setActiveFieldId(field.id)}
                            className={cn(
                              'absolute border-2 rounded cursor-pointer transition-all flex items-center justify-center',
                              isCompleted
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : isActive
                                ? 'border-violet-500 bg-violet-500/20'
                                : 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                            )}
                            style={{
                              left: `${field.x}%`,
                              top: `${field.y}%`,
                              width: `${field.width}%`,
                              height: `${field.height}%`,
                            }}
                          >
                            {isCompleted ? (
                              field.type === 'signature' && signatureDataUrl ? (
                                <img src={signatureDataUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                              ) : field.type === 'initial' && initialsDataUrl ? (
                                <img src={initialsDataUrl} alt="Initials" className="max-h-full max-w-full object-contain" />
                              ) : field.type === 'date' ? (
                                <span className="text-xs text-slate-700">{new Date().toLocaleDateString()}</span>
                              ) : field.type === 'name' ? (
                                <span className="text-xs text-slate-700">{signerName}</span>
                              ) : (
                                <Check className="h-4 w-4 text-emerald-600" />
                              )
                            ) : (
                              <span className="text-xs font-medium text-amber-700">
                                {field.type === 'signature' ? 'Sign' : field.type === 'initial' ? 'Initial' : field.type}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </Document>
              </div>
            </div>
          </div>

          {/* Signing Panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col">
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Signer Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Your Name</label>
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <Input
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
              </div>

              {/* Active Field Signing */}
              {activeField && (
                <div className="p-4 rounded-lg border border-violet-200 bg-violet-50 space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    {activeField.type === 'signature' ? 'Add Your Signature' : 
                     activeField.type === 'initial' ? 'Add Your Initials' :
                     activeField.type === 'date' ? 'Confirm Date' :
                     activeField.type === 'name' ? 'Confirm Name' : 'Complete Field'}
                  </h4>

                  {(activeField.type === 'signature' || activeField.type === 'initial') && (
                    <>
                      {/* Mode Toggle */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSignatureMode('type')}
                          className={cn(
                            'flex-1 py-2 px-3 rounded text-sm font-medium',
                            signatureMode === 'type' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          <Type className="h-4 w-4 inline mr-1" />
                          Type
                        </button>
                        <button
                          onClick={() => {
                            setSignatureMode('draw');
                            setTimeout(setupCanvas, 100);
                          }}
                          className={cn(
                            'flex-1 py-2 px-3 rounded text-sm font-medium',
                            signatureMode === 'draw' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          <PenTool className="h-4 w-4 inline mr-1" />
                          Draw
                        </button>
                      </div>

                      {signatureMode === 'type' ? (
                        <div className="space-y-2">
                          <div className="bg-white rounded p-3 min-h-[60px] flex items-center justify-center border border-gray-200">
                            {signerName ? (
                              <img
                                src={activeField.type === 'signature' ? signatureDataUrl : initialsDataUrl}
                                alt="Preview"
                                className="max-h-12"
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">Enter your name above</span>
                            )}
                          </div>
                          {activeField.type === 'signature' && (
                            <div className="flex gap-1 justify-center">
                              {[0, 1, 2].map(i => (
                                <button
                                  key={i}
                                  onClick={() => setSignatureStyleIndex(i)}
                                  className={cn(
                                    'px-2 py-1 rounded text-xs',
                                    signatureStyleIndex === i ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                                  )}
                                >
                                  Style {i + 1}
                                </button>
                              ))}
                            </div>
                          )}
                          <Button
                            onClick={() => applyTypedField(activeField.id)}
                            disabled={!signerName}
                            className="w-full bg-violet-600 hover:bg-violet-700"
                          >
                            Apply
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="bg-white rounded overflow-hidden border border-gray-200">
                            <canvas
                              ref={canvasRef}
                              className="w-full cursor-crosshair"
                              style={{ height: activeField.type === 'signature' ? '100px' : '60px', touchAction: 'none' }}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={clearCanvas} className="flex-1">
                              Clear
                            </Button>
                            <Button onClick={applyDrawnSignature} className="flex-1 bg-violet-600 hover:bg-violet-700">
                              Apply
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeField.type === 'date' && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Today's date will be applied:</p>
                      <p className="text-lg font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
                      <Button
                        onClick={() => applyTypedField(activeField.id)}
                        className="w-full bg-violet-600 hover:bg-violet-700"
                      >
                        Apply Date
                      </Button>
                    </div>
                  )}

                  {activeField.type === 'name' && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Your name will be applied:</p>
                      <p className="text-lg font-medium text-gray-900">{signerName || 'Enter name above'}</p>
                      <Button
                        onClick={() => applyTypedField(activeField.id)}
                        disabled={!signerName}
                        className="w-full bg-violet-600 hover:bg-violet-700"
                      >
                        Apply Name
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span>{completedFields.size} / {signatureFields.length} fields</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all"
                    style={{ width: `${(completedFields.size / signatureFields.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Field List */}
              <div className="space-y-1">
                <p className="text-xs text-gray-500 mb-2">Fields to complete:</p>
                {signatureFields.map(field => (
                  <button
                    key={field.id}
                    onClick={() => {
                      if (!completedFields.has(field.id)) {
                        setActiveFieldId(field.id);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded text-sm',
                      completedFields.has(field.id)
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    )}
                  >
                    <span className="capitalize">{field.type} (p.{field.page})</span>
                    {completedFields.has(field.id) && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 space-y-3 bg-gray-50">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(!!v)}
                />
                <label htmlFor="consent" className="text-xs text-gray-600 cursor-pointer">
                  I agree that my electronic signature is legally binding.
                </label>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !allRequiredCompleted || !consent}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {submitting ? 'Submitting...' : 'Complete & Sign'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
