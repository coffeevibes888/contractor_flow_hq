'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import PayoutsConnectEmbedded from '@/components/admin/payouts-connect-button';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type StripeStatusResponse =
  | {
      success: true;
      connected: boolean;
      payoutsEnabled: boolean;
      hasBankAccount: boolean;
      hasCard: boolean;
      requirements: any | null;
    }
  | {
      success: false;
      message: string;
    };

function getStatusMessage(status: Extract<StripeStatusResponse, { success: true }>) {
  if (!status.connected) return 'Connect your payout account to get started';
  if (!status.payoutsEnabled) return 'Complete verification to enable payouts';
  if (!status.hasBankAccount && !status.hasCard) return 'Add a bank account or debit card';
  return 'Your payout account is ready';
}

function getActionLabel(status: Extract<StripeStatusResponse, { success: true }>) {
  if (!status.connected) return 'Start verification';
  if (!status.payoutsEnabled) return 'Continue verification';
  if (!status.hasBankAccount && !status.hasCard) return 'Add payout method';
  return 'Manage payout settings';
}

function getPendingItems(status: Extract<StripeStatusResponse, { success: true }>) {
  const items: string[] = [];
  if (status.requirements?.currently_due?.length) {
    const due = status.requirements.currently_due as string[];
    if (due.some((r: string) => r.includes('business_type'))) items.push('Business type');
    if (due.some((r: string) => r.includes('external_account'))) items.push('Bank account');
    if (due.some((r: string) => r.includes('tos_acceptance'))) items.push('Terms acceptance');
    if (due.some((r: string) => r.includes('individual') || r.includes('representative'))) items.push('Identity verification');
    if (due.some((r: string) => r.includes('address'))) items.push('Address');
    // Add generic items if we haven't captured specific ones
    if (items.length === 0 && due.length > 0) {
      items.push('Additional information required');
    }
  }
  return items;
}

export default function PayoutsVerificationPanel() {
  const router = useRouter();

  const [status, setStatus] = useState<StripeStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const isReady = useMemo(() => {
    if (!status || !status.success) return false;
    return status.payoutsEnabled && (status.hasBankAccount || status.hasCard);
  }, [status]);

  const connectComponent = useMemo(() => {
    if (!status || !status.success) return 'account_onboarding' as const;
    return status.payoutsEnabled ? ('payouts' as const) : ('account_onboarding' as const);
  }, [status]);

  useEffect(() => {
    let mounted = true;
    let interval: any;

    const fetchStatus = async () => {
      try {
        setChecking(true);
        setStatusError(null);
        const res = await fetch('/api/landlord/stripe/status', { cache: 'no-store' });
        const data = (await res.json()) as StripeStatusResponse;

        if (!mounted) return;

        if (!res.ok || !data || data.success === false) {
          setStatus(null);
          setStatusError(
            (data as any)?.message || 'Unable to check verification status. Please refresh and try again.'
          );
          return;
        }

        setStatus(data);
      } catch {
        if (!mounted) return;
        setStatusError('Unable to check verification status. Please refresh and try again.');
      } finally {
        if (mounted) setChecking(false);
      }
    };

    void fetchStatus();
    // Poll every 15 seconds instead of 3 to reduce CPU usage
    interval = setInterval(fetchStatus, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const pendingItems = status?.success ? getPendingItems(status) : [];

  return (
    <div className='space-y-4'>
      {/* Status Card */}
      <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            {checking ? (
              <Loader2 className='h-4 w-4 animate-spin text-slate-400' />
            ) : isReady ? (
              <CheckCircle2 className='h-4 w-4 text-blue-500' />
            ) : (
              <AlertCircle className='h-4 w-4 text-amber-500' />
            )}
            <p className='font-semibold text-slate-900 text-sm'>Verification status</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            checking 
              ? 'bg-slate-200 text-slate-600' 
              : isReady 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-amber-100 text-amber-700'
          }`}>
            {checking ? 'Checking...' : isReady ? 'Verified' : 'Pending'}
          </span>
        </div>

        {statusError ? (
          <p className='text-sm text-red-600'>{statusError}</p>
        ) : status?.success ? (
          <div className='space-y-2'>
            <p className='text-sm text-slate-600'>{getStatusMessage(status)}</p>
            
            {pendingItems.length > 0 && !isReady && (
              <div className='flex flex-wrap gap-1.5'>
                {pendingItems.map((item, i) => (
                  <span key={i} className='text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded'>
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className='text-sm text-slate-600'>Loading verification status...</p>
        )}

        {isReady && (
          <div className='rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800'>
            ✓ Your account is verified and ready to receive payouts.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className='flex items-center justify-between gap-3 flex-wrap'>
        <Button variant='outline' onClick={() => router.push('/admin/payouts')}>
          Back to payouts
        </Button>
        <div className='flex items-center gap-2'>
          <Button variant='ghost' size='sm' onClick={() => router.refresh()}>
            Refresh
          </Button>
          {status?.success && (
            <Button 
              onClick={() => setModalOpen(true)}
              className='bg-blue-600 hover:bg-blue-500 text-white'
            >
              {getActionLabel(status)}
            </Button>
          )}
        </div>
      </div>

      {/* Verification Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className='max-w-xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {isReady ? 'Payout settings' : 'Complete verification'}
            </DialogTitle>
            <DialogDescription>
              {isReady 
                ? 'Manage your bank account and payout preferences.'
                : 'Securely verify your identity and add your payout details.'}
            </DialogDescription>
          </DialogHeader>
          <div className='mt-2'>
            <PayoutsConnectEmbedded 
              component={connectComponent} 
              onComplete={() => {
                setModalOpen(false);
                router.refresh();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
