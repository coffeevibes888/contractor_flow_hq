/**
 * Persistent visitor identity. Separate from the session cookie so we can
 * tell new vs returning traffic even after a session expires.
 *
 * The cookie (`visitorId`) lives for a year and is attached on the edge via
 * the analytics track route. First touch attribution (UTMs, referrer, landing
 * page) is stamped once and never overwritten.
 */

import { prisma } from '@/db/prisma';

export interface RecordVisitorInput {
  visitorId: string;
  userId?: string | null;
  referrer?: string | null;
  path?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export async function upsertVisitorProfile(input: RecordVisitorInput) {
  try {
    const now = new Date();
    await prisma.visitorProfile.upsert({
      where: { visitorId: input.visitorId },
      create: {
        visitorId: input.visitorId,
        userId: input.userId ?? undefined,
        firstSeenAt: now,
        lastSeenAt: now,
        totalVisits: 1,
        totalPageViews: 1,
        firstReferrer: input.referrer ?? undefined,
        firstLandingPath: input.path ?? undefined,
        firstUtmSource: input.utmSource ?? undefined,
        firstUtmMedium: input.utmMedium ?? undefined,
        firstUtmCampaign: input.utmCampaign ?? undefined,
        lastUtmSource: input.utmSource ?? undefined,
      },
      update: {
        lastSeenAt: now,
        totalPageViews: { increment: 1 },
        // Only update the userId if the visitor has now authenticated.
        ...(input.userId ? { userId: input.userId } : {}),
        // Last-touch attribution for return visits.
        ...(input.utmSource ? { lastUtmSource: input.utmSource } : {}),
      },
    });
  } catch (error) {
    // Analytics is best effort — never bubble an error into the page path.
    console.error('upsertVisitorProfile failed', error);
  }
}

/**
 * Counts the visitor as having started a new visit if more than 30 minutes
 * have passed since the last seen time. Call this on landing page loads.
 */
export async function bumpVisitIfNeeded(visitorId: string) {
  try {
    const profile = await prisma.visitorProfile.findUnique({
      where: { visitorId },
      select: { lastSeenAt: true },
    });
    if (!profile) return;
    const gapMs = Date.now() - profile.lastSeenAt.getTime();
    if (gapMs > 30 * 60 * 1000) {
      await prisma.visitorProfile.update({
        where: { visitorId },
        data: {
          totalVisits: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('bumpVisitIfNeeded failed', error);
  }
}
