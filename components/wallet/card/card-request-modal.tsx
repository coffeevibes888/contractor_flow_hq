'use client';

/**
 * "Get Your Card" modal. Lets the user pick virtual (instant) or physical
 * (7–10 days) and confirm shipping address before requesting. Calls
 * /api/cards/request and surfaces specific Issuing error codes
 * (`platform_not_enabled`, `wallet_not_ready`, etc.) instead of generic 500s.
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, MapPin, Truck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExistingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAddress?: ExistingAddress | null;
  onIssued?: () => void;
}

type CardType = 'virtual' | 'physical';

export function CardRequestModal({
  open,
  onOpenChange,
  defaultAddress,
  onIssued,
}: Props) {
  const [type, setType] = useState<CardType>('virtual');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState({
    line1: defaultAddress?.line1 || '',
    line2: defaultAddress?.line2 || '',
    city: defaultAddress?.city || '',
    state: defaultAddress?.state || '',
    postal_code: defaultAddress?.postal_code || '',
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAddress({
      line1: defaultAddress?.line1 || '',
      line2: defaultAddress?.line2 || '',
      city: defaultAddress?.city || '',
      state: defaultAddress?.state || '',
      postal_code: defaultAddress?.postal_code || '',
    });
  }, [open, defaultAddress]);

  const physicalAddressOk =
    type === 'virtual' ||
    (address.line1 && address.city && address.state && address.postal_code);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/cards/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          shippingAddress:
            type === 'physical'
              ? { ...address, country: 'US' }
              : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(
          json.error ||
            'Could not issue card. Please try again or contact support.'
        );
        return;
      }
      onIssued?.();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Could not issue card.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <CreditCard className='h-4 w-4 text-sky-600' />
            Get your card
          </DialogTitle>
          <DialogDescription>
            Spend directly from your Property Flow Wallet. Your spending
            limit is your wallet balance — no overdraft, no debt.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <button
            type='button'
            onClick={() => setType('virtual')}
            className={cn(
              'w-full text-left rounded-xl border p-3 flex items-start gap-3 transition-all',
              type === 'virtual'
                ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-300'
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <div className='flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 shrink-0'>
              <Zap className='h-4 w-4' />
            </div>
            <div className='flex-1 min-w-0'>
              <div className='text-sm font-semibold text-slate-900'>
                Virtual card
              </div>
              <div className='text-xs text-slate-600 mt-0.5'>
                Issued instantly. Add to Apple Pay or Google Pay and use
                anywhere online.
              </div>
            </div>
          </button>

          <button
            type='button'
            onClick={() => setType('physical')}
            className={cn(
              'w-full text-left rounded-xl border p-3 flex items-start gap-3 transition-all',
              type === 'physical'
                ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-300'
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <div className='flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 shrink-0'>
              <Truck className='h-4 w-4' />
            </div>
            <div className='flex-1 min-w-0'>
              <div className='text-sm font-semibold text-slate-900'>
                Physical card
              </div>
              <div className='text-xs text-slate-600 mt-0.5'>
                Mailed to you in 7–10 business days.
              </div>
            </div>
          </button>
        </div>

        {type === 'physical' && (
          <div className='space-y-3'>
            <div className='flex items-center gap-2 text-xs font-medium text-slate-700'>
              <MapPin className='h-3.5 w-3.5' /> Confirm shipping address
            </div>
            <div className='grid gap-2'>
              <Input
                placeholder='Street address'
                value={address.line1}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, line1: e.target.value }))
                }
              />
              <Input
                placeholder='Apt, suite, unit (optional)'
                value={address.line2}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, line2: e.target.value }))
                }
              />
              <div className='grid grid-cols-3 gap-2'>
                <Input
                  className='col-span-2'
                  placeholder='City'
                  value={address.city}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, city: e.target.value }))
                  }
                />
                <Input
                  placeholder='State'
                  maxLength={2}
                  value={address.state}
                  onChange={(e) =>
                    setAddress((a) => ({
                      ...a,
                      state: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
              <Input
                placeholder='ZIP'
                value={address.postal_code}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, postal_code: e.target.value }))
                }
              />
            </div>
          </div>
        )}

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
            disabled={submitting || !physicalAddressOk}
            className='bg-sky-600 hover:bg-sky-700'
          >
            {submitting
              ? 'Issuing…'
              : type === 'virtual'
                ? 'Issue virtual card'
                : 'Order physical card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
