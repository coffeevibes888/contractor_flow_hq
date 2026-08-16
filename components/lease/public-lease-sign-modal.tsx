'use client';

/**
 * PublicLeaseSignModal
 *
 * Exact copy of components/lease-signing-modal.tsx adapted for the public free
 * lease builder flow.  Instead of loading a session from /api/sign/[token], it:
 *  - receives the lease HTML and signer info directly as props
 *  - extracts /sig_landlord/ and /init_l1/…/init_l19/ placeholders
 *  - lets the landlord apply initials + signature with the same UX
 *  - on "Finish" calls onSigned(signatureDataUrl, initialsDataUrl) so the parent
 *    can proceed to the esign-checkout / download flow
 *
 * The tenant flow (LeaseSigningModal) is NOT touched.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { X, PenTool, Type, Check, ChevronDown, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';

// ─── Signature helpers (identical to LeaseSigningModal) ───────────────────────

const SIGNATURE_FONTS = [
  { name: 'Brush Script MT', style: 'brush' },
  { name: 'Lucida Handwriting', style: 'cursive' },
  { name: 'Segoe Script', style: 'elegant' },
];

function generateStampSignature(name: string, style: number = 0): string {
  if (!name || typeof document === 'undefined') return '';
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
  const slant = -0.1;
  ctx.setTransform(1, 0, slant, 1, 0, 0);
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas.toDataURL('image/png');
}

function generateInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function generateInitialStamp(initials: string): string {
  if (!initials || typeof document === 'undefined') return '';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface SigningField {
  id: string;
  type: 'initial' | 'signature';
  placeholder: string;
  label: string;
  value: string | null;
  completed: boolean;
}

type SignatureMode = 'draw' | 'type';

export interface PublicLeaseSignModalProps {
  open: boolean;
  onClose: () => void;
  /** Raw HTML from the lease generator */
  leaseHtml: string;
  /** Signer's name pre-filled (landlord or tenant) */
  landlordName: string;
  /** Label shown in the header — defaults to 'Landlord' */
  signerRole?: string;
  /**
   * Which set of placeholders to extract:
   * - 'landlord' (default): /init_l1/…/init_l19/ + /sig_landlord/
   * - 'tenant': /init1/…/init19/ + /sig_tenant/
   */
  signerType?: 'landlord' | 'tenant';
  /** Called when all fields are signed and the user clicks Finish */
  onSigned: (signatureDataUrl: string, initialsDataUrl: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicLeaseSignModal({
  open,
  onClose,
  leaseHtml,
  landlordName,
  signerRole = 'Landlord',
  signerType = 'landlord',
  onSigned,
}: PublicLeaseSignModalProps) {
  const [consent, setConsent] = useState(false);
  const [signerName, setSignerName] = useState(landlordName || '');
  const [mounted, setMounted] = useState(false);

  const [signatureMode, setSignatureMode] = useState<SignatureMode>('type');
  const [fields, setFields] = useState<SigningField[]>([]);
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [initialsDataUrl, setInitialsDataUrl] = useState<string>('');
  const [signatureStyleIndex, setSignatureStyleIndex] = useState(0);

  const [modalSize, setModalSize] = useState({ width: 1200, height: 850 });
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leaseContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    if (open) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Extract signing fields from the lease HTML whenever the modal opens
  useEffect(() => {
    if (!open || !leaseHtml) return;
    const extracted: SigningField[] = [];

    if (signerType === 'tenant') {
      // Tenant initials — /init1/ … /init19/
      for (let i = 1; i <= 19; i++) {
        if (leaseHtml.includes(`/init${i}/`)) {
          extracted.push({
            id: `init${i}`,
            type: 'initial',
            placeholder: `/init${i}/`,
            label: `Initial ${i}`,
            value: null,
            completed: false,
          });
        }
      }
      // Tenant signature
      if (leaseHtml.includes('/sig_tenant/')) {
        extracted.push({
          id: 'sig_tenant',
          type: 'signature',
          placeholder: '/sig_tenant/',
          label: 'Tenant Signature',
          value: null,
          completed: false,
        });
      }
    } else {
      // Landlord initials — /init_l1/ … /init_l19/
      for (let i = 1; i <= 19; i++) {
        if (leaseHtml.includes(`/init_l${i}/`)) {
          extracted.push({
            id: `init_l${i}`,
            type: 'initial',
            placeholder: `/init_l${i}/`,
            label: `Initial ${i}`,
            value: null,
            completed: false,
          });
        }
      }
      // Landlord signature
      if (leaseHtml.includes('/sig_landlord/')) {
        extracted.push({
          id: 'sig_landlord',
          type: 'signature',
          placeholder: '/sig_landlord/',
          label: 'Landlord Signature',
          value: null,
          completed: false,
        });
      }
    }

    setFields(extracted);
    setActiveFieldIndex(extracted.length > 0 ? 0 : null);
    setConsent(false);
    setSignerName(landlordName || '');
  }, [open, leaseHtml, landlordName, signerType]);

  // Regenerate typed sig/initials when name or style changes
  useEffect(() => {
    if (signerName && signatureMode === 'type') {
      setSignatureDataUrl(generateStampSignature(signerName, signatureStyleIndex));
      setInitialsDataUrl(generateInitialStamp(generateInitials(signerName)));
    }
  }, [signerName, signatureMode, signatureStyleIndex]);

  // ── Resize handlers (identical to LeaseSigningModal) ──────────────────────
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault(); e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: modalSize.width, height: modalSize.height };
    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dx = ev.clientX - resizeStartRef.current.x;
      const dy = ev.clientY - resizeStartRef.current.y;
      let w = resizeStartRef.current.width;
      let h = resizeStartRef.current.height;
      if (direction.includes('e')) w = Math.max(600, Math.min(window.innerWidth - 40, w + dx * 2));
      if (direction.includes('w')) w = Math.max(600, Math.min(window.innerWidth - 40, w - dx * 2));
      if (direction.includes('s')) h = Math.max(400, Math.min(window.innerHeight - 40, h + dy * 2));
      if (direction.includes('n')) h = Math.max(400, Math.min(window.innerHeight - 40, h - dy * 2));
      setModalSize({ width: w, height: h });
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
    if (isMaximized) { setModalSize({ width: 1200, height: 850 }); setIsMaximized(false); }
    else { setModalSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 }); setIsMaximized(true); }
  }, [isMaximized]);

  // ── Canvas setup ──────────────────────────────────────────────────────────
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
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    if (!open || signatureMode !== 'draw' || activeFieldIndex === null) return;
    const t = setTimeout(setupCanvas, 100);
    return () => clearTimeout(t);
  }, [open, signatureMode, activeFieldIndex, setupCanvas]);

  // Canvas drawing
  useEffect(() => {
    if (!open || signatureMode !== 'draw' || activeFieldIndex === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let drawing = false;
    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const start = (e: PointerEvent) => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); drawing = true; const { x, y } = getPos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const move = (e: PointerEvent) => { if (!drawing) return; e.preventDefault(); const { x, y } = getPos(e); ctx.lineTo(x, y); ctx.stroke(); };
    const end = (e: PointerEvent) => { if (!drawing) return; e.preventDefault(); canvas.releasePointerCapture(e.pointerId); drawing = false; ctx.closePath(); };
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
  }, [open, signatureMode, activeFieldIndex]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  // ── Apply current field ───────────────────────────────────────────────────
  const applyCurrentField = useCallback(() => {
    if (activeFieldIndex === null || !fields[activeFieldIndex]) return;
    const field = fields[activeFieldIndex];
    let value: string | null = null;
    if (signatureMode === 'type') {
      value = field.type === 'signature' ? signatureDataUrl : initialsDataUrl;
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        value = canvas.toDataURL('image/png');
        if (field.type === 'signature') setSignatureDataUrl(value);
        else setInitialsDataUrl(value);
      }
    }
    if (value) {
      setFields(prev => prev.map((f, i) => i === activeFieldIndex ? { ...f, value, completed: true } : f));
      const nextIndex = fields.findIndex((f, i) => i > activeFieldIndex && !f.completed);
      if (nextIndex !== -1) { setActiveFieldIndex(nextIndex); if (signatureMode === 'draw') setTimeout(setupCanvas, 100); }
      else setActiveFieldIndex(null);
    }
  }, [activeFieldIndex, fields, signatureMode, signatureDataUrl, initialsDataUrl, setupCanvas]);

  // ── Scroll to active field ────────────────────────────────────────────────
  const scrollToField = useCallback((fieldId: string) => {
    if (!leaseContentRef.current) return;
    const el = leaseContentRef.current.querySelector(`[data-field-id="${fieldId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    if (activeFieldIndex !== null && fields[activeFieldIndex]) {
      setTimeout(() => scrollToField(fields[activeFieldIndex].id), 150);
    }
  }, [activeFieldIndex, fields, scrollToField]);

  const handleFieldClick = useCallback((fieldId: string) => {
    const index = fields.findIndex(f => f.id === fieldId);
    if (index !== -1 && !fields[index].completed) {
      setActiveFieldIndex(index);
      if (signatureMode === 'draw') setTimeout(setupCanvas, 100);
    }
  }, [fields, signatureMode, setupCanvas]);

  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const fieldEl = target.closest('[data-field-id]') as HTMLElement | null;
    if (fieldEl) { const id = fieldEl.getAttribute('data-field-id'); if (id) handleFieldClick(id); }
  };

  // ── Build interactive HTML with clickable field anchors ───────────────────
  const processedHtml = useMemo(() => {
    if (!leaseHtml) return '';
    let html = leaseHtml;
    fields.forEach((field) => {
      const isActive = fields[activeFieldIndex ?? -1]?.id === field.id;
      if (field.completed && field.value) {
        const imgStyle = field.type === 'signature' ? 'height: 40px; max-width: 200px;' : 'height: 28px; max-width: 60px;';
        html = html.replace(field.placeholder, `<img src="${field.value}" alt="${field.type}" style="${imgStyle} display: inline-block; vertical-align: middle;" />`);
      } else {
        const bgColor = isActive ? '#FEF08A' : '#FEF9C3';
        const borderColor = isActive ? '#EAB308' : '#FACC15';
        const shadow = isActive ? '0 0 0 3px rgba(234,179,8,0.4)' : 'none';
        const label = field.type === 'signature' ? 'Sign' : 'Initial';
        html = html.replace(field.placeholder, `<span data-field-id="${field.id}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;background:${bgColor};border:2px solid ${borderColor};border-radius:4px;font-size:13px;font-weight:600;color:#854D0E;cursor:pointer;box-shadow:${shadow};transition:all 0.15s ease;"><span style="font-size:11px;">▼</span> ${label}</span>`);
      }
    });
    return html;
  }, [leaseHtml, fields, activeFieldIndex]);

  const allFieldsCompleted = fields.length > 0 && fields.every(f => f.completed);
  const completedCount = fields.filter(f => f.completed).length;
  const activeField = activeFieldIndex !== null ? fields[activeFieldIndex] : null;

  // ── Finish ────────────────────────────────────────────────────────────────
  const handleFinish = () => {
    if (!allFieldsCompleted || !consent) return;
    const sigField = fields.find(f => f.type === 'signature');
    const initialsField = fields.find(f => f.type === 'initial');
    onSigned(sigField?.value ?? signatureDataUrl, initialsField?.value ?? initialsDataUrl);
  };

  if (!open || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 bg-blue-200">
      <div className="absolute inset-0 bg-black/15" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative z-10 bg-slate-50 rounded-lg shadow-2xl overflow-hidden flex flex-col"
        style={{
          width: `min(${modalSize.width}px, calc(100vw - 16px))`,
          height: `min(${modalSize.height}px, calc(100dvh - 16px))`,
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'calc(100dvh - 16px)',
          transition: isResizing ? 'none' : 'width 0.2s, height 0.2s',
        }}
      >
        {/* Resize handles */}
        <div className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-violet-500/20 z-20" onMouseDown={(e) => handleResizeStart(e, 'n')} />
        <div className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-violet-500/20 z-20" onMouseDown={(e) => handleResizeStart(e, 's')} />
        <div className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-violet-500/20 z-20" onMouseDown={(e) => handleResizeStart(e, 'w')} />
        <div className="absolute top-0 bottom-0 right-0 w-2 cursor-e-resize hover:bg-violet-500/20 z-20" onMouseDown={(e) => handleResizeStart(e, 'e')} />
        <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-violet-500/30 z-30" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
        <div className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize hover:bg-violet-500/30 z-30" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
        <div className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-violet-500/30 z-30" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-violet-500/30 z-30 flex items-center justify-center" onMouseDown={(e) => handleResizeStart(e, 'se')}>
          <GripHorizontal className="h-3 w-3 text-gray-400 rotate-[-45deg]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-indigo-600 text-white flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold uppercase tracking-wide">Sign Document</h2>
            <p className="text-xs text-indigo-200 truncate">{signerRole} • {landlordName}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={toggleMaximize} className="p-2 rounded-full hover:bg-white/20" title={isMaximized ? 'Restore' : 'Maximize'}>
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Document Panel */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50 min-w-0">
            {/* Progress */}
            <div className="px-3 sm:px-4 py-2 bg-white border-b flex items-center justify-between gap-2 flex-shrink-0">
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                {completedCount} of {fields.length} fields completed
              </span>
              <div className="flex-1 mx-2 sm:mx-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${fields.length > 0 ? (completedCount / fields.length) * 100 : 0}%` }}
                />
              </div>
              {allFieldsCompleted && <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
            </div>

            {/* Lease content */}
            <div ref={leaseContentRef} className="flex-1 overflow-auto p-2 sm:p-4" onClick={handleDocumentClick}>
              <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-4 sm:p-8">
                <div
                  className="prose prose-sm max-w-none"
                  style={{ fontSize: '14px', lineHeight: '1.7' }}
                  dangerouslySetInnerHTML={{ __html: processedHtml }}
                />
              </div>
            </div>
          </div>

          {/* Signing Panel */}
          <div className="w-full lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
            {activeField ? (
              <>
                <div className="px-3 sm:px-4 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-amber-800">
                      {activeField.type === 'signature'
                        ? 'Add Your Signature'
                        : `Add Initial (${activeFieldIndex! + 1} of ${fields.filter(f => f.type === 'initial').length})`}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Full Legal Name</label>
                    <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Enter your name" className="text-sm" />
                  </div>

                  {/* Mode toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setSignatureMode('type')}
                      className={`flex-1 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1 ${signatureMode === 'type' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    >
                      <Type className="h-4 w-4" /><span>Type</span>
                    </button>
                    <button
                      onClick={() => { setSignatureMode('draw'); setTimeout(setupCanvas, 100); }}
                      className={`flex-1 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1 ${signatureMode === 'draw' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    >
                      <PenTool className="h-4 w-4" /><span>Draw</span>
                    </button>
                  </div>

                  {/* Preview */}
                  {signatureMode === 'type' ? (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[100px] flex items-center justify-center bg-gray-50">
                        {signerName ? (
                          <img
                            src={activeField.type === 'signature' ? signatureDataUrl : initialsDataUrl}
                            alt="Preview"
                            className={activeField.type === 'signature' ? 'max-h-12 sm:max-h-16' : 'max-h-8 sm:max-h-10'}
                          />
                        ) : (
                          <p className="text-gray-400 text-xs sm:text-sm">Enter your name above</p>
                        )}
                      </div>
                      {activeField.type === 'signature' && signerName && (
                        <div className="flex justify-center gap-1 sm:gap-2">
                          {[0, 1, 2].map((i) => (
                            <button
                              key={i}
                              onClick={() => setSignatureStyleIndex(i)}
                              className={`px-2 sm:px-3 py-1 rounded text-xs font-medium ${signatureStyleIndex === i ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                            >
                              Style {i + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="border-2 border-indigo-400 rounded-lg overflow-hidden bg-white">
                        <canvas
                          ref={canvasRef}
                          className="w-full cursor-crosshair"
                          style={{ height: activeField.type === 'signature' ? '100px' : '70px', touchAction: 'none' }}
                        />
                      </div>
                      <button onClick={clearCanvas} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                    </div>
                  )}

                  {/* Apply */}
                  <Button
                    onClick={applyCurrentField}
                    disabled={!signerName}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-amber-900 font-semibold h-10"
                  >
                    {activeField.type === 'signature' ? 'Adopt and Sign' : 'Apply Initial'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                <Check className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-500 mb-3" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">All Fields Complete</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Review and finish signing below</p>
              </div>
            )}

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t bg-gray-50 space-y-3 flex-shrink-0">
              <div className="flex items-start gap-2">
                <Checkbox id="pub-consent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
                <label htmlFor="pub-consent" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                  I agree that my electronic signature is legally binding and equivalent to my handwritten signature.
                </label>
              </div>
              <Button
                onClick={handleFinish}
                disabled={!allFieldsCompleted || !consent}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 sm:h-12"
              >
                Finish
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
