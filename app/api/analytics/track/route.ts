import { NextRequest, NextResponse } from 'next/server';
import { trackPageView } from '@/lib/actions/analytics.actions';
import { auth } from '@/auth';
import { randomUUID } from 'crypto';
import { upsertVisitorProfile, bumpVisitIfNeeded } from '@/lib/analytics/visitor-profile';

/**
 * Pulls the best available client IP from the request headers.
 */
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null
  );
}

function parseUtm(path: string | undefined) {
  if (!path) return {} as Record<string, string | null>;
  try {
    const url = new URL(path, 'https://x.local');
    const get = (k: string) => url.searchParams.get(k);
    return {
      utmSource: get('utm_source'),
      utmMedium: get('utm_medium'),
      utmCampaign: get('utm_campaign'),
      utmTerm: get('utm_term'),
      utmContent: get('utm_content'),
    };
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { path, referrer, screenWidth, screenHeight, language, timezone } = body ?? {};

    if (!path) {
      return NextResponse.json({ ok: false, error: 'missing path' }, { status: 400 });
    }

    // Don't record the super-admin's own browsing.
    const session = await auth();
    if (session?.user?.role === 'superAdmin') {
      return NextResponse.json({ ok: true, skipped: 'superAdmin' });
    }

    let sessionCartId = request.cookies.get('sessionCartId')?.value;
    let visitorId = request.cookies.get('visitorId')?.value;

    const country = request.headers.get('x-vercel-ip-country');
    const region = request.headers.get('x-vercel-ip-country-region');
    const city = request.headers.get('x-vercel-ip-city');
    const userAgent = request.headers.get('user-agent');
    const ip = getClientIp(request);

    const res = NextResponse.json({ ok: true });

    if (!sessionCartId) {
      sessionCartId = randomUUID();
      res.cookies.set('sessionCartId', sessionCartId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    let isNewVisitor = false;
    if (!visitorId) {
      visitorId = randomUUID();
      isNewVisitor = true;
      res.cookies.set('visitorId', visitorId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year — separate from session cart
      });
    }

    const utm = parseUtm(typeof path === 'string' ? path : undefined);

    // Record the pageview to the analytics events table.
    await trackPageView({
      sessionCartId,
      userId: session?.user?.id ?? null,
      path,
      referrer: referrer || null,
      country: country || null,
      region: region || null,
      city: city || null,
      userAgent: userAgent || null,
      ip,
      screenWidth: typeof screenWidth === 'number' ? screenWidth : null,
      screenHeight: typeof screenHeight === 'number' ? screenHeight : null,
      language: language || null,
      timezone: timezone || null,
    });

    // Update the persistent visitor profile. This is what backs the
    // new-vs-returning metric on the dashboard.
    upsertVisitorProfile({
      visitorId,
      userId: session?.user?.id ?? null,
      referrer: referrer || null,
      path,
      utmSource: utm.utmSource ?? null,
      utmMedium: utm.utmMedium ?? null,
      utmCampaign: utm.utmCampaign ?? null,
    }).catch(() => {});

    // If they're returning after an idle gap, bump visit count.
    if (!isNewVisitor) {
      bumpVisitIfNeeded(visitorId).catch(() => {});
    }

    return res;
  } catch (error) {
    console.error('Error in analytics track route', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
