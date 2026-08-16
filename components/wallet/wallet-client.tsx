'use client';

/**
 * Wallet page client. Owns the SWR balance fetch (30s refresh), wires the
 * action buttons to their respective modals, and shows a verification
 * banner when the user is not yet ready to move money.
 */

import useSWR from 'swr';
import type { ReactNode } from 'react';
import { useState } from 'react';
import FeatureTracker from '@/components/analytics/feature-tracker';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletBalanceCard } from './wallet-balance-card';
import { WalletActions } from './wallet-actions';
import { WalletAccountNumbers } from './wallet-account-numbers';
import { WalletTransactions } from './wallet-transactions';
import { WalletAddFundsModal } from './wallet-add-funds-modal';
import { WalletSendModal } from './wallet-send-modal';
import { WalletWithdrawModal } from './wallet-withdraw-modal';
import { CardSection } from './card/card-section';
import type { WalletBalanceResponse } from './types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

const empty: WalletBalanceResponse = {
  onboardingStatus: 'not_started',
  ready: false,
  treasuryEnabled: false,
  available: 0,
  pending: 0,
  outboundPending: 0,
  accountNumberLast4: null,
  routingNumber: null,
  bankName: 'Property Flow Wallet',
  financialAccountId: null,
  fetchedAt: '',
};

interface WalletClientProps {
  cardholderName?: string;
  defaultAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null;
  /**
   * Determines which secondary sections render under the core wallet UI.
   *  - 'landlord'  → rent collection KPIs + recent rent payments
   *  - 'contractor' → earnings KPIs + recent contractor payments
   *
   * The core balance / actions / card / account-numbers blocks are
   * identical for both. The mode also tweaks copy: "Withdraw" becomes
   * "Cash Out" and the Pay Contractor button is hidden for contractors.
   */
  mode?: 'landlord' | 'contractor';
  /** Optional secondary sections rendered below the core wallet UI. */
  extraSections?: ReactNode;
}

