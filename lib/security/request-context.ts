/**
 * Server-side request context — extracts IP, user-agent, and Vercel geo
 * headers from the current request so audit log entries actually have
 * something to investigate later.
 *
 * Two callsites pattern:
 *   1. Route handlers (NextRequest)        → use `requestContextFromRequest(req)`
 *   2. Server components / server actions  → use `requestContextFromHeaders()`
 *      (works because Next.js exposes the current request's headers via
 *      `next/headers`).
 *
 * Why this matters
 * - Several auth events were being logged with no `ipAddress` and no
 *   `userAgent` (the dashes you saw in the audit table). When investigating
 *   a suspected bypass — e.g. an account being silently promoted — the IP
 *   is the difference between "I can rate-limit this person" and "I have
 *   no idea where this came from."
 * - Vercel populates `x-vercel-ip-country`, `x-vercel-ip-country-region`,
 *   `x-vercel-ip-city` on every request that goes through their edge.
 *   Capturing them is free.
 *
 * Returns `null` for fields it can't resolve, never throws.
 */

import type { NextRequest } from 'next/server';
import { headers as nextHeaders } from 'next/headers';

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
}

/** Helper: pull an IP out of a Headers-like object using common proxy headers. */
function readIp(get: (name: string) => string | null): string | null {
  const fwd = get('x-forwarded-for');
  if (fwd) {
    // x-forwarded-for can be a comma-separated list — left-most is the
    // original client. Trim spaces; ignore empty strings.
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return get('x-real-ip') || null;
}

/**
 * Extract context from a route-handler `NextRequest`.
 *
 *   export async function POST(req: NextRequest) {
 *     const ctx = requestContextFromRequest(req);
 *     await logAuthEvent('AUTH_X', { ...ctx });
 *   }
 */
export function requestContextFromRequest(req: NextRequest): RequestContext {
  const get = (name: string) => req.headers.get(name);
  return {
    ipAddress: readIp(get),
    userAgent: get('user-agent') || null,
    country: get('x-vercel-ip-country'),
    region: get('x-vercel-ip-country-region'),
    city: get('x-vercel-ip-city'),
  };
}

/**
 * Extract context from a server component or server action via
 * `next/headers`. This is a Next 15+ async API — you must `await` it.
 *
 *   const ctx = await requestContextFromHeaders();
 *   await logAuthEvent('AUTH_X', { ...ctx });
 */
export async function requestContextFromHeaders(): Promise<RequestContext> {
  try {
    const h = await nextHeaders();
    const get = (name: string) => h.get(name);
    return {
      ipAddress: readIp(get),
      userAgent: get('user-agent') || null,
      country: get('x-vercel-ip-country'),
      region: get('x-vercel-ip-country-region'),
      city: get('x-vercel-ip-city'),
    };
  } catch {
    // `headers()` throws when called outside a request scope (e.g. cron).
    // Fall back to nulls so callers don't have to special-case.
    return {
      ipAddress: null,
      userAgent: null,
      country: null,
      region: null,
      city: null,
    };
  }
}
