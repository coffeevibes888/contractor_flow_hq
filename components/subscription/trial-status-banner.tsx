'use client';

import { useState } from 'react';
import { X, Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TrialStatusBannerProps {
  trialStatus: 'trialing' | 'trial_expired' | 'suspended';
  daysLeft?: number;
  trialEndDate?: Date;
  role: 'landlord' | 'contractor' | 'agent';
}

export function TrialStatusBanner({ 
  trialStatus, 
  daysLeft, 
  trialEndDate,
  role 
}: TrialStatusBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if dismissed (only for trialing status)
  if (isDismissed && trialStatus === 'trialing') return null;

  // Trial expired and suspended cannot be dismissed
  const canDismiss = trialStatus === 'trialing';

  const subscriptionUrl = role === 'landlord' 
    ? '/onboarding/landlord/subscription'
    : role === 'contractor'
    ? '/onboarding/contractor/subscription'
    : '/onboarding/agent/subscription';

  // Trialing - Show days left
  if (trialStatus === 'trialing' && daysLeft !== undefined) {
    const isUrgent = daysLeft <= 3;
    const bgColor = isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200';
    const textColor = isUrgent ? 'text-orange-900' : 'text-blue-900';
    const iconColor = isUrgent ? 'text-orange-600' : 'text-blue-600';

    return (
      <div className={`${bgColor} border-b`}>
        <div className='max-w-7xl mx-auto px-4 py-3'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 flex-1'>
              <Clock className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
              <div className='flex-1'>
                <p className={`text-sm ${textColor}`}>
                  <strong>{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</strong> in your free trial. 
                  {isUrgent ? ' Subscribe now to keep your data and features!' : ' Upgrade anytime to continue after trial.'}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Link href={subscriptionUrl}>
                <Button
                  variant='default'
                  size='sm'
                  className='bg-violet-600 hover:bg-violet-700 text-white'
                >
                  <CreditCard className='h-4 w-4 mr-1' />
                  Subscribe Now
                </Button>
              </Link>
              {canDismiss && (
                <button
                  onClick={() => setIsDismissed(true)}
                  className={`${textColor} p-1`}
                  aria-label='Dismiss'
                >
                  <X className='h-5 w-5' />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired - Read-only mode
  if (trialStatus === 'trial_expired') {
    return (
      <div className='bg-amber-50 border-b border-amber-200'>
        <div className='max-w-7xl mx-auto px-4 py-3'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 flex-1'>
              <AlertTriangle className='h-5 w-5 text-amber-600 flex-shrink-0' />
              <div className='flex-1'>
                <p className='text-sm text-amber-900'>
                  <strong>Your trial has ended.</strong> Your account is now in read-only mode. 
                  Subscribe to continue managing your properties.
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Link href={subscriptionUrl}>
                <Button
                  variant='default'
                  size='sm'
                  className='bg-violet-600 hover:bg-violet-700 text-white'
                >
                  <CreditCard className='h-4 w-4 mr-1' />
                  Subscribe to Reactivate
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Suspended - No access
  if (trialStatus === 'suspended') {
    return (
      <div className='bg-red-50 border-b border-red-200'>
        <div className='max-w-7xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 flex-1'>
              <AlertTriangle className='h-6 w-6 text-red-600 flex-shrink-0' />
              <div className='flex-1'>
                <p className='text-sm text-red-900'>
                  <strong>Account Suspended.</strong> Your trial ended and your account has been suspended. 
                  Subscribe now to restore access to your data.
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Link href={subscriptionUrl}>
                <Button
                  variant='default'
                  size='sm'
                  className='bg-red-600 hover:bg-red-700 text-white'
                >
                  <CreditCard className='h-4 w-4 mr-1' />
                  Subscribe Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
