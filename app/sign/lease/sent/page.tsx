/**
 * /sign/lease/sent?token=xxx
 *
 * Confirmation page shown to the landlord after a successful $4.99 Stripe checkout.
 * Stripe redirects here via success_url.
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail, Clock, FileText, RotateCcw, Loader2 } from 'lucide-react';

export default function LeaseEsignSentPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState('');

  const handleResend = async () => {
    if (!token) return;
    setResending(true);
    setResendError('');
    try {
      const res = await fetch('/api/public/lease/esign-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) { setResendError('Could not resend. Please try again.'); return; }
      setResent(true);
    } catch {
      setResendError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center px-4 py-14">
      <div className="max-w-lg w-full space-y-6">

        {/* Success card */}
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-3" />
            <h1 className="text-2xl font-bold mb-1">Lease sent for signing!</h1>
            <p className="text-emerald-100 text-sm">
              Your tenant has been emailed a secure link to review and sign the lease.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* What happens next */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">What happens next</p>
              <div className="space-y-3">
                {[
                  {
                    icon: <Mail className="h-4 w-4 text-sky-500" />,
                    text: 'Your tenant received an email with a secure signing link. It works on any device.',
                  },
                  {
                    icon: <FileText className="h-4 w-4 text-sky-500" />,
                    text: 'They review the lease and draw their signature directly in their browser — no account needed.',
                  },
                  {
                    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
                    text: 'Once signed, both you and your tenant are emailed a copy of the fully executed lease.',
                  },
                  {
                    icon: <Clock className="h-4 w-4 text-amber-500" />,
                    text: 'The signing link is valid for 14 days. After that you can request a resend.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                    <p className="text-sm text-gray-700">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resend invite */}
            {token && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Tenant hasn&apos;t signed yet?</p>
                {resent ? (
                  <p className="text-xs text-emerald-600 font-semibold">✓ Reminder sent!</p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50"
                  >
                    {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                    Resend signing invite
                  </button>
                )}
                {resendError && <p className="text-xs text-red-500 mt-1">{resendError}</p>}
              </div>
            )}
            {/* View lease link */}
            {token && (
              <Link
                href={`/sign/lease/${token}?view=final`}
                className="block text-center text-sm font-semibold text-sky-600 hover:text-sky-700 underline underline-offset-2"
              >
                View lease document →
              </Link>
            )}
          </div>
        </div>

        {/* Cross-sell */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-gray-900 mb-1">
            Want to do this automatically every time?
          </p>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            PropertyFlow HQ gives you unlimited e-signatures, online rent collection, tenant portal,
            maintenance tracking, and more — starting at $39/month. 14-day free trial, no credit card.
          </p>
          <Link
            href="/sign-up?utm_source=free_lease&utm_medium=esign_sent"
            className="block text-center bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            Start Free Trial →
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400">
          Powered by{' '}
          <Link href="https://www.propertyflowhq.com" className="text-sky-500 hover:underline">
            PropertyFlow HQ
          </Link>
        </p>
      </div>
    </main>
  );
}
