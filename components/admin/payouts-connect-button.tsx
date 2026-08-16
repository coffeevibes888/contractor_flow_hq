'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { Loader2 } from 'lucide-react';

const PayoutsConnectEmbedded = ({
  component = 'account_onboarding',
  onComplete,
}: {
  component?: 'account_onboarding' | 'payouts';
  onComplete?: () => void;
}) => {
  const { toast } = useToast();
  const [stripeError, setStripeError] = useState<string | null>(null);

  return (
    <div>
      {stripeError ? (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          {stripeError}
        </div>
      ) : (
        <EmbeddedStripeOnboarding
          component={component}
          onError={(message) => setStripeError(message)}
          onExit={() => {
            toast({ description: 'You can continue verification any time.' });
            onComplete?.();
          }}
        />
      )}
    </div>
  );
};

export default PayoutsConnectEmbedded;

function EmbeddedStripeOnboarding({
  component,
  onError,
  onExit,
}: {
  component: 'account_onboarding' | 'payouts';
  onError: (message: string) => void;
  onExit: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);

  type AccountOnboardingElement = HTMLElement & {
    setOnExit?: (cb: () => void) => void;
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let canceled = false;

    void (async () => {
      try {
        setIsInitializing(true);
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

        if (!publishableKey) {
          onError('Payout setup is not configured yet. Please contact support.');
          return;
        }

        const fetchClientSecret = async () => {
          const res = await fetch(`/api/landlord/stripe/onboard?component=${component}`);
          const data = await res.json();

          if (!res.ok || !data?.success || !data?.clientSecret) {
            const message = data?.message || 'Unable to start verification. Please try again.';
            throw new Error(message);
          }

          return data.clientSecret as string;
        };

        let clientSecret: string;
        try {
          clientSecret = await fetchClientSecret();
        } catch (e) {
          onError(e instanceof Error ? e.message : 'Unable to start verification. Please try again.');
          return;
        }

        const stripeConnectInstance = await loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: async () => clientSecret,
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: '#3b82f6', // Blue-500 to match site primary
              colorBackground: '#ffffff',
              colorText: '#1e293b',
              colorDanger: '#dc2626',
              fontSizeBase: '14px',
              spacingUnit: '4px',
              borderRadius: '8px',
            },
          },
        });

        const elementName = component === 'payouts' ? 'payouts' : 'account-onboarding';

        const accountOnboarding = stripeConnectInstance.create(
          elementName
        ) as AccountOnboardingElement | null;

        if (!accountOnboarding) {
          onError('Unable to load verification form. Please refresh and try again.');
          return;
        }

        accountOnboarding.setOnExit?.(onExit);

        const container = containerRef.current;
        if (!container) {
          onError('Unable to load verification form. Please refresh and try again.');
          return;
        }

        container.innerHTML = '';
        container.appendChild(accountOnboarding);
      } catch (err) {
        console.error('Embedded onboarding error', err);
        onError('Unable to load verification. Please try again.');
      } finally {
        if (!canceled) setIsInitializing(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [component, onError, onExit]);

  return (
    <div className='min-h-[300px] max-h-[60vh] overflow-y-auto'>
      {isInitializing && (
        <div className='flex items-center justify-center gap-2 py-12 text-sm text-slate-500'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <span>Loading verification form...</span>
        </div>
      )}
      <div ref={containerRef} id='stripe-connect-onboarding-container' />
    </div>
  );
}