export function WalletClient({
  cardholderName = 'Property Flow User',
  defaultAddress = null,
  mode = 'landlord',
  extraSections,
}: WalletClientProps = {}) {
  const { data, isLoading, error, mutate } = useSWR<WalletBalanceResponse>(
    '/api/wallet/balance',
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  const balance = data ?? empty;
  const treasuryEnabled = balance.treasuryEnabled;
  // When Treasury is platform-gated off, "ready" simply means KYC is done
  // — that's enough for tenants to pay rent into the Connect account.
  // When Treasury is on, we additionally require the financial account.
  const ready = treasuryEnabled
    ? balance.ready && balance.onboardingStatus === 'verified'
    : balance.onboardingStatus === 'verified';

  const [addOpen, setAddOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [contractorOpen, setContractorOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const blockedReason =
    balance.onboardingStatus === 'restricted' ||
    balance.onboardingStatus === 'invalid'
      ? 'Stripe needs more information before you can move money.'
      : balance.onboardingStatus === 'in_review'
        ? 'Your account is under review. You can move money once Stripe completes verification.'
        : 'Finish identity verification to enable transfers.';

  return (
    <div className='space-y-5 sm:space-y-6'>
      <FeatureTracker step="wallet_viewed" metadata={{ mode }} />
      <PageHeader treasuryEnabled={treasuryEnabled} />

      {error ? (
        <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800'>
          Could not load your wallet right now. Try refreshing.
        </div>
      ) : null}

      {!ready && data && balance.onboardingStatus !== 'verified' && (
        <VerificationBanner
          status={balance.onboardingStatus}
          treasuryEnabled={treasuryEnabled}
        />
      )}

      {/* Treasury surface — balance, actions, card, account numbers — is
          only meaningful once the platform is approved for Treasury.
          Until then the page is purely a Stripe Connect onboarding +
          rent collection dashboard. */}
      {treasuryEnabled && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <WalletBalanceCard balance={balance} loading={isLoading && !data} />
          </motion.div>

          <WalletActions
            ready={ready}
            blockedReason={blockedReason}
            hidePayContractor={mode === 'contractor'}
            withdrawLabel={mode === 'contractor' ? 'Cash Out' : 'Withdraw'}
            onAdd={() => setAddOpen(true)}
            onSend={() => setSendOpen(true)}
            onPayContractor={() => setContractorOpen(true)}
            onWithdraw={() => setWithdrawOpen(true)}
          />

          {/* Issuing card section — visible only when verified, since the
              card cannot exist before the wallet does. */}
          {ready && (
            <CardSection
              cardholderName={cardholderName}
              defaultAddress={defaultAddress}
            />
          )}

          <div className='grid gap-5 lg:grid-cols-3'>
            <div className='lg:col-span-2'>
              <WalletTransactions />
            </div>
            <div className='space-y-4'>
              <WalletAccountNumbers balance={balance} />
            </div>
          </div>
        </>
      )}

      {/* Secondary sections — landlord rent KPIs / contractor earnings,
          payment history table, etc. */}
      {extraSections}

      {/* Modals — only mounted when Treasury surface is exposed. */}
      {treasuryEnabled && (
        <>
          <WalletAddFundsModal
            open={addOpen}
            onOpenChange={setAddOpen}
            balance={balance}
          />
          <WalletSendModal
            open={sendOpen}
            onOpenChange={setSendOpen}
            balance={balance}
            onSent={() => mutate()}
          />
          <WalletSendModal
            open={contractorOpen}
            onOpenChange={setContractorOpen}
            balance={balance}
            contractorMode
            onSent={() => mutate()}
          />
          <WalletWithdrawModal
            open={withdrawOpen}
            onOpenChange={setWithdrawOpen}
            balance={balance}
            onWithdrawn={() => mutate()}
          />
        </>
      )}
    </div>
  );
}

function PageHeader({ treasuryEnabled }: { treasuryEnabled: boolean }) {
  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-2 text-xs text-slate-500'>
        <span>
          {treasuryEnabled ? 'Property Flow Wallet' : 'Rent Collection'}
        </span>
      </div>
      <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-900'>
        {treasuryEnabled ? 'Wallet' : 'Rent Collection'}
      </h1>
      <p className='text-sm text-slate-600 max-w-prose'>
        {treasuryEnabled
          ? 'Your isolated bank account, powered by Stripe and Fifth Third Bank. Send, receive, and pay contractors directly.'
          : 'Set up a Stripe-powered payment account so tenants can pay rent directly to your bank'}
      </p>
    </div>
  );
}

function VerificationBanner({
  status,
  treasuryEnabled,
}: {
  status: WalletBalanceResponse['onboardingStatus'];
  treasuryEnabled: boolean;
}) {
  const isReview = status === 'in_review';
  const isAttention = status === 'restricted' || status === 'invalid';
  const isStart = status === 'not_started' || status === 'pending';

  const handleStart = async () => {
    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      // toast handled centrally
    }
  };

  // Treasury-on copy emphasises the wallet; Treasury-off copy emphasises
  // rent collection so landlords don't feel they're missing functionality
  // they were never sold on yet.
  const startTitle = treasuryEnabled
    ? 'Verify your identity to activate your wallet'
    : 'Set up payment receiving to accept rent';
  const startBody = treasuryEnabled
    ? 'Quick KYC powered by Stripe — usually under 2 minutes.'
    : 'Quick KYC powered by Stripe — usually under 2 minutes. Tenants can pay rent into your bank account as soon as you finish.';

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center ${
        isAttention
          ? 'border-rose-200 bg-rose-50'
          : isReview
            ? 'border-amber-200 bg-amber-50'
            : 'border-sky-200 bg-sky-50'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isAttention
            ? 'bg-rose-100 text-rose-700'
            : isReview
              ? 'bg-amber-100 text-amber-700'
              : 'bg-sky-100 text-sky-700'
        }`}
      >
        {isAttention ? (
          <AlertTriangle className='h-5 w-5' />
        ) : isReview ? (
          <Loader2 className='h-5 w-5 animate-spin' />
        ) : (
          <ShieldCheck className='h-5 w-5' />
        )}
      </div>
      <div className='flex-1'>
        <div className='text-sm font-semibold text-slate-900'>
          {isAttention
            ? 'Stripe needs more information'
            : isReview
              ? 'Your account is in review'
              : startTitle}
        </div>
        <div className='text-xs text-slate-600 mt-0.5'>
          {isAttention
            ? 'Open Stripe to resolve outstanding requirements.'
            : isReview
              ? 'No action needed — Stripe will notify you when verification finishes.'
              : startBody}
        </div>
      </div>
      {isStart || isAttention ? (
        <Button onClick={handleStart} className='bg-sky-600 hover:bg-sky-700'>
          {isAttention
            ? 'Resolve'
            : treasuryEnabled
              ? 'Start verification'
              : 'Set up payments'}
          <ArrowRight className='h-3.5 w-3.5 ml-1' />
        </Button>
      ) : null}
    </div>
  );
}
