'use client';

/**
 * Withdraw modal — pick a linked external bank, enter amount, submit.
 * Bank linking happens through Stripe-hosted Account Links; we never
 * collect routing/account fields ourselves.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  Plus,
} from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import type {
  WalletBalanceResponse,
  WalletExternalAccount,
} from './types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: WalletBalanceResponse;
  onWithdrawn?: () => void;
}

export function WalletWithdrawModal({
  open,
  onOpenChange,
  balance,
  onWithdrawn,
}: Props) {
  const { data, isLoading, mutate } = useSWR<{
    accounts: WalletExternalAccount[];
  }>(open ? '/api/wallet/external-accounts' : null, fetcher);

  const [amountStr, setAmountStr] = useState('');
  const [externalId, setExternalId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    amount: number;
    bankLast4: string | null;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setAmountStr('');
        setExternalId('');
        setError(null);
        setSuccess(null);
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Default to the first available bank.
  useEffect(() => {
    if (data?.accounts?.length && !externalId) {
      const def =
        data.accounts.find((a) => a.isDefault) ?? data.accounts[0];
      setExternalId(def.id);
    }
  }, [data, externalId]);

  const amountCents = useMemo(() => {
    const cleaned = amountStr.replace(/[^0-9.]/g, '');
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.round(num * 100);
  }, [amountStr]);
  const amount = amountCents / 100;
  const overBalance = amount > balance.available;

  const handleLinkBank = async () => {
    try {
      const res = await fetch('/api/wallet/external-accounts', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Could not start linking.');
      }
      window.location.href = json.url;
    } catch (err: any) {
      toast.error(err?.message || 'Could not start linking.');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, externalAccountId: externalId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not withdraw.');
      }
      setSuccess({
        id: json.transactionId,
        amount,
        bankLast4: json.bankLast4 ?? null,
      });
      toast.success('Withdrawal initiated');
      onWithdrawn?.();
    } catch (err: any) {
      setError(err?.message || 'Could not withdraw.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ArrowUpFromLine className='h-4 w-4 text-sky-600' />
            Withdraw
          </DialogTitle>
          <DialogDescription>
            Move funds from your wallet to a linked bank account. Funds
            arrive in 1–3 business days.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className='py-2 space-y-4 text-center'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
              <CheckCircle2 className='h-6 w-6' />
            </div>
            <div>
              <h4 className='text-base font-semibold text-slate-900'>
                Withdrawal initiated
              </h4>
              <p className='mt-1 text-sm text-slate-600'>
                {usd.format(success.amount)} on its way to
                {success.bankLast4 ? ` ****${success.bankLast4}` : ' your bank'}.
              </p>
              <p className='mt-2 text-[11px] text-slate-400 font-mono break-all'>
                {success.id}
              </p>
            </div>
            <DialogFooter className='sm:justify-center'>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className='space-y-4'>
            <div>
              <Label>Destination</Label>
              {isLoading ? (
                <div className='mt-1 h-10 rounded-md border border-slate-200 bg-slate-50 animate-pulse' />
              ) : !data?.accounts?.length ? (
                <Button
                  type='button'
                  variant='outline'
                  className='mt-1 w-full justify-start'
                  onClick={handleLinkBank}
                >
                  <Plus className='h-4 w-4 mr-2' />
                  Link a bank account
                  <ExternalLink className='h-3.5 w-3.5 ml-auto opacity-60' />
                </Button>
              ) : (
                <div className='mt-1 space-y-2'>
                  <Select
                    value={externalId}
                    onValueChange={setExternalId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Choose a bank' />
                    </SelectTrigger>
                    <SelectContent>
                      {data.accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {(a.bankName || 'Bank')} •••• {a.last4 || '----'}
                          {a.isDefault && ' (Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleLinkBank}
                    className='text-sky-700 hover:text-sky-800 hover:bg-sky-50 -ml-2'
                  >
                    <Plus className='h-3.5 w-3.5 mr-1' />
                    Link another bank
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor='withdraw-amount'>Amount</Label>
              <div className='relative mt-1'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                  $
                </span>
                <Input
                  id='withdraw-amount'
                  inputMode='decimal'
                  autoFocus
                  placeholder='0.00'
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className='pl-7 text-lg font-semibold tabular-nums'
                />
              </div>
              <div className='mt-1.5 flex items-center justify-between text-[11px]'>
                <span className='text-slate-500'>
                  Available: {usd.format(balance.available)}
                </span>
                {overBalance && (
                  <span className='text-rose-600 font-medium'>
                    Exceeds available balance
                  </span>
                )}
              </div>
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
                disabled={
                  amountCents <= 0 ||
                  overBalance ||
                  !externalId ||
                  submitting
                }
                onClick={handleSubmit}
                className='bg-sky-600 hover:bg-sky-700'
              >
                {submitting ? 'Sending…' : `Withdraw ${usd.format(amount || 0)}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
