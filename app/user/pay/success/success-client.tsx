'use client';

import { useEffect, useRef } from 'react';
import { getAnalytics } from '@/lib/analytics-tracker';

// Extend window type for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default function PaymentSuccessClient({
  paymentIntentId,
}: {
  paymentIntentId: string | null;
}) {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!paymentIntentId) return;

    // Track conversion in our analytics system
    const analytics = getAnalytics();
    analytics?.trackConversion('rent_payment', 0);

    // Track in Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: paymentIntentId,
        value: 0,
        currency: 'USD',
        event_category: 'rent_payment',
        event_label: 'Rent Payment Success',
      });
    }

    (async () => {
      try {
        await fetch('/api/rent/mark-paid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId }),
        });
      } catch {
        // noop
      }
    })();
  }, [paymentIntentId]);

  return null;
}
