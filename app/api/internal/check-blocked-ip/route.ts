/**
 * Internal endpoint — called by middleware to check whether an IP is blocked.
 *
 * Protected by a shared secret in INTERNAL_API_SECRET so it cannot be hit
 * from the public internet. The middleware matcher already excludes api/internal/
 * paths from the middleware itself, so this route is never checked against itself.
 *
 * Uses an in-memory cache to avoid hitting the DB on every single request.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache: ip → { blocked: boolean, cachedAt: number }
const ipCache = new Map<string, { blocked: boolean; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ blocked: false }, { status: 401 });
  }

  const ip = req.nextUrl.searchParams.get('ip');
  if (!ip) {
    return NextResponse.json({ blocked: false }, { status: 400 });
  }

  // Check cache first
  const cached = ipCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ blocked: cached.blocked });
  }

  try {
    const record = await prisma.blockedIP.findUnique({
      where: { ipAddress: ip },
      select: { isActive: true, expiresAt: true },
    });

    if (!record || !record.isActive) {
      ipCache.set(ip, { blocked: false, cachedAt: Date.now() });
      return NextResponse.json({ blocked: false });
    }

    // Honour expiry
    if (record.expiresAt && record.expiresAt < new Date()) {
      // Auto-expire in the background — don't block the response on it
      prisma.blockedIP
        .update({ where: { ipAddress: ip }, data: { isActive: false } })
        .catch(() => {});
      ipCache.set(ip, { blocked: false, cachedAt: Date.now() });
      return NextResponse.json({ blocked: false });
    }

    ipCache.set(ip, { blocked: true, cachedAt: Date.now() });
    return NextResponse.json({ blocked: true });
  } catch {
    // If the DB is down, fail open (don't block legitimate traffic)
    return NextResponse.json({ blocked: false });
  }
}
