import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Don't pollute analytics with super-admin activity.
    if (session?.user?.role === 'superAdmin') {
      return NextResponse.json({ ok: true, skipped: 'superAdmin' });
    }

    const data = await request.json();

    // Geo + IP come from the edge / proxy headers, not the client payload.
    const country = request.headers.get('x-vercel-ip-country') || null;
    const region = request.headers.get('x-vercel-ip-country-region') || null;
    const city = request.headers.get('x-vercel-ip-city') || null;
    const ip = getClientIp(request);

    const pageView = await prisma.pageView.create({
      data: {
        sessionId: data.sessionId,
        userId: session?.user?.id || null,
        path: data.path,
        referrer: data.referrer || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        utmTerm: data.utmTerm || null,
        utmContent: data.utmContent || null,
        country,
        region,
        city,
        device: data.device,
        browser: data.browser,
        os: data.os,
        screenWidth: data.screenWidth,
        screenHeight: data.screenHeight,
      },
    });

    // Upsert the matching user session, also stamping geo/IP on creation so
    // the super-admin analytics dashboard can actually surface geography.
    await prisma.userSession.upsert({
      where: { sessionId: data.sessionId },
      create: {
        sessionId: data.sessionId,
        userId: session?.user?.id || null,
        startTime: new Date(),
        pageCount: 1,
        landingPage: data.path,
        referrer: data.referrer || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        device: data.device,
        browser: data.browser,
        os: data.os,
        country,
        region,
        city,
      },
      update: {
        pageCount: { increment: 1 },
        endTime: new Date(),
        // Backfill geo on existing sessions if it was missed on insert.
        ...(country ? { country } : {}),
        ...(region ? { region } : {}),
        ...(city ? { city } : {}),
      },
    });

    // IP isn't used right now but keep a breadcrumb for debugging.
    if (ip) {
      // Intentional no-op; reserved for future per-session IP field.
    }

    return NextResponse.json({ success: true, id: pageView.id });
  } catch (error) {
    console.error('PageView tracking error:', error);
    return NextResponse.json({ error: 'Failed to track page view' }, { status: 500 });
  }
}
