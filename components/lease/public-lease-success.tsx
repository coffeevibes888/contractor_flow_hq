'use client';

/**
 * PublicLeaseSuccess
 *
 * Choice screen after lease generation.
 * Left card  : Free e-sign (immediate action, no account needed)
 * Right card : Save lease + set up account CTA with session-expiry urgency
 */

import { useState, useMemo } from 'react';
import {
  CheckCircle, Download, Send, FileText, Loader2, RotateCcw,
  PenLine, CreditCard, Users, Wrench, BarChart3, Bell, Building2,
  Infinity, Zap, ShieldCheck, Star, AlertTriangle, Lock,
  ArrowRight, Sparkles,
} from 'lucide-react';
import LeaseViewer from '@/components/lease-viewer/lease-viewer';
import PublicLeaseSignModal from './public-lease-sign-modal';
import { renderLeaseHtml } from '@/lib/services/lease-template';

// PLATFORM_FEATURES used only in the authenticated right-panel (inline below)

export interface PublicLeaseSuccessProps {
  leaseHtml: string;
  /** The renderLeaseHtml version with /init_l1/…/sig_landlord/ placeholders for signing */
  signingHtml: string;
  state: string;
  email: string;
  isAuthenticated: boolean;
  data: {
    landlordLegalName: string;
    landlordEmail: string;
    tenantName1: string;
    tenantEmail1: string;
    tenantName2: string;
    tenantEmail2?: string;
    propertyAddress: string;
    state: string;
    monthlyRent?: string;
    utmSource?: string;
    utmMedium?: string;
  };
}

