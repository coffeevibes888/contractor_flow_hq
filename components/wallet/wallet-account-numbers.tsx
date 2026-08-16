'use client';

/**
 * Routing + account number card with copy buttons + a 2FA-gated reveal
 * modal. The masked values and routing number are always shown — the full
 * account number requires a TOTP confirmation, hits /api/stripe/treasury/
 * reveal, and auto-clears after 60 seconds (matching the API's expiry).
 */

import { useState } from 'react';
import { Check, Copy, Eye, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { WalletBalanceResponse } from './types';

interface Props {
  balance: WalletBalanceResponse;
}

export function WalletAccountNumbers({ balance }: Props) {
  const [revealOpen, setRevealOpen] = useState(false);
  const [code, setCode] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [revealedAccount, setRevealedAccount] = useState<string | null>(null);
  const [revealedRouting, setRevealedRouting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const masked = balance.accountNumberLast4
    ? `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${balance.accountNumberLast4}`
    : '\u2014';

  const copy = async (label: string, value: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleReveal = async () => {
    setError(null);
    setRevealing(true);
    try {
      const res = await fetch('/api/stripe/treasury/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Could not reveal account number.');
      }
      setRevealedAccount(json.accountNumber);
      setRevealedRouting(json.routingNumber);
      // Auto-hide after 60s for safety.
      window.setTimeout(() => {
        setRevealedAccount(null);
        setRevealedRouting(null);
      }, 60_000);
    } catch (err: any) {
      setError(err?.message || 'Could not reveal.');
    } finally {
      setRevealing(false);
    }
  };

  const closeReveal = () => {
    setRevealOpen(false);
    setCode('');
    setError(null);
  };

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-5 sm:p-6'>
      <div className='flex items-start justify-between gap-3 mb-4'>
        <div>
          <div className='text-xs font-medium text-slate-500 uppercase tracking-wide'>
            Wallet account
          </div>
          <div className='text-sm text-slate-600 mt-0.5'>
            Send a US bank transfer to this account to add funds. Funds
            typically arrive within 1 business day.
          </div>
        </div>
      </div>

      <dl className='space-y-3'>
        <Row
          label='Routing number'
          value={revealedRouting ?? balance.routingNumber}
          masked={false}
          onCopy={() =>
            copy(
              'Routing number',
              revealedRouting ?? balance.routingNumber
            )
          }
        />
        <Row
          label='Account number'
          value={revealedAccount ?? masked}
          masked={!revealedAccount}
          onCopy={() =>
            revealedAccount
              ? copy('Account number', revealedAccount)
              : setRevealOpen(true)
          }
          actionLabel={revealedAccount ? 'Copy' : 'Reveal'}
          actionIcon={revealedAccount ? Copy : Eye}
        />
      </dl>

      {revealedAccount && (
        <p className='mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5'>
          The full number will hide automatically in 60 seconds.
        </p>
      )}

      <Dialog open={revealOpen} onOpenChange={(o) => !o && closeReveal()}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <ShieldAlert className='h-4 w-4 text-sky-600' />
              Reveal full account number
            </DialogTitle>
            <DialogDescription>
              For your security, enter the 6-digit code from your
              authenticator app to view the full account number. Your
              routing number stays the same.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <Label htmlFor='reveal-code' className='text-sm'>
              Two-factor code
            </Label>
            <Input
              id='reveal-code'
              autoFocus
              inputMode='numeric'
              autoComplete='one-time-code'
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder='123 456'
              className='tracking-widest text-center font-mono text-lg'
            />
            {error && <p className='text-sm text-rose-600'>{error}</p>}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={closeReveal} disabled={revealing}>
              Cancel
            </Button>
            <Button
              onClick={handleReveal}
              disabled={!code || revealing}
              className='bg-sky-600 hover:bg-sky-700'
            >
              {revealing ? 'Verifying…' : 'Reveal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  masked,
  onCopy,
  actionLabel = 'Copy',
  actionIcon: ActionIcon = Copy,
}: {
  label: string;
  value: string | null;
  masked: boolean;
  onCopy: () => void;
  actionLabel?: string;
  actionIcon?: typeof Copy;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className='flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 border border-slate-100'>
      <div>
        <dt className='text-[11px] font-medium text-slate-500 uppercase tracking-wide'>
          {label}
        </dt>
        <dd className='font-mono text-sm sm:text-base text-slate-900 tabular-nums'>
          {value ?? '\u2014'}
        </dd>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => {
          onCopy();
          if (!masked) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className='shrink-0 text-sky-700 hover:text-sky-800 hover:bg-sky-50'
      >
        {copied ? (
          <Check className='h-4 w-4 mr-1' />
        ) : (
          <ActionIcon className='h-4 w-4 mr-1' />
        )}
        {copied ? 'Copied' : actionLabel}
      </Button>
    </div>
  );
}
