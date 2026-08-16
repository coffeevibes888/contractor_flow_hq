'use client';

/**
 * Add Funds modal — show the user's routing + masked account number with
 * copy buttons, and instructions to push money in via ACH/wire from any
 * US bank. There's no card-funding UI by design (per the product spec).
 */

import { Copy, Check, ArrowDownToLine } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { WalletBalanceResponse } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: WalletBalanceResponse;
}

export function WalletAddFundsModal({ open, onOpenChange, balance }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ArrowDownToLine className='h-4 w-4 text-sky-600' />
            Add Funds
          </DialogTitle>
          <DialogDescription>
            Send a bank transfer (ACH or wire) from any US bank to your
            Property Flow Wallet. Funds typically arrive within 1 business
            day.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <CopyRow label='Routing number' value={balance.routingNumber} />
          <CopyRow
            label='Account number'
            value={
              balance.accountNumberLast4
                ? `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${balance.accountNumberLast4}`
                : null
            }
            note='Reveal the full number from the wallet to copy'
          />
          <CopyRow label='Bank name' value='Fifth Third Bank' />
          <CopyRow label='Account type' value='Checking' />
        </div>

        <div className='mt-2 rounded-lg bg-sky-50 border border-sky-100 p-3 text-xs text-sky-900'>
          Tip: ACH transfers settle in 1–3 business days. Wires usually
          arrive same-day if sent before your bank&apos;s cutoff.
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopyRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string | null;
  note?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copyable = value && !value.includes('\u2022');
  const handleCopy = async () => {
    if (!value || !copyable) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };
  return (
    <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-3'>
      <div>
        <div className='text-[11px] font-medium uppercase tracking-wide text-slate-500'>
          {label}
        </div>
        <div className='font-mono text-sm text-slate-900 tabular-nums'>
          {value ?? '—'}
        </div>
        {note && <div className='mt-0.5 text-[11px] text-slate-500'>{note}</div>}
      </div>
      {copyable && (
        <Button
          type='button'
          size='sm'
          variant='ghost'
          onClick={handleCopy}
          className='shrink-0 text-sky-700 hover:text-sky-800 hover:bg-sky-50'
        >
          {copied ? (
            <Check className='h-4 w-4 mr-1' />
          ) : (
            <Copy className='h-4 w-4 mr-1' />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      )}
    </div>
  );
}
