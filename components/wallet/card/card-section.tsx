'use client';

/**
 * The "Get Your Card" / card display block that lives inside the
 * wallet page. Renders one of three states:
 *   - Locked (user not verified) — shows nothing (parent gates this)
 *   - Empty (verified, no card) — "Get Your Card" CTA
 *   - Issued (one or more cards) — card face + controls + activity tabs
 */

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Eye,
  Lock,
  Unlock,
  Settings2,
  CopyCheck,
  Smartphone,
  Inbox,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { CardFace } from './card-face';
import { CardRequestModal } from './card-request-modal';
import { CardRevealModal } from './card-reveal-modal';
import { CardControlsModal } from './card-controls-modal';
import { CardActivity } from './card-activity';
import type { IssuingCardSummary } from './types';
import { toast } from 'sonner';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed');
  return res.json();
};

interface Props {
  cardholderName: string;
  defaultAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null;
}

export function CardSection({ cardholderName, defaultAddress }: Props) {
  const { data, isLoading, mutate } = useSWR<{ cards: IssuingCardSummary[] }>(
    '/api/cards',
    fetcher,
    { refreshInterval: 60_000 }
  );
  const cards = data?.cards ?? [];

  const [requestOpen, setRequestOpen] = useState(false);
  const [revealCardId, setRevealCardId] = useState<string | null>(null);
  const [controlsCard, setControlsCard] = useState<IssuingCardSummary | null>(
    null
  );
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [freezing, setFreezing] = useState<string | null>(null);

  const activeCard =
    cards.find((c) => c.id === activeCardId) ?? cards[0] ?? null;

  const toggleFreeze = async (card: IssuingCardSummary) => {
    setFreezing(card.id);
    try {
      const res = await fetch(`/api/cards/${card.id}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frozen: !card.frozen }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Failed');
      toast.success(card.frozen ? 'Card unfrozen' : 'Card frozen');
      mutate();
    } catch (err: any) {
      toast.error(err?.message || 'Could not update card.');
    } finally {
      setFreezing(null);
    }
  };

  if (isLoading) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 animate-pulse'>
        <div className='h-5 w-1/3 bg-slate-100 rounded' />
        <div className='mt-4 h-48 w-full bg-slate-100 rounded-2xl' />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 sm:p-6'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h3 className='text-sm font-semibold text-slate-900 flex items-center gap-2'>
                <CreditCard className='h-4 w-4 text-sky-600' />
                Get your card
              </h3>
              <p className='mt-1 text-xs text-slate-600 max-w-md'>
                Spend directly from your Property Flow Wallet at any
                Visa-accepted merchant. Virtual card issues instantly,
                physical card arrives in 7–10 business days.
              </p>
            </div>
            <Button
              onClick={() => setRequestOpen(true)}
              className='bg-sky-600 hover:bg-sky-700'
            >
              <CreditCard className='h-4 w-4 mr-2' />
              Get card
            </Button>
          </div>
          <div className='mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600'>
            <div className='rounded-lg bg-slate-50 border border-slate-100 px-3 py-2'>
              <div className='font-semibold text-slate-800'>No overdraft</div>
              Spend cap = wallet balance.
            </div>
            <div className='rounded-lg bg-slate-50 border border-slate-100 px-3 py-2'>
              <div className='font-semibold text-slate-800'>Freeze instantly</div>
              Toggle on/off any time.
            </div>
            <div className='rounded-lg bg-slate-50 border border-slate-100 px-3 py-2'>
              <div className='font-semibold text-slate-800'>Spend controls</div>
              Limits & blocked categories.
            </div>
          </div>
        </div>

        <CardRequestModal
          open={requestOpen}
          onOpenChange={setRequestOpen}
          defaultAddress={defaultAddress}
          onIssued={() => mutate()}
        />
      </>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Card chooser if more than one */}
      {cards.length > 1 && (
        <div className='flex flex-wrap gap-2'>
          {cards.map((c) => (
            <button
              key={c.id}
              type='button'
              onClick={() => setActiveCardId(c.id)}
              className={`text-xs rounded-full border px-3 py-1 ${
                (activeCard?.id ?? cards[0].id) === c.id
                  ? 'bg-sky-100 text-sky-800 border-sky-200'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.type === 'physical' ? '\u2295' : '\u26A1'}  •••• {c.last4 || '—'}
            </button>
          ))}
        </div>
      )}

      {activeCard && (
        <motion.div
          key={activeCard.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className='grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]'
        >
          <div className='space-y-3'>
            <CardFace card={activeCard} cardholderName={cardholderName} />

            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setRevealCardId(activeCard.id)}
                className='flex-1 sm:flex-none'
              >
                <Eye className='h-4 w-4 mr-1.5' /> View details
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => toggleFreeze(activeCard)}
                disabled={freezing === activeCard.id}
                className='flex-1 sm:flex-none'
              >
                {freezing === activeCard.id ? (
                  <Loader2 className='h-4 w-4 mr-1.5 animate-spin' />
                ) : activeCard.frozen ? (
                  <Unlock className='h-4 w-4 mr-1.5' />
                ) : (
                  <Lock className='h-4 w-4 mr-1.5' />
                )}
                {activeCard.frozen ? 'Unfreeze' : 'Freeze'}
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setControlsCard(activeCard)}
                className='flex-1 sm:flex-none'
              >
                <Settings2 className='h-4 w-4 mr-1.5' /> Controls
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  toast.message(
                    'Open the Wallet app on your iPhone to add this card via Stripe push provisioning.',
                    {
                      description:
                        'Add to Apple Pay / Google Pay is available in the Property Flow mobile app (coming soon).',
                    }
                  )
                }
                className='flex-1 sm:flex-none'
              >
                <Smartphone className='h-4 w-4 mr-1.5' /> Add to wallet
              </Button>
            </div>

            <div className='text-[11px] text-slate-500 space-y-0.5'>
              <div>
                Issued{' '}
                {new Date(activeCard.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {activeCard.type === 'physical' &&
                  activeCard.shippingStatus &&
                  ' · Shipping: ' + activeCard.shippingStatus}
                {activeCard.shippingTrackingNumber &&
                  ' · Tracking: ' + activeCard.shippingTrackingNumber}
              </div>
              {activeCard.monthlyLimitCents !== null && (
                <div>
                  Monthly limit: $
                  {(activeCard.monthlyLimitCents / 100).toLocaleString()}
                </div>
              )}
              {activeCard.blockedCategories.length > 0 && (
                <div>
                  Blocked: {activeCard.blockedCategories.length}{' '}
                  categor{activeCard.blockedCategories.length === 1 ? 'y' : 'ies'}
                </div>
              )}
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white'>
            <Tabs defaultValue='activity' className='w-full'>
              <div className='border-b border-slate-100 px-4 sm:px-5 pt-4'>
                <TabsList className='bg-slate-100'>
                  <TabsTrigger value='activity'>Card Activity</TabsTrigger>
                  <TabsTrigger value='details'>Card Details</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value='activity' className='p-0 mt-0'>
                <CardActivity cardId={activeCard.id} />
              </TabsContent>
              <TabsContent value='details' className='p-5 mt-0'>
                <CardDetails card={activeCard} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}

      {/* Add another card */}
      <button
        type='button'
        onClick={() => setRequestOpen(true)}
        className='w-full sm:w-auto inline-flex items-center gap-2 rounded-full text-xs font-medium px-3 py-1.5 border border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
      >
        <CreditCard className='h-3.5 w-3.5' />
        Order another card
      </button>

      <CardRequestModal
        open={requestOpen}
        onOpenChange={setRequestOpen}
        defaultAddress={defaultAddress}
        onIssued={() => mutate()}
      />
      {revealCardId && (
        <CardRevealModal
          open={!!revealCardId}
          onOpenChange={(o) => !o && setRevealCardId(null)}
          cardId={revealCardId}
        />
      )}
      {controlsCard && (
        <CardControlsModal
          open={!!controlsCard}
          onOpenChange={(o) => !o && setControlsCard(null)}
          card={controlsCard}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}

function CardDetails({ card }: { card: IssuingCardSummary }) {
  return (
    <dl className='space-y-3 text-sm'>
      <div className='flex justify-between'>
        <dt className='text-slate-500'>Type</dt>
        <dd className='font-medium text-slate-900 capitalize'>{card.type}</dd>
      </div>
      <div className='flex justify-between'>
        <dt className='text-slate-500'>Status</dt>
        <dd>
          <Badge
            variant='secondary'
            className={
              card.frozen
                ? 'bg-slate-200 text-slate-700'
                : card.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
            }
          >
            {card.frozen ? 'Frozen' : card.status}
          </Badge>
        </dd>
      </div>
      <div className='flex justify-between'>
        <dt className='text-slate-500'>Last 4</dt>
        <dd className='font-mono text-slate-900'>{card.last4 || '—'}</dd>
      </div>
      <div className='flex justify-between'>
        <dt className='text-slate-500'>Expires</dt>
        <dd className='font-mono text-slate-900'>
          {card.expMonth && card.expYear
            ? `${String(card.expMonth).padStart(2, '0')}/${card.expYear}`
            : '—'}
        </dd>
      </div>
      <div className='flex justify-between'>
        <dt className='text-slate-500'>Brand</dt>
        <dd className='font-medium text-slate-900 uppercase'>
          {card.brand || 'visa'}
        </dd>
      </div>
      <div className='flex justify-between'>
        <dt className='text-slate-500'>Spending</dt>
        <dd className='font-medium text-slate-900'>
          Up to wallet balance
        </dd>
      </div>
    </dl>
  );
}
