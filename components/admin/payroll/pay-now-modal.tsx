'use client';

/**
 * Pay Now confirmation modal — shown when PM clicks Pay on an approved
 * timesheet row. Pulls a fresh calculation from the calculate endpoint so
 * the breakdown the PM sees matches what will actually run on submit.
 *
 * Pro shows a single "Hours × rate = gross" line.
 * Enterprise shows the OT-aware split: "X hrs reg + Y OT hrs at 1.5x".
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface Calc {
  timesheetId: string;
  teamMember: { id: string; name: string };
  period: { start: string; end: string };
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  platformFee: number;
  netPay: number;
  walletDeduction: number;
  overtimeMultiplier: number;
  walletReady: boolean;
  hasRate: boolean;
  planLevel: 'basic' | 'full';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheetId: string | null;
  onPaid?: () => void;
}

export function PayNowModal({ open, onOpenChange, timesheetId, onPaid }: Props) {
  const [calc, setCalc] = useState<Calc | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    netPay: number;
    transferId: string;
  } | null>(null);

  // Reset on close.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setCalc(null);
      setError(null);
      setSuccess(null);
      setSubmitting(false);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  // Load on open.
  useEffect(() => {
    if (!open || !timesheetId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/payroll/timesheet/${timesheetId}/calculate`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || 'Could not load.');
          return;
        }
        setCalc(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, timesheetId]);

  const submit = async () => {
    if (!timesheetId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll/timesheet/${timesheetId}/pay`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Payroll failed.');
        return;
      }
      setSuccess({
        netPay: json.netPay,
        transferId: json.treasuryTransferId,
      });
      toast.success('Payroll sent');
      onPaid?.();
    } catch (err: any) {
      setError(err?.message || 'Payroll failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Wallet className='h-4 w-4 text-sky-600' />
            Pay timesheet
          </DialogTitle>
          <DialogDescription>
            {success
              ? 'Payment is on its way.'
              : 'Confirm the breakdown below. This deducts from your Wallet immediately.'}
          </DialogDescription>
        </DialogHeader>

        {loading || !calc ? (
          <div className='py-10 text-center text-sm text-slate-500'>
            <Loader2 className='h-5 w-5 mx-auto animate-spin' />
            <div className='mt-2'>Calculating…</div>
          </div>
        ) : success ? (
          <div className='py-2 space-y-4 text-center'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
              <CheckCircle2 className='h-6 w-6' />
            </div>
            <div>
              <h4 className='text-base font-semibold text-slate-900'>
                Payment sent
              </h4>
              <p className='mt-1 text-sm text-slate-600'>
                {usd.format(success.netPay)} on its way to {calc.teamMember.name}.
              </p>
              <p className='mt-2 text-[11px] text-slate-400 font-mono break-all'>
                {success.transferId}
              </p>
            </div>
            <DialogFooter className='sm:justify-center'>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className='space-y-4'>
            {/* Header summary */}
            <div className='rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5'>
              <div className='text-xs text-slate-500'>Recipient</div>
              <div className='text-sm font-semibold text-slate-900'>
                {calc.teamMember.name}
              </div>
              <div className='text-[11px] text-slate-500 mt-0.5'>
                {new Date(calc.period.start).toLocaleDateString()} –{' '}
                {new Date(calc.period.end).toLocaleDateString()}
              </div>
            </div>

            {/* Pre-flight blockers */}
            {!calc.hasRate && (
              <div className='rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-start gap-2'>
                <AlertCircle className='h-4 w-4 shrink-0 mt-0.5' />
                <span>
                  Set an hourly rate for this team member before paying.
                </span>
              </div>
            )}
            {!calc.walletReady && (
              <div className='rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-start gap-2'>
                <AlertCircle className='h-4 w-4 shrink-0 mt-0.5' />
                <span>
                  Team member hasn&apos;t finished payment setup yet.
                </span>
              </div>
            )}

            {/* Breakdown */}
            <div className='rounded-lg border border-slate-200 px-3 py-2.5 text-sm space-y-1.5 tabular-nums'>
              <Row
                label={`${calc.regularHours.toFixed(2)} hrs at ${usd.format(
                  calc.hourlyRate
                )}`}
                value={usd.format(calc.regularPay)}
              />
              {calc.overtimeHours > 0 && (
                <Row
                  label={`${calc.overtimeHours.toFixed(2)} OT hrs at ${calc.overtimeMultiplier}× (${usd.format(
                    calc.hourlyRate * calc.overtimeMultiplier
                  )})`}
                  value={usd.format(calc.overtimePay)}
                  emphasis='overtime'
                />
              )}
              {calc.planLevel === 'basic' &&
                Number(calc.regularHours) > 40 && (
                  <p className='text-[11px] text-amber-700 mt-1'>
                    Heads up: this is over 40 hours. Overtime is calculated
                    automatically on the Enterprise plan.
                  </p>
                )}
              <hr className='my-1.5 border-slate-100' />
              <Row label='Gross' value={usd.format(calc.grossPay)} />
              <Row
                label='Platform fee'
                value={`−${usd.format(calc.platformFee)}`}
              />
              <hr className='my-1.5 border-slate-100' />
              <Row
                label='Team member receives'
                value={usd.format(calc.netPay)}
                emphasis='net'
              />
              <Row
                label='Total deducted from your wallet'
                value={usd.format(calc.walletDeduction)}
                emphasis='deduction'
              />
            </div>

            {error && <p className='text-sm text-rose-600'>{error}</p>}

            <DialogFooter className='gap-2 sm:gap-2'>
              <Button
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={
                  submitting || !calc.hasRate || !calc.walletReady || calc.grossPay <= calc.platformFee
                }
                className='bg-sky-600 hover:bg-sky-700'
              >
                {submitting ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Sending…
                  </>
                ) : (
                  `Pay ${usd.format(calc.netPay)}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: 'overtime' | 'net' | 'deduction';
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        emphasis === 'net'
          ? 'text-emerald-700 font-semibold'
          : emphasis === 'deduction'
            ? 'text-slate-900 font-semibold'
            : emphasis === 'overtime'
              ? 'text-amber-700'
              : 'text-slate-700'
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
