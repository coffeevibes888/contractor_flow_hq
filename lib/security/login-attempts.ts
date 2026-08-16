/**
 * Login attempt tracker. Writes to `LoginAttempt` for both successful and
 * failed authentications so the super-admin security dashboard can:
 *   - rank suspicious IPs and emails
 *   - compute failed-login rate over time
 *   - flag impossible-travel / new-country logins
 */

import { prisma } from '@/db/prisma';

export type LoginAttemptReason =
  | 'ok'
  | 'bad_password'
  | 'user_not_found'
  | 'rate_limited'
  | 'account_locked'
  | 'two_factor_required'
  | 'two_factor_failed'
  | 'oauth_error'
  | 'unknown';

export interface RecordLoginAttemptInput {
  email?: string | null;
  userId?: string | null;
  success: boolean;
  reason?: LoginAttemptReason;
  ipAddress?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  userAgent?: string | null;
}

export async function recordLoginAttempt(input: RecordLoginAttemptInput) {
  try {
    await prisma.loginAttempt.create({
      data: {
        email: input.email ?? undefined,
        userId: input.userId ?? undefined,
        success: input.success,
        reason: input.reason ?? (input.success ? 'ok' : 'unknown'),
        ipAddress: input.ipAddress ?? undefined,
        country: input.country ?? undefined,
        region: input.region ?? undefined,
        city: input.city ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    });
  } catch (error) {
    // Never let instrumentation failures break auth.
    console.error('recordLoginAttempt failed', error);
  }
}

/**
 * Haversine distance in kilometers between two lat/lon pairs.
 * Kept here because the impossible-travel check is only ever used in
 * conjunction with login attempts.
 */
function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Very rough country-centroid lookup used only for impossible-travel triage.
 * When we can't resolve a centroid we just skip the check — we never block
 * auth on this heuristic, it's purely a dashboard signal.
 */
const COUNTRY_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  US: { lat: 39.5, lon: -98.35 },
  CA: { lat: 56.13, lon: -106.35 },
  MX: { lat: 23.63, lon: -102.55 },
  GB: { lat: 55.38, lon: -3.44 },
  DE: { lat: 51.17, lon: 10.45 },
  FR: { lat: 46.23, lon: 2.21 },
  IN: { lat: 20.59, lon: 78.96 },
  CN: { lat: 35.86, lon: 104.2 },
  RU: { lat: 61.52, lon: 105.32 },
  BR: { lat: -14.24, lon: -51.93 },
  AU: { lat: -25.27, lon: 133.78 },
  JP: { lat: 36.2, lon: 138.25 },
  NG: { lat: 9.08, lon: 8.68 },
  ZA: { lat: -30.56, lon: 22.94 },
  KE: { lat: -0.02, lon: 37.91 },
  UA: { lat: 48.38, lon: 31.17 },
  KR: { lat: 35.91, lon: 127.77 },
  PH: { lat: 12.88, lon: 121.77 },
  ID: { lat: -0.79, lon: 113.92 },
  PK: { lat: 30.38, lon: 69.35 },
};

export interface ImpossibleTravelRow {
  userId: string;
  email: string | null;
  from: { country: string; at: Date };
  to: { country: string; at: Date };
  distanceKm: number;
  hoursBetween: number;
  impliedSpeedKmh: number;
}

/**
 * Scan the last `sinceHours` of successful logins and return pairs that would
 * have required travel faster than `maxSpeedKmh` (default ≈ commercial jet
 * speed). Cheap enough to run on dashboard load for a few hundred users.
 */
export async function findImpossibleTravel(opts: {
  sinceHours?: number;
  maxSpeedKmh?: number;
  limit?: number;
} = {}): Promise<ImpossibleTravelRow[]> {
  const sinceHours = opts.sinceHours ?? 48;
  const maxSpeedKmh = opts.maxSpeedKmh ?? 900;
  const limit = opts.limit ?? 50;

  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const attempts = await prisma.loginAttempt.findMany({
    where: {
      success: true,
      createdAt: { gte: since },
      userId: { not: null },
      country: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      userId: true,
      email: true,
      country: true,
      createdAt: true,
    },
  });

  const perUser = new Map<string, typeof attempts>();
  for (const a of attempts) {
    if (!a.userId) continue;
    const list = perUser.get(a.userId) ?? [];
    list.push(a);
    perUser.set(a.userId, list);
  }

  const rows: ImpossibleTravelRow[] = [];
  for (const [userId, list] of perUser) {
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const curr = list[i];
      if (!prev.country || !curr.country) continue;
      if (prev.country === curr.country) continue;
      const a = COUNTRY_CENTROIDS[prev.country];
      const b = COUNTRY_CENTROIDS[curr.country];
      if (!a || !b) continue;

      const km = haversineKm(a, b);
      const hours =
        (curr.createdAt.getTime() - prev.createdAt.getTime()) / (1000 * 60 * 60);
      if (hours <= 0) continue;
      const speed = km / hours;
      if (speed <= maxSpeedKmh) continue;

      rows.push({
        userId,
        email: curr.email,
        from: { country: prev.country, at: prev.createdAt },
        to: { country: curr.country, at: curr.createdAt },
        distanceKm: Math.round(km),
        hoursBetween: Math.round(hours * 10) / 10,
        impliedSpeedKmh: Math.round(speed),
      });
    }
  }

  return rows
    .sort((a, b) => b.impliedSpeedKmh - a.impliedSpeedKmh)
    .slice(0, limit);
}
