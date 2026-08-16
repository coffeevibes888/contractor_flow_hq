/**
 * Reddit Pixel helpers (client-side)
 *
 * Base pixel is installed in app/layout.tsx (loads pixel.js + fires PageVisit).
 * This file fires Reddit standard events from client components.
 * Server-side Purchase goes through lib/analytics/reddit-capi.ts from the Stripe webhook.
 *
 * Standard Reddit events: PageVisit, ViewContent, Search, AddToCart, AddToWishlist,
 *                         Purchase, Lead, SignUp, ViewContent, Custom
 * Docs: https://ads-api.reddit.com/docs/v2/operations/Post-Pixel-Event
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RdtFn = (...args: any[]) => void;

declare global {
  interface Window {
    rdt?: RdtFn;
  }
}

type RedditEventName =
  | 'PageVisit'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'Purchase'
  | 'Lead'
  | 'SignUp'
  | 'Custom';

interface RedditEventParams {
  currency?: string;
  value?: number;
  transactionId?: string;
  itemCount?: number;
  products?: Array<{
    id?: string;
    name?: string;
    category?: string;
  }>;
  // Allow extras — Reddit ignores unknown fields gracefully
  [key: string]: unknown;
}

/**
 * Fire a standard Reddit Pixel event from the browser.
 * Safely no-ops if the pixel script didn't load (ad blocker) or on the server.
 */
export function trackRedditEvent(
  eventName: RedditEventName,
  params?: RedditEventParams,
  options?: { eventId?: string }
) {
  if (typeof window === 'undefined' || typeof window.rdt !== 'function') return;
  try {
    const payload: Record<string, unknown> = { ...(params || {}) };
    if (options?.eventId) payload.conversionId = options.eventId;
    window.rdt('track', eventName, payload);
  } catch {
    // never let analytics break the UX
  }
}
