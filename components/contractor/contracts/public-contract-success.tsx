'use client';

/**
 * PublicContractSuccess
 *
 * Choice screen after contract generation on the free contract builder.
 * Mirrors PublicLeaseSuccess from the PM side.
 *
 * Left card : Free e-sign (sign now, send to customer)
 * Right card: Download PDF + sign up CTA
 */

import { useState } from 'react';
import {
  CheckCircle, Download, Send, FileText, Loader2,
  PenLine, ArrowRight, Sparkles, AlertTriangle, Lock,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Reuse the same signing modal from the lease side — it's generic
const PublicLeaseSignModal = dynamic(
  () => import('@/components/lease/public-lease-sign-modal'),
  { ssr: false },
);

export interface PublicContractSuccessProps {
  contractHtml: string;
  email: string;
  isAuthenticated: boolean;
  data: {
    contractorLegalName: string;
    contractorEmail: string;
    customerName: string;
    customerEmail: string;
    jobTitle: string;
    totalAmount: number;
    governingState: string;
  };
}

export default function PublicContractSuccess({
  contractHtml,
  email,
  isAuthenticated,
  data,
}: PublicContractSuccessProps) {
  type Screen = 'choice' | 'esign-sent';
  const [screen, setScreen] = useState<Screen>('choice');
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [esignLoading, setEsignLoading] = useState(false);
  const [esignError, setEsignError] = useState('');

  const printContract = () => {
    const win = window.open('', '_blank');
    if (win) { win.document.write(contractHtml); win.document.close(); win.focus(); win.print(); }
  };

  const signUpUrl = `/sign-up?role=contractor&email=${encodeURIComponent(email)}&utm_source=free_contract&utm_medium=success_cta`;

  const handleSignedByContractor = async (signatureDataUrl: string, _initialsDataUrl: string) => {
    setSignModalOpen(false);
    setEsignLoading(true);
    setEsignError('');

    try {
      const res = await fetch('/api/public/contract/esign-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractHtml,
          contractorName: data.contractorLegalName,
          contractorEmail: data.contractorEmail || email,
          contractorSigDataUrl: signatureDataUrl,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          jobTitle: data.jobTitle,
          totalAmount: data.totalAmount,
          governingState: data.governingState,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEsignError(json.error || 'Could not send for signing. Please try again.');
        return;
      }
      if (json.redirectUrl) {
        window.location.href = json.redirectUrl;
        return;
      }
      setScreen('esign-sent');
    } catch {
      setEsignError('Network error. Please try again.');
    } finally {
      setEsignLoading(false);
    }
  };

  // ── E-SIGN SENT ───────────────────────────────────────────────────────────
  if (screen === 'esign-sent') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 text-center space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contract sent for signing!</h2>
          <p className="text-sm text-gray-600 mb-4">
            {data.customerName} will receive an email with a link to review and sign the contract.
          </p>
          <p className="text-xs text-gray-500">
            You&apos;ll be notified by email when they sign. The signed contract will be available for download.
          </p>
        </div>
        <a
          href={signUpUrl}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:from-rose-600 hover:to-orange-600 transition-colors text-sm"
        >
          <Sparkles className="h-4 w-4" />
          Manage all your contracts in one place →
        </a>
      </div>
    );
  }

  // ── CHOICE SCREEN ─────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto px-2 py-4 space-y-4">
      {/* Contract ready banner */}
      <div className="flex flex-col items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 text-center">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <p className="font-bold text-emerald-800 text-sm">
            Your {data.governingState} service agreement is ready
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={printContract}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-3 w-3" /> View / Print PDF
          </button>
        </div>
      </div>

      {/* Two-card layout */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Left: E-Sign Card */}
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white flex flex-col">
          <div className="absolute -top-2 left-4">
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Free — 1 on us!
            </span>
          </div>
          <PenLine className="h-7 w-7 text-orange-400 mb-3 mt-1" />
          <h3 className="font-bold text-base mb-1">Sign & Send to Customer</h3>
          <p className="text-xs text-slate-300 mb-4 flex-1">
            Sign the contract now and send it to <strong>{data.customerName}</strong> for countersignature — legally binding, no account needed.
          </p>
          <button
            onClick={() => setSignModalOpen(true)}
            disabled={esignLoading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {esignLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" /> Sign & Send Free
              </>
            )}
          </button>
          {!data.customerEmail && (
            <p className="text-xs text-amber-300 mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Add customer email to use e-sign
            </p>
          )}
        </div>

        {/* Right: Save + Sign Up Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col">
          <FileText className="h-7 w-7 text-orange-500 mb-3" />
          <h3 className="font-bold text-base text-gray-900 mb-1">Save & Manage Online</h3>
          <p className="text-xs text-gray-600 mb-4 flex-1">
            Start a free trial to get unlimited contracts, e-signatures, invoicing, scheduling, and team management — all in one platform.
          </p>
          <a
            href={signUpUrl}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-center text-[10px] text-gray-400 mt-2">14 days free · No credit card · $99/mo after</p>
        </div>
      </div>

      {/* E-sign error */}
      {esignError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          {esignError}
        </div>
      )}

      {/* Signing Modal */}
      <PublicLeaseSignModal
        open={signModalOpen}
        onClose={() => setSignModalOpen(false)}
        leaseHtml={contractHtml}
        landlordName={data.contractorLegalName}
        signerRole="Contractor"
        signerType="landlord"
        onSigned={handleSignedByContractor}
      />

      {/* Security badges */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 pt-2">
        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> 256-bit encrypted</span>
        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> ESIGN Act compliant</span>
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Court-ready format</span>
      </div>
    </div>
  );
}
