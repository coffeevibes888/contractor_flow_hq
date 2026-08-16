'use server';

/**
 * Enhanced super-admin metrics. Groups: security, finance, growth, reliability.
 *
 * Every function in this file is defensive: on empty data or errors it returns
 * structured zeroes so the dashboard never crashes.
 */

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth-guard';
import { findImpossibleTravel } from '@/lib/security/login-attempts';
import { formatError } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────────────────────────────────────

export async function getSecurityMetrics() {
  try {
    await requireSuperAdmin();

    const last24h = hoursAgo(24);
    const last7d = daysAgo(7);

    const [
      failedLogins24h,
      failedLogins7d,
      successfulLogins24h,
      topFailedIps,
      topFailedEmails,
      newCountryLogins,
      totalUsers,
      mfaUsers,
      adminUsers,
      mfaAdminUsers,
      recentFailedAttempts,
      rateLimited24h,
    ] = await Promise.all([
      prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: last24h } } }),
      prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: last7d } } }),
      prisma.loginAttempt.count({ where: { success: true, createdAt: { gte: last24h } } }),
      prisma.loginAttempt.groupBy({
        by: ['ipAddress'],
        where: { success: false, createdAt: { gte: last7d }, ipAddress: { not: null } },
        _count: { _all: true },
      }),
      prisma.loginAttempt.groupBy({
        by: ['email'],
        where: { success: false, createdAt: { gte: last7d }, email: { not: null } },
        _count: { _all: true },
      }),
      // Successful logins from a country the user has never logged in from before.
      prisma.$queryRaw<Array<{ user_id: string; email: string | null; country: string; created_at: Date }>>`
        WITH ranked AS (
          SELECT
            "userId" AS user_id,
            email,
            country,
            "createdAt" AS created_at,
            ROW_NUMBER() OVER (PARTITION BY "userId", country ORDER BY "createdAt" ASC) AS rn
          FROM "LoginAttempt"
          WHERE success = true
            AND "userId" IS NOT NULL
            AND country IS NOT NULL
        )
        SELECT user_id, email, country, created_at
        FROM ranked
        WHERE rn = 1 AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 25
      `,
      prisma.user.count(),
      prisma.user.count({ where: { twoFactorEnabled: true } }),
      prisma.user.count({ where: { role: { in: ['admin', 'superAdmin'] } } }),
      prisma.user.count({
        where: { role: { in: ['admin', 'superAdmin'] }, twoFactorEnabled: true },
      }),
      prisma.loginAttempt.findMany({
        where: { success: false, createdAt: { gte: last24h } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, email: true, ipAddress: true, country: true, reason: true, createdAt: true,
        },
      }),
      prisma.loginAttempt.count({
        where: { success: false, reason: 'rate_limited', createdAt: { gte: last24h } },
      }),
    ]);

    const impossibleTravel = await findImpossibleTravel({ sinceHours: 48 }).catch(() => []);

    const mfaAdoptionPct = totalUsers > 0 ? Math.round((mfaUsers / totalUsers) * 10000) / 100 : 0;
    const mfaAdminAdoptionPct =
      adminUsers > 0 ? Math.round((mfaAdminUsers / adminUsers) * 10000) / 100 : 0;

    return {
      failedLogins24h,
      failedLogins7d,
      successfulLogins24h,
      rateLimited24h,
      topFailedIps: topFailedIps
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 10)
        .map((r) => ({ ip: r.ipAddress, count: r._count._all })),
      topFailedEmails: topFailedEmails
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 10)
        .map((r) => ({ email: r.email, count: r._count._all })),
      newCountryLogins: newCountryLogins.map((r) => ({
        userId: r.user_id,
        email: r.email,
        country: r.country,
        at: r.created_at,
      })),
      impossibleTravel,
      mfa: {
        totalUsers,
        mfaUsers,
        adoptionPct: mfaAdoptionPct,
        adminUsers,
        mfaAdminUsers,
        adminAdoptionPct: mfaAdminAdoptionPct,
      },
      recentFailedAttempts,
    };
  } catch (error) {
    console.error('getSecurityMetrics failed', formatError(error));
    return {
      failedLogins24h: 0,
      failedLogins7d: 0,
      successfulLogins24h: 0,
      rateLimited24h: 0,
      topFailedIps: [],
      topFailedEmails: [],
      newCountryLogins: [],
      impossibleTravel: [],
      mfa: { totalUsers: 0, mfaUsers: 0, adoptionPct: 0, adminUsers: 0, mfaAdminUsers: 0, adminAdoptionPct: 0 },
      recentFailedAttempts: [],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance — churn, retention, subscription health
// ─────────────────────────────────────────────────────────────────────────────

export async function getFinanceMetrics() {
  try {
    await requireSuperAdmin();

    const last30d = daysAgo(30);
    const prev30d = daysAgo(60);

    const [
      statusBreakdown,
      trialingCount,
      pastDueCount,
      canceledLast30d,
      canceledPrev30d,
      activeLast30dStart,
      activeNow,
      suspicious,
    ] = await Promise.all([
      prisma.landlord.groupBy({
        by: ['subscriptionStatus'],
        _count: { _all: true },
      }),
      prisma.landlord.count({ where: { subscriptionStatus: 'trialing' } }),
      prisma.landlord.count({ where: { subscriptionStatus: 'past_due' } }),
      prisma.landlord.count({
        where: {
          subscriptionStatus: 'canceled',
          updatedAt: { gte: last30d },
        },
      }),
      prisma.landlord.count({
        where: {
          subscriptionStatus: 'canceled',
          updatedAt: { gte: prev30d, lt: last30d },
        },
      }),
      prisma.landlord.count({
        where: {
          createdAt: { lt: last30d },
          subscriptionStatus: { in: ['active', 'trialing'] },
        },
      }),
      prisma.landlord.count({
        where: { subscriptionStatus: { in: ['active', 'trialing'] } },
      }),
      // "Suspicious" subscription signals: past-due for more than 14 days.
      prisma.landlord.findMany({
        where: {
          subscriptionStatus: 'past_due',
          updatedAt: { lt: daysAgo(14) },
        },
        select: { id: true, name: true, subdomain: true, subscriptionTier: true, updatedAt: true },
        take: 20,
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    const logoChurnPct =
      activeLast30dStart > 0
        ? Math.round((canceledLast30d / activeLast30dStart) * 10000) / 100
        : 0;
    const churnDeltaPct = logoChurnPct - (
      activeLast30dStart > 0
        ? Math.round((canceledPrev30d / activeLast30dStart) * 10000) / 100
        : 0
    );

    // Trial → paid conversion over the trailing 30 days.
    const [trialEndedPaid, trialEndedTotal] = await Promise.all([
      prisma.landlord.count({
        where: {
          subscriptionStatus: 'active',
          createdAt: { gte: prev30d, lt: last30d },
        },
      }),
      prisma.landlord.count({
        where: {
          createdAt: { gte: prev30d, lt: last30d },
        },
      }),
    ]);

    const trialConversionPct =
      trialEndedTotal > 0
        ? Math.round((trialEndedPaid / trialEndedTotal) * 10000) / 100
        : 0;

    return {
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.subscriptionStatus,
        count: s._count._all,
      })),
      trialingCount,
      pastDueCount,
      canceledLast30d,
      logoChurnPct,
      churnDeltaPct,
      trialConversionPct,
      longPastDue: suspicious,
      activeNow,
    };
  } catch (error) {
    console.error('getFinanceMetrics failed', formatError(error));
    return {
      statusBreakdown: [],
      trialingCount: 0,
      pastDueCount: 0,
      canceledLast30d: 0,
      logoChurnPct: 0,
      churnDeltaPct: 0,
      trialConversionPct: 0,
      longPastDue: [],
      activeNow: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Growth — new vs returning, attribution, retention
// ─────────────────────────────────────────────────────────────────────────────

export async function getGrowthMetrics() {
  try {
    await requireSuperAdmin();

    const last30d = daysAgo(30);
    const last7d = daysAgo(7);

    const [
      totalVisitors,
      newVisitors30d,
      returningVisitors30d,
      attribution,
      topLandingPages,
      recent30Signups,
    ] = await Promise.all([
      prisma.visitorProfile.count(),
      prisma.visitorProfile.count({ where: { firstSeenAt: { gte: last30d } } }),
      prisma.visitorProfile.count({
        where: {
          firstSeenAt: { lt: last30d },
          lastSeenAt: { gte: last30d },
        },
      }),
      prisma.visitorProfile.groupBy({
        by: ['firstUtmSource'],
        where: { firstSeenAt: { gte: last30d } },
        _count: { _all: true },
      }),
      prisma.visitorProfile.groupBy({
        by: ['firstLandingPath'],
        where: { firstSeenAt: { gte: last30d } },
        _count: { _all: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: last7d } } }),
    ]);

    return {
      totalVisitors,
      newVisitors30d,
      returningVisitors30d,
      returningPct:
        newVisitors30d + returningVisitors30d > 0
          ? Math.round(
              (returningVisitors30d / (newVisitors30d + returningVisitors30d)) * 10000
            ) / 100
          : 0,
      attributionBySource: attribution
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 10)
        .map((r) => ({ source: r.firstUtmSource ?? 'direct', count: r._count._all })),
      topLandingPages: topLandingPages
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 10)
        .map((r) => ({ path: r.firstLandingPath ?? 'unknown', count: r._count._all })),
      recentSignups7d: recent30Signups,
    };
  } catch (error) {
    console.error('getGrowthMetrics failed', formatError(error));
    return {
      totalVisitors: 0,
      newVisitors30d: 0,
      returningVisitors30d: 0,
      returningPct: 0,
      attributionBySource: [],
      topLandingPages: [],
      recentSignups7d: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reliability — cron heartbeat, webhook health
// ─────────────────────────────────────────────────────────────────────────────

export async function getReliabilityMetrics() {
  try {
    await requireSuperAdmin();

    const last24h = hoursAgo(24);

    const [latestPerJob, failed24h, runs24h] = await Promise.all([
      prisma.$queryRaw<Array<{
        job_name: string;
        status: string;
        started_at: Date;
        finished_at: Date | null;
        duration_ms: number | null;
        error: string | null;
      }>>`
        SELECT DISTINCT ON ("jobName")
          "jobName" AS job_name,
          status,
          "startedAt" AS started_at,
          "finishedAt" AS finished_at,
          "durationMs" AS duration_ms,
          error
        FROM "CronRunLog"
        ORDER BY "jobName", "startedAt" DESC
      `,
      prisma.cronRunLog.count({
        where: { status: 'failure', startedAt: { gte: last24h } },
      }),
      prisma.cronRunLog.groupBy({
        by: ['jobName', 'status'],
        where: { startedAt: { gte: last24h } },
        _count: { _all: true },
      }),
    ]);

    // Stale jobs: last successful run older than 2× expected schedule.
    // We don't know schedules here, so we just flag anything older than 24h.
    const staleThreshold = hoursAgo(24);
    const staleJobs = latestPerJob.filter((j) => {
      const base = j.finished_at ?? j.started_at;
      return base < staleThreshold || j.status === 'failure';
    });

    // Inbound webhook health (Stripe, etc.)
    const [webhookFailures24h, webhookSignature24h, webhooks24h] = await Promise.all([
      prisma.inboundWebhookEvent.count({
        where: { status: 'failed', createdAt: { gte: last24h } },
      }),
      prisma.inboundWebhookEvent.count({
        where: { status: 'signature_invalid', createdAt: { gte: last24h } },
      }),
      prisma.inboundWebhookEvent.count({ where: { createdAt: { gte: last24h } } }),
    ]);

    return {
      jobs: latestPerJob.map((j) => ({
        jobName: j.job_name,
        status: j.status,
        lastRun: j.finished_at ?? j.started_at,
        durationMs: j.duration_ms,
        error: j.error,
      })),
      staleJobs: staleJobs.map((j) => ({
        jobName: j.job_name,
        lastRun: j.finished_at ?? j.started_at,
        status: j.status,
      })),
      failedRuns24h: failed24h,
      runsByJob24h: runs24h.map((r) => ({
        jobName: r.jobName,
        status: r.status,
        count: r._count._all,
      })),
      webhooks: {
        total24h: webhooks24h,
        failures24h: webhookFailures24h,
        signatureInvalid24h: webhookSignature24h,
        failureRate24h:
          webhooks24h > 0
            ? Math.round(
                ((webhookFailures24h + webhookSignature24h) / webhooks24h) * 10000
              ) / 100
            : 0,
      },
    };
  } catch (error) {
    console.error('getReliabilityMetrics failed', formatError(error));
    return {
      jobs: [],
      staleJobs: [],
      failedRuns24h: 0,
      runsByJob24h: [],
      webhooks: { total24h: 0, failures24h: 0, signatureInvalid24h: 0, failureRate24h: 0 },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PII access log summary
// ─────────────────────────────────────────────────────────────────────────────

export async function getPIIAccessSummary() {
  try {
    await requireSuperAdmin();
    const last7d = daysAgo(7);
    const [byActor, recent] = await Promise.all([
      prisma.sensitivePIIAccess.groupBy({
        by: ['actorUserId'],
        where: { createdAt: { gte: last7d } },
        _count: { _all: true },
      }),
      prisma.sensitivePIIAccess.findMany({
        where: { createdAt: { gte: last7d } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    const actorIds = byActor.map((r) => r.actorUserId);
    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, name: true, role: true },
        })
      : [];
    const byId = new Map(actors.map((a) => [a.id, a]));

    return {
      byActor: byActor
        .sort((a, b) => b._count._all - a._count._all)
        .map((r) => ({
          actor: byId.get(r.actorUserId) ?? { id: r.actorUserId, email: null, name: null, role: null },
          count: r._count._all,
        })),
      recent,
    };
  } catch (error) {
    console.error('getPIIAccessSummary failed', formatError(error));
    return { byActor: [], recent: [] };
  }
}
