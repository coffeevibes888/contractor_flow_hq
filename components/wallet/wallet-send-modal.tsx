'use client';

/**
 * Send-Money flow with three steps:
 *   1. Pick a recipient — search verified Property Flow users by name/email.
 *   2. Enter amount + optional memo, see the live confirmation summary.
 *   3. Submit, see the success screen with the transaction id.
 *
 * The "Pay Contractor" entrypoint reuses this with a default filter so the
 * recipient list shows contractors first.
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Search, ShieldCheck, Send, HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WalletBalanceResponse, WalletRecipientResult } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: WalletBalanceResponse;
  /** When true, header copy + icon emphasizes contractor payments. */
  contractorMode?: boolean;
  /** Called after a successful send so the parent can `mutate()`. */
  onSent?: () => void;
}

type Step = 'recipient' | 'amount' | 'success';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function WalletSendModal({
  open,
  onOpenChange,
  balance,
  contractorMode = false,
  onSent,
}: Props) {
  const [step, setStep] = useState<Step>('recipient');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WalletRecipientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recipient, setRecipient] = useState<WalletRecipientResult | null>(
    null
  );
  const [amountStr, setAmountStr] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Reset whenever the modal closes.
  useEffect(() => {
    if (!open) {
      // delay so the close animation isn't jarring
      const t = setTimeout(() => {
        setStep('recipient');
        setQuery('');
        setResults([]);
        setRecipient(null);
        setAmountStr('');
        setMemo('');
        setError(null);
        setSuccessId(null);
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open || step !== 'recipient' || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/wallet/recipients/search?q=${encodeURIComponent(query.trim())}`
        );
        const json = await res.json();
        let recipients: WalletRecipientResult[] = json.recipients ?? [];
        if (contractorMode) {
          recipients = [
            ...recipients.filter((r) => r.kind === 'contractor'),
            ...recipients.filter((r) => r.kind !== 'contractor'),
          ];
        }
        setResults(recipients);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [open, step, query, contractorMode]);

  const amountCents = useMemo(() => {
    const cleaned = amountStr.replace(/[^0-9.]/g, '');
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.round(num * 100);
  }, [amountStr]);
  const amount = amountCents / 100;
  const overBalance = amount > balance.available;

  const handleSubmit = async () => {
    if (!recipient) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/wallet/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId: recipient.userId,
          amountCents,
          memo,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Could not send funds.');
      }
      setSuccessId(json.transactionId);
      setStep('success');
      toast.success('Payment sent');
      onSent?.();
    } catch (err: any) {
      setError(err?.message || 'Could not send funds.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {contractorMode ? (
              <HardHat className='h-4 w-4 text-sky-600' />
            ) : (
              <Send className='h-4 w-4 text-sky-600' />
            )}
            {contractorMode ? 'Pay Contractor' : 'Send Money'}
          </DialogTitle>
          <DialogDescription>
            {step === 'success'
              ? 'Sent.'
              : 'Send instantly to any verified Property Flow user. No fees between users.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'recipient' && (
          <div className='space-y-3'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
              <Input
                autoFocus
                placeholder='Search name or email'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className='pl-9'
              />
            </div>
            <div className='min-h-[140px] max-h-[260px] overflow-y-auto rounded-lg border border-slate-100'>
              {searching ? (
                <div className='flex items-center justify-center py-8 text-sm text-slate-500'>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' /> Searching…
                </div>
              ) : results.length === 0 ? (
                <div className='py-8 text-center text-xs text-slate-500 px-4'>
                  {query.length < 2
                    ? 'Type at least 2 characters to find a recipient.'
                    : 'No verified users matched.'}
                </div>
              ) : (
                <ul className='divide-y divide-slate-100'>
                  {results.map((r) => (
                    <li key={r.userId}>
                      <button
                        type='button'
                        onClick={() => {
                          setRecipient(r);
                          setStep('amount');
                        }}
                        className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50'
                      >
                        <Avatar className='h-9 w-9'>
                          {r.avatar && <AvatarImage src={r.avatar} alt='' />}
                          <AvatarFallback className='bg-sky-100 text-sky-700 text-sm font-semibold'>
                            {(r.name || r.email || '?').slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <div className='text-sm font-medium text-slate-900 truncate flex items-center gap-1.5'>
                            {r.name || 'Unnamed'}
                            <Badge
                              variant='secondary'
                              className='bg-emerald-50 text-emerald-700 border-emerald-200 border text-[10px] hover:bg-emerald-50'
                            >
                              <ShieldCheck className='h-2.5 w-2.5 mr-0.5' />
                              Verified
                            </Badge>
                          </div>
                          <div className='text-[11px] text-slate-500 truncate'>
                            {r.email}
                          </div>
                        </div>
                        <Badge
                          variant='outline'
                          className={cn(
                            'shrink-0 text-[10px]',
                            r.kind === 'contractor'
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'border-sky-300 text-sky-700 bg-sky-50'
                          )}
                        >
                          {r.kind === 'contractor' ? 'Contractor' : 'Landlord'}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === 'amount' && recipient && (
          <div className='space-y-4'>
            <div className='flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 border border-slate-100'>
              <Avatar className='h-9 w-9'>
                {recipient.avatar && <AvatarImage src={recipient.avatar} alt='' />}
                <AvatarFallback className='bg-sky-100 text-sky-700 text-sm font-semibold'>
                  {(recipient.name || '?').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1 min-w-0'>
                <div className='text-sm font-medium text-slate-900 truncate'>
                  {recipient.name}
                </div>
                <div className='text-[11px] text-slate-500 truncate'>
                  {recipient.email}
                </div>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setRecipient(null);
                  setStep('recipient');
                }}
              >
                Change
              </Button>
            </div>

            <div>
              <Label htmlFor='send-amount'>Amount</Label>
              <div className='relative mt-1'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                  $
                </span>
                <Input
                  id='send-amount'
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

            <div>
              <Label htmlFor='send-memo'>Memo (optional)</Label>
              <Textarea
                id='send-memo'
                rows={2}
                maxLength={200}
                placeholder='What is this for?'
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className='mt-1 resize-none'
              />
            </div>

            <div className='rounded-lg bg-sky-50 border border-sky-100 p-3 text-xs text-sky-900 space-y-1'>
              <div className='flex justify-between'>
                <span>Fee</span>
                <span className='font-semibold'>$0.00</span>
              </div>
              <div className='flex justify-between'>
                <span>Total</span>
                <span className='font-semibold'>{usd.format(amount || 0)}</span>
              </div>
            </div>

            {error && (
              <p className='text-sm text-rose-600 -mt-1'>{error}</p>
            )}

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
                  amountCents <= 0 || overBalance || submitting
                }
                onClick={handleSubmit}
                className='bg-sky-600 hover:bg-sky-700'
              >
                {submitting ? 'Sending…' : `Send ${usd.format(amount || 0)}`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'success' && (
          <div className='py-2 space-y-4 text-center'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
              <CheckCircle2 className='h-6 w-6' />
            </div>
            <div>
              <h4 className='text-base font-semibold text-slate-900'>
                Payment sent
              </h4>
              <p className='mt-1 text-sm text-slate-600'>
                {usd.format(amount || 0)} sent to {recipient?.name}.
              </p>
              {successId && (
                <p className='mt-2 text-[11px] text-slate-400 font-mono break-all'>
                  Transaction id: {successId}
                </p>
              )}
            </div>
            <DialogFooter className='sm:justify-center'>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
