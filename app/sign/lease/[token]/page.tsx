'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertTriangle, Loader2, FileText, Clock, Download } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the same modal used for landlord signing — identical UX
const PublicLeaseSignModal = dynamic(
  () => import('@/components/lease/public-lease-sign-modal'),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaseRecord {
  leaseHtml: string;
  signingHtml: string;          // renderLeaseHtml version with /init1/…/sig_tenant/ placeholders
  finalLeaseHtml: string | null;
  landlordName: string;
  landlordSigDataUrl: string | null;
  tenantName1: string;
  tenantEmail1: string;
  tenantName2: string | null;
  tenantEmail2: string | null;
  status: string;
  expiresAt: string | null;
  paidAt: string | null;
  tenantSignedAt: string | null;
  tenantSignedByName: string | null;
  propertyAddress: string | null;
  state: string | null;
  expired: boolean;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TenantLeaseSignPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const viewFinal = searchParams.get('view') === 'final';

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<LeaseRecord | null>(null);
  const [error, setError] = useState('');

  // Modal open state + submission
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/public/lease/sign/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'not_found') { setError('not_found'); return; }
        if (data.error) { setError(data.error); return; }
        setRecord(data);
        // Open the modal immediately if this is an active signing link
        // but NOT when the landlord is just previewing with ?view=final
        if (data.status === 'pending_tenant_sig' && !data.expired && !viewFinal) {
          setModalOpen(true);
        }
      })
      .catch(() => setError('network'))
      .finally(() => setLoading(false));
  }, [token]);

  const printLease = () => {
    const html = viewFinal || record?.status === 'completed'
      ? record?.finalLeaseHtml ?? record?.leaseHtml ?? ''
      : record?.leaseHtml ?? '';
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); }
  };

  // Called by PublicLeaseSignModal when the tenant completes all fields
  const handleSigned = async (signatureDataUrl: string, initialsDataUrl: string) => {
    if (!record) return;
    setModalOpen(false);
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/public/lease/sign/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSigDataUrl: signatureDataUrl,
          initialsDataUrl,
          signerName: record.tenantName1,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setSubmitError(json.error || 'Something went wrong. Please try again.'); return; }
      setDone(true);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  if (error === 'not_found' || !record) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Signing link not found</h1>
          <p className="text-sm text-gray-600">This link may have expired or been revoked. Please contact the landlord for a new link.</p>
        </div>
      </div>
    );
  }

  // ── Expired ─────────────────────────────────────────────────────────────────
  if (record.expired && record.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <Clock className="h-12 w-12 text-amber-400 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">This link has expired</h1>
          <p className="text-sm text-gray-600">Signing links are valid for 14 days. Please contact your landlord and ask them to resend the invitation.</p>
        </div>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (done || (record.status === 'completed' && !viewFinal)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-5">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-3" />
            <h1 className="text-2xl font-bold mb-1">Lease signed!</h1>
            <p className="text-emerald-100 text-sm">Both parties will receive a copy of the fully executed lease by email shortly.</p>
          </div>
          <button
            onClick={printLease}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-800 font-semibold px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            <Download className="h-4 w-4" /> Print / Save Signed Lease
          </button>
          <div className="text-center text-xs text-gray-400">
            Powered by{' '}
            <Link href="https://www.propertyflowhq.com" className="text-sky-500 hover:underline">PropertyFlow HQ</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Final view (view=final in URL) ──────────────────────────────────────────
  if (viewFinal || record.status === 'completed') {
    const html = record.finalLeaseHtml ?? record.leaseHtml ?? '';
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold text-gray-900 text-sm">Signed Lease Agreement</span>
          </div>
          <button onClick={printLease} className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700">
            <Download className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8"
            style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    );
  }

  // ── Main signing UI — the full-screen modal ──────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {submitting && (
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500 mx-auto" />
          <p className="text-sm text-gray-600">Saving your signature…</p>
        </div>
      )}

      {submitError && !submitting && (
        <div className="max-w-md text-center space-y-4 p-4">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-sm text-red-600">{submitError}</p>
          <button
            onClick={() => { setSubmitError(''); setModalOpen(true); }}
            className="text-sm text-sky-600 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!submitting && !submitError && (
        <PublicLeaseSignModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          leaseHtml={record.signingHtml ?? record.leaseHtml}
          landlordName={record.tenantName1}
          signerRole="Tenant"
          signerType="tenant"
          onSigned={handleSigned}
        />
      )}
    </div>
  );
}
