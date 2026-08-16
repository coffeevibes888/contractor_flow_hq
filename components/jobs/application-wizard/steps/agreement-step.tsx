'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { FileSignature, Shield, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useJobApplicationWizard } from '../wizard-context';

interface Props {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function AgreementStep({ setValidate }: Props) {
  const { state, updateFormData } = useJobApplicationWizard();
  const d = state.formData;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!d.signatureUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!d.certifyTruthful) e.certifyTruthful = 'You must certify the information is truthful';
    if (!d.signedName?.trim()) e.signedName = 'Please type your full name';
    if (!d.signatureUrl) e.signature = 'Please draw your signature';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [d.certifyTruthful, d.signedName, d.signatureUrl]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Restore existing signature if present
    if (d.signatureUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setIsEmpty(false);
      };
      img.src = d.signatureUrl;
    }
  }, []); // eslint-disable-line

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      updateFormData({ signatureUrl: canvas.toDataURL('image/png') });
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    updateFormData({ signatureUrl: '' });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <FileSignature className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Agreement & Signature</h2>
        <p className="text-slate-300 mt-2">Review consents and sign your application</p>
      </div>

      {/* Consents */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700 cursor-pointer hover:border-slate-600">
          <input
            type="checkbox"
            checked={!!d.backgroundCheckConsent}
            onChange={(e) => updateFormData({ backgroundCheckConsent: e.target.checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-semibold text-white">Background Check Consent</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              I authorize the employer to perform a background check, including criminal history
              and prior employment verification. Optional but may be required for hiring.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700 cursor-pointer hover:border-slate-600">
          <input
            type="checkbox"
            checked={!!d.creditCheckConsent}
            onChange={(e) => updateFormData({ creditCheckConsent: e.target.checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-semibold text-white">Credit Check Consent (optional)</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              I authorize the employer to perform a credit check when relevant to the position.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer">
          <input
            type="checkbox"
            checked={!!d.certifyTruthful}
            onChange={(e) => updateFormData({ certifyTruthful: e.target.checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Certification of Accuracy *</p>
            <p className="text-xs text-slate-300 mt-1">
              I certify that all information provided in this application is true and complete
              to the best of my knowledge. I understand that any false information may disqualify
              me from employment or result in termination.
            </p>
          </div>
        </label>
        {errors.certifyTruthful && <p className="text-sm text-red-400">{errors.certifyTruthful}</p>}
      </div>

      {/* Typed name */}
      <div className="space-y-2 pt-4 border-t border-slate-700/50">
        <Label className="text-slate-200">Type Your Full Legal Name *</Label>
        <Input
          value={d.signedName || ''}
          onChange={(e) => updateFormData({ signedName: e.target.value })}
          placeholder="Jane Doe"
          className="bg-slate-800/50 border-slate-600 text-white h-11"
        />
        {errors.signedName && <p className="text-sm text-red-400">{errors.signedName}</p>}
      </div>

      {/* Signature pad */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200">Draw Your Signature *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            className="text-slate-300 hover:text-white"
          >
            <RotateCcw className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
        <div className="relative rounded-xl border-2 border-dashed border-slate-600 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-40 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-400 text-sm">Sign here</p>
            </div>
          )}
        </div>
        {!isEmpty && (
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Signature captured
          </p>
        )}
        {errors.signature && <p className="text-sm text-red-400">{errors.signature}</p>}
      </div>
    </div>
  );
}
