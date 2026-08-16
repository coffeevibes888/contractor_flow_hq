'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2, Loader2, PenLine, FileText,
  ArrowLeft, RotateCcw, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  body: string;
  status: string;
  customerName: string;
  customerSignatureDataUrl: string | null;
  customerSignedAt: string | null;
  customerSignedName: string | null;
  contractAmount: string | null;
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

// ── Component ──────────────────────────────────────────────────────────────────

export default function ContractorCountersignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'review' | 'sign' | 'done'>('review');
  const [signerName, setSignerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Canvas signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [signatureStyle, setSignatureStyle] = useState(0);
  const [stampSignature, setStampSignature] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/contractor/contracts/${id}/countersign`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load contract');
        } else {
          setContract(data.contract);
          setSignerName(data.contract.customerSignedName || '');
        }
      })
      .catch(() => setError('Failed to load contract'))
      .finally(() => setLoading(false));
  }, [id]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
      setStampSignature(null);
    };

    const end = () => { isDrawing.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', end);
    };
  }, [step]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setStampSignature(null);
  };

  const adoptStamp = () => {
    const stamp = generateStampSignature(signerName, signatureStyle);
    setStampSignature(stamp);
    setHasSignature(true);
  };

  const getSignatureDataUrl = (): string | null => {
    if (stampSignature) return stampSignature;
    if (hasSignature && canvasRef.current) {
      return canvasRef.current.toDataURL('image/png');
    }
    return null;
  };

  const handleSubmit = async () => {
    const sig = getSignatureDataUrl();
    if (!sig || !signerName) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/contractor/contracts/${id}/countersign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: sig, signerName }),
      });

      if (res.ok) {
        setStep('done');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to sign contract');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Contract</h2>
          <p className="text-gray-500">{error || 'Contract not found'}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Contract Executed!</h2>
          <p className="text-gray-500 mb-6">
            Both parties have signed. The contract is now fully executed and legally binding.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Contract #{contract.contractNumber} — A confirmation email has been sent to both parties.
          </p>
          <Button onClick={() => router.push(`/contractor-dashboard/contracts/${contract.id}`)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white">
            View Contract
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">{contract.title}</h1>
            <p className="text-xs text-gray-500">{contract.contractNumber}</p>
          </div>
          {contract.contractAmount && (
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">${Number(contract.contractAmount).toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Customer signature status */}
        {contract.customerSignatureDataUrl && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Customer has signed</p>
                <p className="text-xs text-emerald-600">
                  Signed by {contract.customerSignedName} on{' '}
                  {contract.customerSignedAt && new Date(contract.customerSignedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contract Document */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="font-bold text-gray-900">Contract Document</h2>
            <p className="text-sm text-gray-500">Please review the full contract before signing below.</p>
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: contract.body }} />
        </div>

        {/* Signing Section */}
        <div className="rounded-xl border-2 border-cyan-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Countersign This Contract</h2>

          {/* Name */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-1">Your Full Name *</label>
            <input
              type="text"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              placeholder="Enter your full legal name"
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Signature Mode */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSignatureMode('draw')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                signatureMode === 'draw'
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <PenLine className="h-4 w-4 inline mr-1" /> Draw
            </button>
            <button
              onClick={() => { setSignatureMode('type'); adoptStamp(); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                signatureMode === 'type'
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Type
            </button>
          </div>

          {/* Signature Canvas */}
          {signatureMode === 'draw' && (
            <div className="mb-4">
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={clearCanvas} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>
          )}

          {/* Stamp Preview */}
          {signatureMode === 'type' && stampSignature && (
            <div className="mb-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white text-center">
                <img src={stampSignature} alt="Signature preview" className="h-20 mx-auto" />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setSignatureStyle(s => (s + 1) % 3); adoptStamp(); }}
                  className="text-sm text-cyan-600 hover:text-cyan-700">
                  Change Style
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleSubmit}
              disabled={!signerName || !hasSignature || submitting}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4 mr-2" />
              )}
              Countersign Contract
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
