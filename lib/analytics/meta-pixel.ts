/**
 * Meta (Facebook) Pixel helpers
 *
 * - The base pixel is initialized in app/layout.tsx (loads fbevents.js + fires PageView).
 * - These helpers fire additional events (Lead, InitiateCheckout, etc.) from client components.
 * - Server-side Purchase events go through the Conversions API in lib/analytics/meta-capi.ts
 *   which is called from the Stripe webhook for maximum reliability.
 */

// Meta Pixel ID - mirrors app/layout.tsx. Keep in sync if you ever rotate it.
export const META_PIXEL_ID = '964798809289904';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FbqFn = (...args: any[]) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
  }
}

/**
 * Fire a standard Meta Pixel event from the browser.
 * Safe to call on the server (no-ops silently).
 *
 * Param values: Meta accepts strings, numbers, booleans, AND arrays of
 * those (e.g. `content_ids` on InitiateCheckout/Purchase is documented as
 * an array of product IDs). The type allows arrays for that reason.
 */
export function trackMetaEvent(
  eventName:
    | 'Lead'
    | 'CompleteRegistration'
    | 'InitiateCheckout'
    | 'AddPaymentInfo'
    | 'Subscribe'
    | 'Purchase'
    | 'StartTrial',
  params?: Record<
    string,
    string | number | boolean | string[] | number[] | undefined
  >,
  options?: { eventID?: string }
) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  try {
    if (options?.eventID) {
      window.fbq('track', eventName, params || {}, { eventID: options.eventID });
    } else {
      window.fbq('track', eventName, params || {});
    }
  } catch {
    // never let analytics break the UX
  }
}

/**
 * Generate a stable event ID so client-side + server-side events can be deduplicated
 * by Meta when both are fired for the same user action (important for Purchase).
 */
export function buildEventId(scope: string, id: string): string {
  return `${scope}_${id}`;
}
