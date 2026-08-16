'use client';

/**
 * /admin/onboarding/from-lease
 *
 * Smart setup screen shown to landlords who signed up via the free lease
 * builder CTA. The page auto-creates their first property in the background,
 * shows a celebration of everything already done for them, then surfaces a
 * single high-clarity CTA to invite their tenant and start collecting rent.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Building2, Loader2, ArrowRight,
  FileText, Users, Sparkles, Mail, DollarSign, PartyPopper,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaseContext {
  landlordName: string;
  landlordEmail: string;
  propertyAddress: string;
  state: string;
  tenantName: string;
  tenantEmail: string;
  monthlyRent: string;
}

interface Props {
  lcParam: string;
  userName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function decodeLeaseContext(raw: string): LeaseContext | null {
  try {
    return JSON.parse(atob(raw)) as LeaseContext;
  } catch {
    return null;
  }
}

function firstNameFrom(full: string): string {
  return full.split(' ')[0] || full;
}

// ── Component ─────────────────────────────────────────────────────────────────

// 'idle'     — waiting for sessionStorage check to complete (initial state)
// 'creating' — sessionStorage resolved, API call in flight
// 'done'     — property created successfully
// 'error'    — unrecoverable failure
type Phase = 'idle' | 'creating' | 'done' | 'error';

export default function FromLeaseSetupClient({ lcParam, userName }: Props) {
  const router = useRouter();

  // lcParam comes from the URL search param. If it's missing (e.g. the
  // verify-email redirect or SubscriptionGate bounce stripped it), fall back
  // to the sessionStorage stash that public-lease-success.tsx wrote when the
  // user clicked "Start Free Trial".
  const [resolvedLcParam, setResolvedLcParam] = useState(lcParam);

  // `storageChecked` flips to true once we've finished the synchronous read
  // from sessionStorage. This prevents the property-creation effect from
  // firing with ctx=null before the fallback has had a chance to run.
  const [storageChecked, setStorageChecked] = useState(false);

  useEffect(() => {
    if (!resolvedLcParam) {
      try {
        const stored = sessionStorage.getItem('pf_lc');
        if (stored) setResolvedLcParam(stored);
      } catch { /* incognito / SSR — non-fatal */ }
    }
    setStorageChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctx = decodeLeaseContext(resolvedLcParam);

  // Start in 'idle' — the spinner still shows, but we don't attempt property
  // creation until storageChecked=true so we don't race ahead of the
  // sessionStorage fallback above.
  const [phase, setPhase] = useState<Phase>('idle');
  const [propertyId, setPropertyId] = useState<string>('');
  const [propertyName, setPropertyName] = useState<string>('');
  const [unitId, setUnitId] = useState<string>('');
  const [legalDocumentId, setLegalDocumentId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Auto-create the property only after the sessionStorage check has
  // completed. This prevents the premature ctx=null → phase='error' race
  // that was silently killing the flow for every user whose lc param was
  // stripped from the URL (email verification redirect, SubscriptionGate
  // bounce, etc.).
  useEffect(() => {
    if (!storageChecked) return; // still waiting for sessionStorage read

    if (!ctx) {
      setPhase('error');
      setErrorMsg('Could not read lease data. You can still set up your property manually.');
      return;
    }

    setPhase('creating');

    (async () => {
      try {
        // Pick up the full lease HTML that public-lease-success.tsx stashed
        // in sessionStorage. It's too large for the URL but we can POST it
        // directly from here so the API can save it as a LegalDocument.
        // If missing (e.g. incognito, or sessionStorage was cleared during
        // redirect chain), the API still creates the property without the PDF.
        let leaseHtml = '';
        try { leaseHtml = sessionStorage.getItem('pf_lease_html') || ''; } catch { /* noop */ }

        const res = await fetch('/api/onboarding/from-lease', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...ctx, leaseHtml }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setErrorMsg(json.error || 'Could not auto-create property.');
          setPhase('error');
          return;
        }
        setPropertyId(json.propertyId);
        setPropertyName(json.propertyName);
        setUnitId(json.unitId || '');
        setLegalDocumentId(json.legalDocumentId || '');
        setPhase('done');

        // Clear both sessionStorage stashes — no longer needed
        try {
          sessionStorage.removeItem('pf_lc');
          sessionStorage.removeItem('pf_lease_html');
        } catch { /* noop */ }
      } catch {
        setErrorMsg('Network error while setting up your property.');
        setPhase('error');
      }
    })();
    // Re-run when storageChecked flips (the only async dependency here).
    // resolvedLcParam drives ctx which is a derived value — listing it
    // directly would cause double-runs; storageChecked is the right gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageChecked]);

  const landlordFirst = firstNameFrom(ctx?.landlordName || userName || 'there');
  const tenantFirst   = ctx?.tenantName ? firstNameFrom(ctx.tenantName) : null;
  const address       = ctx?.propertyAddress || 'your property';

  // ── Loading spinner (idle = waiting for sessionStorage, creating = API in flight) ──
  if (phase === 'idle' || phase === 'creating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-900/20 to-slate-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin mx-auto" />
          <p className="text-white font-semibold text-lg">Setting up your account…</p>
          <p className="text-slate-400 text-sm">Creating your property from the lease you just built.</p>
        </div>
      </div>
    );
  }

  // ── Error fallback ────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-900/20 to-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center space-y-5">
          <p className="text-white font-semibold text-lg">One small snag</p>
          <p className="text-slate-400 text-sm">{errorMsg}</p>
          <button
            type="button"
            onClick={() => router.push('/admin/overview')}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // ── Done — celebration + single focused CTA ──────────────────────────────
  const inviteUrl = (() => {
    const params = new URLSearchParams();
    if (propertyId)       params.set('propertyId', propertyId);
    if (unitId)           params.set('unitId', unitId);
    if (ctx?.tenantName)  params.set('tenantName', ctx.tenantName);
    if (ctx?.tenantEmail) params.set('tenantEmail', ctx.tenantEmail);
    if (legalDocumentId)  params.set('legalDocumentId', legalDocumentId);
    return `/admin/tenants/add?${params.toString()}`;
  })();

  const rentDisplay = ctx?.monthlyRent
    ? `$${Number(ctx.monthlyRent).toLocaleString()}/mo`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-5">

        {/* ── Confetti header ── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 mx-auto mb-1">
            <PartyPopper className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
            You&apos;re set up, {landlordFirst}!
          </h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            Here&apos;s everything we already handled for you — one step left and you&apos;re collecting rent.
          </p>
        </div>

        {/* ── 3 auto-done items ── */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 backdrop-blur divide-y divide-slate-700/50 overflow-hidden">

          {/* Item 1 — Lease saved */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Lease saved to your account</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {ctx?.state ? `${ctx.state} residential lease` : 'State-specific residential lease'} · ready to send for e-signature
              </p>
            </div>
            <div className="h-6 w-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>

          {/* Item 2 — Property created */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4.5 w-4.5 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Property created in your dashboard</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{address}</p>
            </div>
            <div className="h-6 w-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>

          {/* Item 3 — 14-day trial started */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">14-day free trial activated</p>
              <p className="text-xs text-slate-400 mt-0.5">No credit card needed · cancel anytime</p>
            </div>
            <div className="h-6 w-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* ── Primary CTA — invite tenant & collect rent ── */}
        <div className="rounded-2xl bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 p-px shadow-2xl shadow-indigo-500/20">
          <div className="rounded-[calc(1rem-1px)] bg-gradient-to-br from-sky-600/95 via-indigo-600/95 to-violet-700/95 p-6 space-y-4">

            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                {tenantFirst
                  ? <Mail className="h-5 w-5 text-white" />
                  : <DollarSign className="h-5 w-5 text-white" />
                }
              </div>
              <div>
                <p className="text-white font-bold text-base leading-snug">
                  {tenantFirst
                    ? `Send the lease to ${tenantFirst} for e-signature`
                    : 'Invite your tenant to start paying rent'}
                </p>
                <p className="text-sky-200 text-sm mt-1 leading-relaxed">
                  {tenantFirst
                    ? `${tenantFirst} will get a secure link by email to countersign${rentDisplay ? ` and set up their ${rentDisplay} rent payments` : ''}. Takes about 30 seconds.`
                    : 'Add your tenant and send the lease for e-signature — they pay online, you get notified automatically.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(inviteUrl)}
              className="w-full flex items-center justify-center gap-2.5 bg-white text-indigo-700 font-extrabold py-3.5 rounded-xl text-sm hover:bg-sky-50 active:scale-[0.98] transition-all shadow-lg shadow-black/20"
            >
              <Users className="h-4 w-4" />
              {tenantFirst ? `Invite ${tenantFirst} & send lease →` : 'Add tenant & send lease →'}
            </button>

            <p className="text-center text-sky-300/80 text-[11px]">
              Pre-filled with your lease details — takes 30 seconds
            </p>
          </div>
        </div>

        {/* ── Secondary skip link ── */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => router.push('/admin/overview')}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors inline-flex items-center gap-1.5 group"
          >
            Explore the dashboard first
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
}
