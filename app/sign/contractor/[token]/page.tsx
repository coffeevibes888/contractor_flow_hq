'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2, XCircle, Loader2, PenLine,
  FileText, Calendar, DollarSign, AlertTriangle,
  RotateCcw, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: string;
  body: string;
  status: string;
  customerName: string;
  customerEmail: string;
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string | null;
  contractAmount: string | null;
  depositAmount: string | null;
  paymentTerms: string | null;
  expiresAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  service_agreement: 'Service Agreement',
  change_order: 'Change Order',
  proposal: 'Proposal',
  scope_of_work: 'Scope of Work',
  warranty: 'Warranty',
  other: 'Contract',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContractorSignPage() {
  const { token } = useParams<{ token: string }>();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [step, setStep] = useState<'review' | 'sign' | 'done' | 'declined'>('review');
  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Canvas signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    fetch(`/api/sign/contractor/${token}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load contract');
          setErrorCode(data.code || null);
        } else {
          setContract(data.contract);
          setSignerName(data.contract.customerName || '');
          if (data.contract.status === 'signed') setStep('done');
          if (data.contract.status === 'declined') setStep('declined');
        }
      })
      .catch(() => setError('Failed to load contract'))
      .finally(() => setLoading(false));
  }, [token]);

  // Canvas drawing
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawing.current = true;
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDrawing.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleSign() {
    if (!hasSignature || !signerName.trim() || !agreed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureDataUrl = canvas.toDataURL('image/png');

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/contractor/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign', signatureDataUrl, signerName: signerName.trim() }),
      });
      if (res.ok) {
        setStep('done');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit signature');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    if (!declineReason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/contractor/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', declineReason }),
      });
      if (res.ok) {
        setStep('declined');
        setShowDeclineModal(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          {errorCode === 'EXPIRED' ? (
            <>
              <AlertTriangle className="h-14 w-14 text-amber-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h1>
              <p className="text-gray-500">This signing link has expired. Please contact the contractor for a new link.</p>
            </>
          ) : (
            <>
              <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Contract</h1>
              <p className="text-gray-500">{error}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Signed!</h1>
          <p className="text-gray-500 mb-4">
            You have successfully signed <strong>{contract?.title}</strong>.
            A copy will be sent to <strong>{contract?.customerEmail}</strong>.
          </p>
          <p className="text-xs text-gray-400">
            {contract?.contractNumber} · {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  if (step === 'declined') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Contract Declined</h1>
          <p className="text-gray-500">You have declined to sign this contract. The contractor has been notified.</p>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{contract.title}</p>
              <p className="text-xs text-gray-500">{contract.contractNumber} · from {contract.contractorName}</p>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-700">{TYPE_LABELS[contract.type] || contract.type}</Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Contract details bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {contract.contractAmount && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-gray-500">Contract Amount</span>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(Number(contract.contractAmount))}</p>
            </div>
          )}
          {contract.depositAmount && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-gray-500">Deposit</span>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(Number(contract.depositAmount))}</p>
            </div>
          )}
          {contract.expiresAt && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-gray-500">Offer Expires</span>
              </div>
              <p className="font-bold text-gray-900">{new Date(contract.expiresAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {/* Contract body */}
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Contract Terms</h2>
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: contract.body }} />
        </div>

        {/* Signing section */}
        {step === 'review' && (
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <PenLine className="h-5 w-5 text-blue-600" />
              Sign This Contract
            </h2>

            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Type your full legal name"
                className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>

            {/* Signature canvas */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Signature <span className="text-red-500">*</span>
                </label>
                {hasSignature && (
                  <button
                    onClick={clearSignature}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>
              <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={180}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-sm text-gray-400">Draw your signature here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Agreement checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-600">
                I, <strong>{signerName || '[your name]'}</strong>, agree to the terms of this contract and acknowledge
                that my electronic signature is legally binding.
              </span>
            </label>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleSign}
                disabled={!hasSignature || !signerName.trim() || !agreed || submitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Sign Contract
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeclineModal(true)}
                disabled={submitting}
                className="border-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-8">
          Secured by PropertyFlowHQ · Contract {contract.contractNumber}
        </p>
      </div>

      {/* Decline modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Decline Contract</h2>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason for declining.</p>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Reason for declining..."
              rows={4}
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 border-2 border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDecline}
                disabled={!declineReason.trim() || submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Decline'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
