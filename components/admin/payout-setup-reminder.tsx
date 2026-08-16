'use client';

/**
 * PayoutSetupReminder
 *
 * Lightweight client-side modal that nudges landlords to finish Stripe
 * Connect onboarding once they have an active property. Without payouts
 * configured, tenants can't pay rent — this is the most common "why isn't
 * it working" support call we get from new PMs.
 *
 * Behavior:
 *   - Mounted globally in the admin layout. Calls
 *     `/api/landlord/payout-setup-status` once on mount.
 *   - Shows the modal when `shouldRemind === true` AND the user hasn't
 *     dismissed it in the last 7 days (tracked in localStorage so we
 *     don't need a schema migration just for a UI nudge).
 *   - Two CTAs: "Set up payouts" deep-links to /admin/onboarding/payouts;
 *     "Remind me later" snoozes for 7 days; close (X) snoozes for 24 hours.
 *
 * The component renders nothing for non-PM roles or while loading.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Banknote, ShieldAlert, ArrowRight, X } from 'lucide-react';

type StripeStatus =
  | 'not_started'
  | 'pending'
  | 'pending_verification'
  | 'action_required'
  | 'active';

interface StatusResponse {
  shouldRemind: boolean;
  hasProperties: boolean;
  activePropertyCount: number;
  stripeStatus: StripeStatus;
  onboardUrl: string;
}

const STORAGE_KEY = 'payout-setup-reminder.snoozedUntil';
const SNOOZE_LATER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SNOOZE_DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (same as "later" — once is enough)

function isSnoozed(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

function setSnooze(durationMs: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(Date.now() + durationMs));
}

function wasShownThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem('payout-reminder-shown') === '1';
}

function markShownThisSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem('payout-reminder-shown', '1');
}

export function PayoutSetupReminder() {
  const router = useRouter();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Skip the network round-trip entirely if the user just dismissed
    // or if the modal was already shown this browser session.
    if (isSnoozed() || wasShownThisSession()) return;

    // Small delay so we don't fire alongside the dashboard's other API
    // calls and crowd the network panel on first load.
    const timer = setTimeout(() => {
      fetch('/api/landlord/payout-setup-status', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((json: StatusResponse | null) => {
          if (cancelled || !json) return;
          setData(json);
          if (json.shouldRemind) {
            setOpen(true);
            markShownThisSession();
          }
        })
        .catch(() => {
          /* silent — never block the dashboard on this nudge */
        });
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!data || !open) return null;

  const handleSetup = () => {
    setSnooze(SNOOZE_DISMISS_MS); // Don't pop again right away
    setOpen(false);
    router.push(data.onboardUrl);
  };

  const handleRemindLater = () => {
    setSnooze(SNOOZE_LATER_MS);
    setOpen(false);
  };

  const handleDismiss = () => {
    setSnooze(SNOOZE_DISMISS_MS);
    setOpen(false);
  };

  // Tailor the headline copy to where they are in the funnel.
  const headline =
    data.stripeStatus === 'not_started'
      ? 'Finish setting up rent payouts'
      : data.stripeStatus === 'action_required'
        ? 'A few more details needed for payouts'
        : 'Verifying your payout account';

  const body =
    data.stripeStatus === 'not_started'
      ? `You have ${data.activePropertyCount} active ${data.activePropertyCount === 1 ? 'property' : 'properties'}, but tenants can't pay rent yet because your Stripe payout account isn't connected. It takes about 5 minutes.`
      : data.stripeStatus === 'action_required'
        ? "Stripe needs a little more information before they'll release payouts. Tenants can't pay rent until this is finished."
        : "Stripe is still verifying your account. Until verification completes, tenants can't pay rent through the portal. Most accounts clear within a day.";

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(v) : handleDismiss())}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-slate-200 bg-white shadow-2xl"
      // Suppress the default close X — we render our own so it can hook
      // into our snooze logic.
      >
        <DialogTitle className="sr-only">{headline}</DialogTitle>
        {/* Header band with brand gradient */}
        <div className="relative bg-gradient-to-br from-slate-900 to-blue-700 text-white px-6 pt-6 pb-5">
          <button
            type="button"
            aria-label="Close"
            onClick={handleDismiss}
            className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20 flex-shrink-0">
              {data.stripeStatus === 'action_required' ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <Banknote className="h-5 w-5" />
              )}
            </div>
            <div className="space-y-1 pr-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-200">
                Action needed
              </p>
              <h2 className="text-lg font-bold leading-tight">{headline}</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{body}</p>

          <ul className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
              Tenants can pay rent online with card or bank transfer
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
              Funds are deposited directly to your bank account
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
              Late payments and reminders happen automatically
            </li>
          </ul>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemindLater}
              className="sm:flex-1 text-slate-600 hover:text-slate-900"
            >
              Remind me in a week
            </Button>
            <Button
              type="button"
              onClick={handleSetup}
              className="sm:flex-1 bg-gradient-to-r from-slate-900 to-blue-700 text-white hover:from-slate-800 hover:to-blue-600"
            >
              Set up payouts
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
