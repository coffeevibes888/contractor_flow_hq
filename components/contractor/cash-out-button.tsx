'use client';

/**
 * Cash Out button for the contractor dashboard payouts page.
 *
 * Reads live wallet balance from /api/wallet/balance (the contractor
 * Treasury wallet shares the same shape as the landlord one — just owned
 * by ContractorProfile instead of Landlord). Drawing a fresh balance on
 * every open prevents the user from issuing a cashout that's already
 * stale.
 *
 * On submit, calls /api/marketplace/payments/cashout. $1 fee, $5 minimum,
 * 1-3 business day arrival.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface ExternalAccount {
  id: string;
  bankName: string | null;
  last4: string | null;
  isDefault: boolean;
}

export function CashOutButton() {
  const [open, setOpen] = useState(false);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<ExternalAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [amountStr, setAmountStr] = useState('');
  const [externalId, setExternalId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    amount: number;
    arrivesIn: string;
  } | null>(null);

  // Load wallet + linked banks when the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingAccounts(true);
        const [walletRes, banksRes] = await Promise.all([
          fetch('/api/wallet/balance', { cache: 'no-store' }),
          fetch('/api/wallet/external-accounts'),
        ]);
        if (cancelled) return;
        if (walletRes.ok) {
          const w = await walletRes.json();
          setBalanceCents(Math.round(Number(w.available || 0) * 100));
        }
        if (banksRes.ok) {
          const b = await banksRes.json();
          const list = (b.accounts || []) as ExternalAccount[];
          setAccounts(list);
          const def = list.find((a) => a.isDefault) ?? list[0];
          if (def) setExternalId(def.id);
        }
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset when the dialog closes.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setAmountStr('');
      setError(null);
      setSuccess(null);
      setSubmitting(false);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  const amountCents = useMemo(() => {
    const cleaned = amountStr.replace(/[^0-9.]/g, '');
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.round(num * 100);
  }, [amountStr]);
  const amount = amountCents / 100;
  const balance = (balanceCents ?? 0) / 100;
  const overBalance = amountCents > 0 && balanceCents !== null && amountCents > balanceCents;
  const belowMin = amountCents > 0 && amountCents < 500;
  const netAfterFee = Math.max(0, amount - 1);

  const linkBank = async () => {
    try {
      const res = await fetch('/api/wallet/external-accounts', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json?.error || 'Could not start linking.');
      }
      window.location.href = json.url;
    } catch (err: any) {
      toast.error(err?.message || 'Could not start linking.');
    }
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/payments/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          externalAccountId: externalId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'Cashout failed.');
      }
      setSuccess({
        id: json.treasuryTransferId,
        amount: amount,
        arrivesIn: json.estimatedArrival || '1–3 business days',
      });
      toast.success('Cashout initiated');
    } catch (err: any) {
      setError(err?.message || 'Cashout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className='bg-emerald-600 hover:bg-emerald-700 text-white'
      >
        <ArrowUpFromLine className='h-4 w-4 mr-2' />
        Cash Out
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <ArrowUpFromLine className='h-4 w-4 text-emerald-600' />
              Cash Out
            </DialogTitle>
            <DialogDescription>
              Move funds from your wallet to a linked bank account. $1 fee
              per cashout. Funds arrive in 1–3 business days.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className='py-2 space-y-4 text-center'>
              <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
                <CheckCircle2 className='h-6 w-6' />
              </div>
              <div>
                <h4 className='text-base font-semibold text-slate-900'>
                  Cashout initiated
                </h4>
                <p className='mt-1 text-sm text-slate-600'>
                  {usd.format(success.amount - 1)} on its way to your bank.
                </p>
                <p className='text-[11px] text-slate-500 mt-1'>
                  Estimated arrival: {success.arrivesIn}
                </p>
                <p className='mt-2 text-[11px] text-slate-400 font-mono break-all'>
                  {success.id}
                </p>
              </div>
              <DialogFooter className='sm:justify-center'>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className='space-y-4'>
              {balanceCents !== null && (
                <div className='rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600'>
                  Available balance:{' '}
                  <span className='font-semibold text-slate-900'>
                    {usd.format(balance)}
                  </span>
                </div>
              )}

              <div>
                <Label>Destination</Label>
                {loadingAccounts ? (
                  <div className='mt-1 h-10 rounded-md border border-slate-200 bg-slate-50 animate-pulse' />
                ) : accounts.length === 0 ? (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={linkBank}
                    className='mt-1 w-full justify-start'
                  >
                    <Plus className='h-4 w-4 mr-2' />
                    Link a bank account
                    <ExternalLink className='h-3.5 w-3.5 ml-auto opacity-60' />
                  </Button>
                ) : (
                  <div className='mt-1 space-y-2'>
                    <Select value={externalId} onValueChange={setExternalId}>
                      <SelectTrigger>
                        <SelectValue placeholder='Choose a bank' />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.bankName || 'Bank'} •••• {a.last4 || '----'}
                            {a.isDefault && ' (Default)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={linkBank}
                      className='-ml-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
                    >
                      <Plus className='h-3.5 w-3.5 mr-1' />
                      Link another bank
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor='cashout-amount'>Amount</Label>
                <div className='relative mt-1'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                    $
                  </span>
                  <Input
                    id='cashout-amount'
                    inputMode='decimal'
                    autoFocus
                    placeholder='0.00'
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className='pl-7 text-lg font-semibold tabular-nums'
                  />
                </div>
                <div className='mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]'>
                  <span className='text-slate-500'>
                    Minimum: $5.00 · Fee: $1.00
                  </span>
                  {overBalance && (
                    <span className='text-rose-600 font-medium'>
                      Exceeds balance
                    </span>
                  )}
                  {belowMin && !overBalance && (
                    <span className='text-amber-600 font-medium'>
                      Below $5 minimum
                    </span>
                  )}
                </div>
              </div>

              {amountCents >= 500 && !overBalance && (
                <div className='rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-900 space-y-1'>
                  <div className='flex justify-between'>
                    <span>Cashout amount</span>
                    <span className='font-semibold'>{usd.format(amount)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Platform fee</span>
                    <span className='font-semibold'>−{usd.format(1)}</span>
                  </div>
                  <div className='flex justify-between border-t border-emerald-200 pt-1 mt-1'>
                    <span>You receive</span>
                    <span className='font-bold'>{usd.format(netAfterFee)}</span>
                  </div>
                </div>
              )}

              {error && <p className='text-sm text-rose-600'>{error}</p>}

              <DialogFooter className='gap-2 sm:gap-2'>
                <Button
                  variant='outline'
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    amountCents < 500 ||
                    overBalance ||
                    !externalId ||
                    submitting
                  }
                  onClick={submit}
                  className='bg-emerald-600 hover:bg-emerald-700'
                >
                  {submitting ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Sending…
                    </>
                  ) : (
                    `Cash out ${usd.format(amount || 0)}`
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
