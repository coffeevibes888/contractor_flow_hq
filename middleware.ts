/**
 * Next.js middleware
 *
 * 1. Forwards the current pathname to server components via an `x-pathname`
 *    request header. Used in `app/[subdomain]/layout.tsx` to decide which
 *    header to render and whether to hide chrome on full-screen flows.
 *
 * 2. Enforces IP blocks on ALL requests. Blocked IPs stored in the database
 *    are checked via an internal API call so we can use Prisma (Node.js only)
 *    without bundling it into the edge runtime.
 *
 * 3. CSRF origin validation for state-changing API requests (POST/PUT/PATCH/DELETE).
 */

import { NextResponse, type NextRequest } from 'next/server';

/** Paths that should SKIP the IP block check (static assets, internal API used by the check itself). */
const SKIP_IP_CHECK_PREFIXES = [
  '/_next/',
  '/favicon',
  '/images/',
  '/videos/',
  '/fonts/',
  '/api/internal/check-blocked-ip',
];

/** API paths exempt from CSRF origin check (webhooks from external services). */
const CSRF_EXEMPT_PREFIXES = [
  '/api/webhooks/',        // Stripe webhooks, etc.
  '/api/internal/',        // Internal service-to-service calls
  '/api/uploadthing',      // File upload callbacks
  '/api/auth/',            // NextAuth callbacks (Google OAuth, etc.)
];

function shouldSkipIpCheck(pathname: string): boolean {
  return SKIP_IP_CHECK_PREFIXES.some((p) => pathname.startsWith(p));
}

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

function extractIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── CSRF origin validation for state-changing API requests ────────────────
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isStateChanging && pathname.startsWith('/api/') && !isCsrfExempt(pathname)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      let originHost: string;
      try {
        originHost = new URL(origin).host;
      } catch {
        // Malformed origin header — block it
        return new NextResponse('Forbidden', { status: 403 });
      }

      if (originHost !== host) {
        // Cross-origin state-changing request to our API — block it
        return new NextResponse('Forbidden', { status: 403 });
      }
    }
    // Note: If origin header is missing (e.g. same-origin fetch without it,
    // or server-to-server calls), we allow it. Browsers always send origin
    // on cross-origin requests, so a missing origin = same-origin or non-browser.
  }

  // ── IP block enforcement — ALL requests except static assets ──────────────
  if (!shouldSkipIpCheck(pathname)) {
    const ip = extractIp(request);

    if (ip && ip !== 'unknown') {
      try {
        const internalSecret = process.env.INTERNAL_API_SECRET;
        if (internalSecret) {
          const checkUrl = new URL(
            `/api/internal/check-blocked-ip?ip=${encodeURIComponent(ip)}`,
            request.nextUrl.origin
          );
          const res = await fetch(checkUrl.toString(), {
            headers: { 'x-internal-secret': internalSecret },
            // Short timeout — fail open rather than blocking real users on
            // a slow DB response.
            signal: AbortSignal.timeout(2000),
          });

          if (res.ok) {
            const data = await res.json() as { blocked: boolean };
            if (data.blocked) {
              // Return a generic 403 — don't hint that the IP is specifically blocked
              return new NextResponse('Access denied.', { status: 403 });
            }
          }
        }
      } catch {
        // Fail open — a slow or unavailable DB shouldn't lock out real users
      }
    }
  }

  // ── Pathname header + full URL (path+search) ─────────────────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  // Include the query string so downstream server components (e.g.
  // SubscriptionGate) can preserve ?lc= and other params when constructing
  // a redirect URL (e.g. /verify-email/required?next=...).
  const search = request.nextUrl.search; // e.g. "?lc=abc123"
  requestHeaders.set('x-url', search ? `${pathname}${search}` : pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  // Skip Next internals, static files, and internal API routes.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/internal/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml)$).*)',
  ],
};