export default function PublicLeaseSuccess({
  leaseHtml,
  signingHtml,
  state,
  email,
  isAuthenticated,
  data,
}: PublicLeaseSuccessProps) {
  type Screen = 'choice' | 'download' | 'esign';
  const [screen, setScreen] = useState<Screen>('choice');
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [esignLoading, setEsignLoading] = useState(false);
  const [esignError, setEsignError] = useState('');

  // Guarantee the signing HTML has landlord placeholders (/init_l1/…/sig_landlord/).
  // If the prop is missing or is the display HTML (no placeholders), generate it
  // client-side from the lease-template using the available data.
  const effectiveSigningHtml = useMemo(() => {
    if (signingHtml && signingHtml.includes('/init_l1/')) return signingHtml;
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return renderLeaseHtml({
      landlordName: data.landlordLegalName || 'Landlord',
      tenantName: data.tenantName1 || 'Tenant',
      propertyLabel: data.propertyAddress || 'Property',
      leaseStartDate: today,
      leaseEndDate: 'Month-to-Month',
      rentAmount: '0',
      billingDayOfMonth: '1',
      todayDate: today,
      state: data.state || 'NV',
    });
  }, [signingHtml, data]);

  // Build a base64-encoded context blob so the sign-up page can
  // pre-fill the form AND the post-signup action can auto-create the property.
  const leaseContextParam = (() => {
    try {
      const payload = {
        landlordName: data.landlordLegalName || '',
        landlordEmail: data.landlordEmail || email,
        propertyAddress: data.propertyAddress || '',
        state: data.state || state,
        tenantName: data.tenantName1 || '',
        tenantEmail: data.tenantEmail1 || '',
        monthlyRent: data.monthlyRent || '',
      };
      const encoded = btoa(JSON.stringify(payload));
      try {
        // Stash the context blob for the sign-up form fallback
        sessionStorage.setItem('pf_lc', encoded);
        // Stash the full lease HTML so the smart-setup page can save it
        // as a LegalDocument and link it to the auto-created property.
        // Stored separately (too large to base64 into the URL).
        sessionStorage.setItem('pf_lease_html', leaseHtml);
      } catch { /* incognito / quota exceeded — non-fatal */ }
      return encoded;
    } catch {
      return '';
    }
  })();

  const signUpUrl = (medium: string) => {
    const base = `/sign-up?email=${encodeURIComponent(email)}&utm_source=free_lease&utm_medium=${medium}&role=landlord`;
    return leaseContextParam ? `${base}&lc=${encodeURIComponent(leaseContextParam)}` : base;
  };

  const printLease = () => {
    const win = window.open('', '_blank');
    if (win) { win.document.write(leaseHtml); win.document.close(); win.focus(); win.print(); }
  };

  const handleSignedByLandlord = async (signatureDataUrl: string, _initialsDataUrl: string) => {
    setSigDataUrl(signatureDataUrl);
    setSignModalOpen(false);
    setScreen('esign');
    startEsignCheckout(signatureDataUrl);
  };

  const startEsignCheckout = async (overrideSig?: string) => {
    const sig = overrideSig ?? sigDataUrl;
    if (!sig) { setEsignError('Please sign the document first.'); return; }
    if (!data.tenantEmail1) { setEsignError("Please go back and add your tenant's email address."); return; }
    setEsignLoading(true);
    setEsignError('');
    try {
      const res = await fetch('/api/public/lease/esign-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseHtml,
          landlordName: data.landlordLegalName,
          landlordEmail: data.landlordEmail || email,
          landlordSigDataUrl: sig,
          tenantName1: data.tenantName1,
          tenantEmail1: data.tenantEmail1,
          tenantName2: data.tenantName2 || undefined,
          tenantEmail2: data.tenantEmail2 || undefined,
          state: data.state,
          propertyAddress: data.propertyAddress,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setEsignError(json.error || 'Could not send for signing. Please try again.'); return; }
      if (json.redirectUrl) { window.location.href = json.redirectUrl; return; }
      if (json.checkoutUrl) { window.location.href = json.checkoutUrl; return; }
      setEsignError('Could not start signing. Please try again.');
    } catch { setEsignError('Network error. Please try again.'); }
    finally { setEsignLoading(false); }
  };

  // ── CHOICE SCREEN ─────────────────────────────────────────────────────────
  if (screen === 'choice') {
    // Personalised address line for the urgency banner
    const addressShort = data.propertyAddress
      ? data.propertyAddress.split(',')[0]
      : null;

    // Rent display for the right-panel subline
    const rentDisplay = data.monthlyRent && Number(data.monthlyRent) > 0
      ? `$${Number(data.monthlyRent).toLocaleString()}/mo`
      : null;

    // Tenant first name for personalised CTA
    const tenantFirst = data.tenantName1
      ? data.tenantName1.split(' ')[0]
      : null;

    return (
      <div className="w-full max-w-2xl mx-auto px-2 py-4 space-y-4">

        {/* ── Lease-ready confirmation + view/print ── */}
        <div className="flex flex-col items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 text-center">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <p className="font-bold text-emerald-800 text-sm">
              Your {state} lease is ready — choose how to use it below
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <LeaseViewer
              leaseHtml={leaseHtml}
              triggerLabel="View Lease"
              documentTitle={`${state} Residential Lease Agreement`}
            />
            <button
              type="button"
              onClick={printLease}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="h-3 w-3" />
              Print PDF
            </button>
          </div>
        </div>

        {/* ── Session-expiry urgency banner — guests only ── */}
        {!isAuthenticated && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Your lease isn&apos;t saved yet.</span>{' '}
              {addressShort
                ? <>The lease for <span className="font-semibold">{addressShort}</span> will be lost when you close this tab — sign up in 30 seconds to save it automatically.</>
                : <>It will be lost when you close this tab. Sign up in 30 seconds to save it permanently to your account.</>
              }
            </p>
          </div>
        )}

        {/* ── Side-by-side cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">

          {/* ── LEFT — free e-sign card ── */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl flex flex-col">
            {/* Badge row */}
            <div className="flex items-center justify-between px-4 pt-4 pb-0">
              <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/30 rounded-full px-2 py-0.5">
                <Zap className="h-3 w-3 text-amber-400" />
                <span className="text-amber-300 text-[10px] font-bold uppercase tracking-wide">Quickest path</span>
              </div>
              {!isAuthenticated && (
                <div className="flex items-center gap-0.5">
                  {[0,1,2,3,4].map(i => (
                    <Star key={i} className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="text-slate-400 text-[10px] ml-1">4.9</span>
                </div>
              )}
            </div>

            {/* Price + headline */}
            <div className="px-4 pt-3 pb-2 flex-1">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-3xl font-extrabold text-white">Free</span>
                {!isAuthenticated && (
                  <span className="text-slate-400 text-xs">one on us</span>
                )}
              </div>
              <h3 className="text-white font-bold text-sm leading-snug mb-1">
                {tenantFirst
                  ? `Sign & send to ${tenantFirst} electronically`
                  : 'Sign & send to tenant electronically'}
              </h3>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
                You sign first, then your tenant gets a secure email link to countersign. Legally binding in all 50 states.
              </p>

              {/* Feature bullets */}
              <div className="space-y-1.5 mb-2">
                {[
                  { icon: <ShieldCheck className="h-3 w-3 text-emerald-400" />, text: 'Legally binding e-signature' },
                  { icon: <Send className="h-3 w-3 text-sky-400" />, text: `${tenantFirst ? `${tenantFirst} gets` : 'Tenant gets'} a secure email link` },
                  { icon: <FileText className="h-3 w-3 text-violet-400" />, text: 'Signed PDF saved automatically' },
                  { icon: <CheckCircle className="h-3 w-3 text-emerald-400" />, text: 'Full audit trail included' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    {icon}
                    <span className="text-slate-300 text-[11px]">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-4 pb-4 pt-2">
              <button
                type="button"
                onClick={() => { setScreen('esign'); setSignModalOpen(true); }}
                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-sky-500/20 active:scale-[0.98]"
              >
                <PenLine className="h-3.5 w-3.5" />
                {tenantFirst ? `Sign & Send to ${tenantFirst} →` : 'Sign & Send Free →'}
              </button>
              <p className="mt-1.5 text-center text-[10px] text-slate-500">No account needed · Instant delivery</p>
            </div>
          </div>

          {/* ── RIGHT — save lease + start trial ── */}
          {!isAuthenticated ? (
            <div className="rounded-xl flex flex-col bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-xl shadow-violet-500/20">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-violet-200" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-200">PropertyFlow HQ</p>
                </div>
                <h2 className="text-sm font-extrabold text-white leading-snug">
                  {addressShort
                    ? `Save your ${addressShort} lease & set up your account`
                    : 'Save your lease & set up your account'}
                </h2>
                <p className="text-violet-200 text-[10px] mt-0.5">
                  {rentDisplay
                    ? `We'll save your lease, create the property, and set up ${rentDisplay} rent collection — automatically.`
                    : 'We\'ll save your lease, create the property, and set up rent collection — automatically.'}
                </p>
              </div>

              {/* What gets auto-done */}
              <ul className="px-4 py-3 flex-1 space-y-2">
                {[
                  { icon: <FileText className="h-3.5 w-3.5 text-violet-300" />, text: 'Lease saved to your account' },
                  { icon: <Building2 className="h-3.5 w-3.5 text-sky-300" />, text: addressShort ? `${addressShort} created as a property` : 'Property auto-created from your lease' },
                  { icon: <CreditCard className="h-3.5 w-3.5 text-emerald-300" />, text: rentDisplay ? `${rentDisplay} rent collection ready` : 'Online rent collection ready' },
                  { icon: <Users className="h-3.5 w-3.5 text-amber-300" />, text: tenantFirst ? `${tenantFirst}'s tenant portal pre-configured` : 'Tenant portal pre-configured' },
                  { icon: <Infinity className="h-3.5 w-3.5 text-violet-300" />, text: 'Unlimited leases & e-signatures' },
                  { icon: <BarChart3 className="h-3.5 w-3.5 text-sky-300" />, text: 'Maintenance, accounting & reminders' },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-center gap-2">
                    <div className="flex-shrink-0">{icon}</div>
                    <p className="text-xs font-medium text-white leading-tight">{text}</p>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="px-4 pb-4 pt-2 space-y-2">
                <a
                  href={signUpUrl('choice_screen_trial')}
                  className="flex items-center justify-center gap-2 bg-white text-indigo-700 font-extrabold px-4 py-3 rounded-xl hover:bg-violet-50 active:scale-[0.98] transition-all text-sm shadow-lg shadow-black/20"
                >
                  Save my lease &amp; set up account
                  <ArrowRight className="h-4 w-4" />
                </a>
                {/* Trust pill — elevated position, directly under button */}
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1 text-violet-200/70 text-[10px]">
                    <Lock className="h-2.5 w-2.5" />
                    No credit card
                  </div>
                  <span className="text-violet-200/30 text-[10px]">·</span>
                  <span className="text-violet-200/70 text-[10px]">14-day free trial</span>
                  <span className="text-violet-200/30 text-[10px]">·</span>
                  <span className="text-violet-200/70 text-[10px]">30 seconds to set up</span>
                </div>
              </div>
            </div>
          ) : (
            /* Authenticated — show features-only panel */
            <div className="rounded-xl flex flex-col bg-white border border-gray-200">
              <div className="px-4 pt-4 pb-2.5 border-b border-gray-100">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5 text-sky-600">PropertyFlow HQ</p>
                <h2 className="text-sm font-bold leading-tight text-gray-900">All-in-one property management</h2>
              </div>
              <ul className="px-4 py-3 flex-1 space-y-2">
                {[
                  { icon: <PenLine className="h-4 w-4 text-sky-400" />, title: 'E-Signatures' },
                  { icon: <CreditCard className="h-4 w-4 text-sky-400" />, title: 'Online Rent Collection' },
                  { icon: <Users className="h-4 w-4 text-sky-400" />, title: 'Tenant Portal' },
                  { icon: <Wrench className="h-4 w-4 text-sky-400" />, title: 'Maintenance Tracking' },
                  { icon: <BarChart3 className="h-4 w-4 text-sky-400" />, title: 'Rental Accounting' },
                  { icon: <Bell className="h-4 w-4 text-sky-400" />, title: 'Automated Reminders' },
                  { icon: <Building2 className="h-4 w-4 text-sky-400" />, title: 'Multi-Property Dashboard' },
                  { icon: <Infinity className="h-4 w-4 text-sky-400" />, title: 'Unlimited Leases' },
                ].map(({ icon, title }) => (
                  <li key={title} className="flex items-center gap-2">
                    <div className="flex-shrink-0">{icon}</div>
                    <p className="text-xs font-medium text-gray-700 leading-tight">{title}</p>
                  </li>
                ))}
              </ul>
              <div className="px-4 pb-4 pt-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                  <p className="text-xs font-semibold text-emerald-700">✓ Unlimited leases &amp; e-signatures included</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legal note */}
        <p className="text-center text-[10px] text-gray-400">
          PropertyFlow HQ is software, not a law firm. Consult a licensed attorney before executing any lease.
        </p>

        {/* Signing modal */}
        <PublicLeaseSignModal
          open={signModalOpen}
          onClose={() => { setSignModalOpen(false); setScreen('choice'); }}
          leaseHtml={effectiveSigningHtml}
          landlordName={data.landlordLegalName}
          onSigned={handleSignedByLandlord}
        />
      </div>
    );
  }

  // ── DOWNLOAD SCREEN ───────────────────────────────────────────────────────
  if (screen === 'download') {
    return (
      <div className="w-full space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <CheckCircle className="h-9 w-9 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-0.5">Your {state} lease is ready!</h3>
            <p className="text-emerald-100 text-sm">Save as PDF, print, and sign in person.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <button
              onClick={() => setScreen('choice')}
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={printLease}
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors text-sm"
            >
              <Download className="h-4 w-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lease viewer */}
          <div className="lg:col-span-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">{state} Residential Lease Agreement</span>
                </div>
                <button onClick={printLease} className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700">
                  <Download className="h-3.5 w-3.5" /> Save PDF
                </button>
              </div>
              <div
                className="p-6 sm:p-8 bg-white"
                style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: leaseHtml }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* How-to */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-amber-800 mb-1 text-sm">💡 How to save as PDF</p>
              <p className="text-amber-700 text-xs leading-relaxed">
                Click <strong>Print / Save PDF</strong> → in the print dialog set <em>Destination</em> to <strong>Save as PDF</strong> → click Save.
              </p>
              <button onClick={printLease} className="mt-2 w-full inline-flex items-center justify-center gap-2 border border-amber-300 bg-white text-amber-800 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-amber-50 transition-colors">
                <Download className="h-3.5 w-3.5" /> Open Print Dialog
              </button>
            </div>

            {/* E-sign upsell */}
            <div className="bg-slate-900 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-amber-400" />
                <p className="font-bold text-sm">Skip the printer</p>
              </div>
              <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                {isAuthenticated
                  ? 'Free with your account — sign electronically and your tenant gets a secure link by email.'
                  : 'Free — you get one e-signature on us. Sign electronically and your tenant gets a secure link by email.'}
              </p>
              <button
                type="button"
                onClick={() => { setScreen('esign'); setSignModalOpen(true); }}
                className="w-full text-sm font-bold py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white transition-all"
              >
                {isAuthenticated ? 'Send Free E-Signature →' : 'Send Free E-Signature →'}
              </button>
            </div>

            {/* Trial upsell */}
            {!isAuthenticated && (
              <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-violet-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-violet-200" />
                  <span className="font-bold text-sm">Save & unlock unlimited leases</span>
                </div>
                <p className="text-violet-100 text-xs mb-3 leading-relaxed">
                  Sign up in 30 seconds to save this lease permanently, create your property, and start a free 14-day trial — no card needed.
                </p>
                <a
                  href={signUpUrl('download_screen_trial')}
                  className="flex items-center justify-center gap-2 bg-white text-indigo-700 font-extrabold px-4 py-2.5 rounded-xl hover:bg-violet-50 active:scale-[0.98] transition-all text-sm"
                >
                  Save my lease &amp; set up account
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Lock className="h-2.5 w-2.5 text-violet-200/70" />
                  <p className="text-center text-xs text-violet-200/70">No credit card · 14-day free trial</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <PublicLeaseSignModal
          open={signModalOpen}
          onClose={() => { setSignModalOpen(false); setScreen('download'); }}
          leaseHtml={effectiveSigningHtml}
          landlordName={data.landlordLegalName}
          onSigned={handleSignedByLandlord}
        />
      </div>
    );
  }

  // ── E-SIGN LOADING / ERROR SCREEN ─────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-5 py-10 text-center">
      {esignLoading ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-sky-500 mx-auto" />
          <p className="text-gray-600 font-medium">
            {isAuthenticated ? 'Sending signing invite to your tenant…' : 'Redirecting to secure checkout…'}
          </p>
        </>
      ) : esignError ? (
        <>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{esignError}</div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => startEsignCheckout()}
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Try Again
            </button>
            <button
              onClick={() => { setScreen('choice'); setSigDataUrl(null); setEsignError(''); }}
              className="inline-flex items-center gap-2 border border-gray-300 bg-white text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          </div>
        </>
      ) : (
        <PublicLeaseSignModal
          open={signModalOpen}
          onClose={() => { setSignModalOpen(false); setScreen('choice'); setSigDataUrl(null); }}
          leaseHtml={effectiveSigningHtml}
          landlordName={data.landlordLegalName}
          onSigned={handleSignedByLandlord}
        />
      )}
    </div>
  );
}
