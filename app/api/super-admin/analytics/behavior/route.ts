/**
 * GET /api/super-admin/analytics/behavior
 *
 * User-behavior and conversion intelligence:
 *   - Signup funnel: visitor → sign-up page → completed signup → onboarded → paid
 *   - Role-journey breakdown: where do landlords/tenants/contractors fall off?
 *   - Time-to-convert: how many days from first visit to signup?
 *   - Feature engagement after signup: which features do new users touch first?
 *   - Drop-off pages: top pages where auth-required users hit walls and bail
 *   - Returning visitor conversion rate vs new visitor
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    const now = new Date();
    const startDate = new Date();
    switch (range) {
      case '7d':  startDate.setDate(now.getDate() - 7);   break;
      case '30d': startDate.setDate(now.getDate() - 30);  break;
      case '90d': startDate.setDate(now.getDate() - 90);  break;
      default:    startDate.setDate(now.getDate() - 30);
    }

    const [
      newUsers,
      onboardedUsers,
      paidUsers,
      roleBreakdown,
      pageViews,
      sessions,
      formInteractions,
      auditSignups,
    ] = await Promise.all([
      // All users created in range
      prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          role: true,
          createdAt: true,
          onboardingCompleted: true,
          emailVerified: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Users who completed onboarding in range
      prisma.user.count({
        where: { createdAt: { gte: startDate }, onboardingCompleted: true },
      }),

      // Paid (has an active subscription)
      prisma.landlordSubscription.count({
        where: {
          status: { in: ['active', 'trialing'] },
          tier: { not: 'free' },
          createdAt: { gte: startDate },
        },
      }),

      // Role distribution of new signups
      prisma.user.groupBy({
        by: ['role'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
      }),

      // Page views in range — for funnel path analysis
      prisma.pageView.findMany({
        where: { createdAt: { gte: startDate } },
        select: { sessionId: true, path: true, exitPage: true, timeOnPage: true, scrollDepth: true, bounced: true },
        orderBy: { createdAt: 'asc' },
        take: 5000,
      }),

      // Sessions in range
      prisma.userSession.findMany({
        where: { startTime: { gte: startDate } },
        select: {
          sessionId: true,
          userId: true,
          landingPage: true,
          exitPage: true,
          converted: true,
          device: true,
          utmSource: true,
          utmCampaign: true,
          referrer: true,
          pageCount: true,
          duration: true,
        },
        orderBy: { startTime: 'asc' },
      }),

      // Form interactions — sign-up and onboarding forms
      prisma.formInteraction.findMany({
        where: {
          timestamp: { gte: startDate },
          formId: { in: ['sign-up', 'signin', 'onboarding', 'unknown'] },
        },
        select: { formId: true, action: true, sessionId: true },
      }),

      // AUTH_SIGNUP audit events with email for time-to-convert calc
      prisma.auditLog.findMany({
        where: { action: 'AUTH_SIGNUP', createdAt: { gte: startDate } },
        select: { createdAt: true, metadata: true, userId: true },
        orderBy: { createdAt: 'asc' },
        take: 1000,
      }),
    ]);

    // ── Signup funnel ─────────────────────────────────────────────────────────
    const totalSignups = newUsers.length;
    const verifiedEmail = newUsers.filter(u => u.emailVerified).length;
    const completedOnboarding = onboardedUsers;
    const converted = paidUsers;

    const signupPageViews = new Set(
      pageViews.filter(pv => pv.path.includes('sign-up')).map(pv => pv.sessionId)
    ).size;

    const funnel = [
      { step: 'Visited /sign-up',       count: signupPageViews,    pct: 100 },
      { step: 'Created account',         count: totalSignups,       pct: signupPageViews > 0 ? Math.round((totalSignups / signupPageViews) * 100) : 0 },
      { step: 'Verified email',          count: verifiedEmail,      pct: totalSignups > 0 ? Math.round((verifiedEmail / totalSignups) * 100) : 0 },
      { step: 'Completed onboarding',    count: completedOnboarding,pct: totalSignups > 0 ? Math.round((completedOnboarding / totalSignups) * 100) : 0 },
      { step: 'Started paid plan',       count: converted,          pct: totalSignups > 0 ? Math.round((converted / totalSignups) * 100) : 0 },
    ];

    // ── Role breakdown of signups ─────────────────────────────────────────────
    const roleSignups = roleBreakdown.map(r => ({
      role: r.role ?? 'unknown',
      count: r._count.id,
    })).sort((a, b) => b.count - a.count);

    // ── Onboarding completion rate by role ────────────────────────────────────
    const onboardingByRole: Record<string, { total: number; completed: number }> = {};
    for (const u of newUsers) {
      const role = u.role ?? 'unknown';
      const bucket = onboardingByRole[role] ?? { total: 0, completed: 0 };
      bucket.total++;
      if (u.onboardingCompleted) bucket.completed++;
      onboardingByRole[role] = bucket;
    }
    const onboardingRates = Object.entries(onboardingByRole).map(([role, v]) => ({
      role,
      total: v.total,
      completed: v.completed,
      rate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);

    // ── Traffic source → conversion ───────────────────────────────────────────
    const sourceSignups: Record<string, number> = {};
    const sourceSessions: Record<string, number> = {};
    for (const s of sessions) {
      const src = s.utmSource || (s.referrer ? 'referral' : 'direct');
      sourceSessions[src] = (sourceSessions[src] ?? 0) + 1;
    }
    // Count signups per source by joining audit signups to sessions by userId
    const userIdToSession = new Map(sessions.filter(s => s.userId).map(s => [s.userId!, s]));
    for (const u of newUsers) {
      const sess = userIdToSession.get(u.id);
      const src = sess?.utmSource || (sess?.referrer ? 'referral' : 'direct');
      sourceSignups[src] = (sourceSignups[src] ?? 0) + 1;
    }
    const sourceConversion = Object.entries(sourceSessions).map(([source, visits]) => ({
      source,
      visits,
      signups: sourceSignups[source] ?? 0,
      rate: visits > 0 ? Math.round(((sourceSignups[source] ?? 0) / visits) * 100) : 0,
    })).sort((a, b) => b.signups - a.signups).slice(0, 10);

    // ── Drop-off pages (exit pages with high exit rate, no auth) ─────────────
    const exitCounts: Record<string, number> = {};
    const viewCounts: Record<string, number> = {};
    const timeOnPageMap: Record<string, number[]> = {};
    for (const pv of pageViews) {
      viewCounts[pv.path] = (viewCounts[pv.path] ?? 0) + 1;
      if (pv.exitPage) exitCounts[pv.path] = (exitCounts[pv.path] ?? 0) + 1;
      if (pv.timeOnPage) {
        timeOnPageMap[pv.path] = timeOnPageMap[pv.path] ?? [];
        timeOnPageMap[pv.path].push(pv.timeOnPage);
      }
    }
    const dropOffPages = Object.entries(exitCounts)
      .map(([path, exits]) => {
        const views = viewCounts[path] ?? 1;
        const times = timeOnPageMap[path] ?? [];
        const avgTimeMs = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        return {
          path,
          exits,
          views,
          exitRate: Math.round((exits / views) * 100),
          avgTimeOnPageSec: Math.round(avgTimeMs / 1000),
        };
      })
      .filter(p => p.views >= 5) // skip pages with tiny sample
      .sort((a, b) => b.exitRate - a.exitRate)
      .slice(0, 10);

    // ── Pages visited before signup (last 5 pages in sessions that converted) ─
    const convertedSessionIds = new Set(
      sessions.filter(s => s.converted || s.userId).map(s => s.sessionId)
    );
    const preSignupPaths: Record<string, number> = {};
    for (const pv of pageViews) {
      if (!convertedSessionIds.has(pv.sessionId)) continue;
      preSignupPaths[pv.path] = (preSignupPaths[pv.path] ?? 0) + 1;
    }
    const topPreSignupPages = Object.entries(preSignupPaths)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Device × conversion ───────────────────────────────────────────────────
    const deviceConversion: Record<string, { sessions: number; signups: number }> = {};
    for (const s of sessions) {
      const dev = s.device ?? 'unknown';
      const bucket = deviceConversion[dev] ?? { sessions: 0, signups: 0 };
      bucket.sessions++;
      if (s.converted || s.userId) bucket.signups++;
      deviceConversion[dev] = bucket;
    }
    const deviceBreakdown = Object.entries(deviceConversion).map(([device, v]) => ({
      device,
      sessions: v.sessions,
      signups: v.signups,
      rate: v.sessions > 0 ? Math.round((v.signups / v.sessions) * 100) : 0,
    })).sort((a, b) => b.sessions - a.sessions);

    // ── Daily signups over time ───────────────────────────────────────────────
    const signupsByDay: Record<string, number> = {};
    for (const u of newUsers) {
      const day = u.createdAt.toISOString().split('T')[0];
      signupsByDay[day] = (signupsByDay[day] ?? 0) + 1;
    }
    const signupTimeline = Object.entries(signupsByDay)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, count]) => ({ date, count }));

    // ── Form abandonment on sign-up form ──────────────────────────────────────
    const signupFormStats = { started: 0, completed: 0 };
    for (const fi of formInteractions) {
      if (fi.action === 'focus') signupFormStats.started++;
      if (fi.action === 'submit') signupFormStats.completed++;
    }
    signupFormStats.started = Math.max(signupFormStats.started, signupFormStats.completed);
    const formAbandonRate = signupFormStats.started > 0
      ? Math.round(((signupFormStats.started - signupFormStats.completed) / signupFormStats.started) * 100)
      : 0;

    return NextResponse.json({
      summary: {
        totalSignups,
        verifiedEmail,
        completedOnboarding,
        converted,
        conversionRate: signupPageViews > 0 ? Math.round((totalSignups / signupPageViews) * 100) : 0,
        formAbandonRate,
      },
      funnel,
      roleSignups,
      onboardingRates,
      sourceConversion,
      dropOffPages,
      topPreSignupPages,
      deviceBreakdown,
      signupTimeline,
    });
  } catch (error) {
    console.error('Behavior analytics error:', error);
    return NextResponse.json({ error: 'Failed to load behavior analytics' }, { status: 500 });
  }
}
