'use client';

import { useEffect } from 'react';

// Extend window type for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface GoogleAnalyticsEventProps {
  eventName: string;
  eventParams?: Record<string, any>;
  triggerOnMount?: boolean;
}

export function GoogleAnalyticsEvent({ 
  eventName, 
  eventParams = {}, 
  triggerOnMount = true 
}: GoogleAnalyticsEventProps) {
  useEffect(() => {
    if (!triggerOnMount) return;
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
  }, [eventName, eventParams, triggerOnMount]);

  return null;
}

// Helper function to track events programmatically
export function trackGoogleAnalyticsEvent(
  eventName: string, 
  eventParams: Record<string, any> = {}
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

// Specific conversion tracking functions
export function trackSubscriptionConversion(tier: string, value: number) {
  trackGoogleAnalyticsEvent('purchase', {
    transaction_id: `sub_${Date.now()}`,
    value: value,
    currency: 'USD',
    event_category: 'subscription',
    event_label: `Subscription - ${tier}`,
    items: [{
      item_id: tier,
      item_name: `${tier} Plan`,
      item_category: 'subscription',
      price: value,
      quantity: 1,
    }],
  });
}

export function trackRentPaymentConversion(amount: number, paymentId: string) {
  trackGoogleAnalyticsEvent('purchase', {
    transaction_id: paymentId,
    value: amount,
    currency: 'USD',
    event_category: 'rent_payment',
    event_label: 'Rent Payment',
  });
}

export function trackProductPurchase(orderId: string, amount: number, items: any[]) {
  trackGoogleAnalyticsEvent('purchase', {
    transaction_id: orderId,
    value: amount,
    currency: 'USD',
    event_category: 'ecommerce',
    event_label: 'Product Purchase',
    items: items,
  });
}

export function trackBeginCheckout(value: number, items: any[]) {
  trackGoogleAnalyticsEvent('begin_checkout', {
    value: value,
    currency: 'USD',
    items: items,
  });
}

export function trackAddToCart(item: any) {
  trackGoogleAnalyticsEvent('add_to_cart', {
    currency: 'USD',
    value: item.price,
    items: [item],
  });
}

export function trackSignup(method: string = 'email') {
  trackGoogleAnalyticsEvent('sign_up', {
    method: method,
  });
}

export function trackLogin(method: string = 'email') {
  trackGoogleAnalyticsEvent('login', {
    method: method,
  });
}
