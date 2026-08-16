'use client';

/**
 * Spend controls drawer — monthly limit + blocked merchant categories.
 * Setting `monthlyLimit = ''` clears the limit. Categories use Stripe
 * MCC enum values pulled from BLOCKABLE_CATEGORIES.
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
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import type { IssuingCardSummary } from './types';

const BLOCKABLE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'gambling', label: 'Gambling' },
  { value: 'liquor_stores', label: 'Liquor Stores' },
  { value: 'bars', label: 'Bars & Nightclubs' },
  { value: 'tobacco_users_and_dispensaries', label: 'Tobacco / Cannabis' },
  { value: 'wires_money_orders', label: 'Money Orders / Wire Services' },
  {
    value: 'jewelry_stores_watches_clocks_and_silverware_stores',
    label: 'Jewelry',
  },
  { value: 'cigar_stores_and_stands', label: 'Cigar Stores' },
  { value: 'massage_parlors', label: 'Massage Parlors' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: IssuingCardSummary;
  onSaved?: () => void;
}

export function CardControlsModal({
  open,
  onOpenChange,
  card,
  onSaved,
}: Props) {
  const [limitStr, setLimitStr] = useState(
    card.monthlyLimitCents
      ? (card.monthlyLimitCents / 100).toFixed(2)
      : ''
  );
  const [blocked, setBlocked] = useState<string[]>(card.blockedCategories);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLimitStr(
      card.monthlyLimitCents
        ? (card.monthlyLimitCents / 100).toFixed(2)
        : ''
    );
    setBlocked(card.blockedCategories);
  }, [open, card]);

  const toggle = (value: string) =>
    setBlocked((curr) =>
      curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value]
    );

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = limitStr.replace(/[^0-9.]/g, '');
      const num = Number(cleaned);
      const monthlyLimitCents = !cleaned
        ? null
        : Number.isFinite(num) && num > 0
          ? Math.round(num * 100)
          : undefined;

      const res = await fetch(`/api/cards/${card.id}/limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyLimitCents,
          blockedCategories: blocked,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save.');
      toast.success('Card controls updated');
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ShieldAlert className='h-4 w-4 text-sky-600' />
            Card controls
          </DialogTitle>
          <DialogDescription>
            Set a monthly cap and block specific categories. Spend can
            never exceed your wallet balance regardless of the limit.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          <div>
            <Label htmlFor='monthly-limit'>Monthly spend limit</Label>
            <div className='relative mt-1'>
              <Wallet className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
              <Input
                id='monthly-limit'
                inputMode='decimal'
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                placeholder='No limit'
                className='pl-9 tabular-nums'
              />
            </div>
            <p className='text-[11px] text-slate-500 mt-1'>
              Leave blank for no monthly limit.
            </p>
          </div>

          <div>
            <Label className='block mb-2'>Block merchant categories</Label>
            <div className='grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1'>
              {BLOCKABLE_CATEGORIES.map((c) => (
                <label
                  key={c.value}
                  className='flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 cursor-pointer'
                >
                  <Checkbox
                    checked={blocked.includes(c.value)}
                    onCheckedChange={() => toggle(c.value)}
                  />
                  <span className='text-sm text-slate-800'>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className='bg-sky-600 hover:bg-sky-700'
          >
            {saving ? 'Saving…' : 'Save controls'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
