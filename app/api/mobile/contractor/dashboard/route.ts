/**
 * GET /api/mobile/contractor/dashboard
 *
 * Mirrors the structure of the PM dashboard endpoint:
 *   - profile        — business identity + tier
 *   - stats          — top-line counts (kept for backward compat with old client)
 *   - summary        — 6 KPI tiles for the property-summary-style strip
 *   - urgentJob      — most-urgent in-progress job (banner)
 *   - revenueTrend   — last 6 months bucketed [{ month, collected, scheduled }]
 *   - financial      — { scheduledThisMonth, paidThisMonth, ytdRevenue, availableBalance }
 *   - pipeline       — counts by status for the pipeline donut chart
 *   - upcomingJobs   — next 5 scheduled
 *   - recentJobs     — last 5
 *   - recentLeads    — last 5
 */
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const CONTRACTOR_ROLES = new Set(['contractor']);

function startOfMonthAt(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short' });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!CONTRACTOR_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = payload.userId;

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        businessName: true,
        displayName: true,
        subscriptionTier: true,
        avgRating: true,
        totalReviews: true,
        completedJobs: true,
        responseRate: true,
        onTimeRate: true,
        profilePhoto: true,
        coverPhoto: true,
      },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const contractorId = contractorProfile.id;
    const now = new Date();
    const startOfMonth = startOfMonthAt(now);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Build a 6-month window: [now-5 months .. now] (inclusive)
    const trendMonths: { date: Date; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMonths.push({ date: d, label: monthLabel(d) });
    }
    const trendStart = trendMonths[0].date;

    const [
      activeJobs,
      pendingLeads,
      monthlyJobs,
      ytdJobs,
      trendJobs,
      pipelineGroups,
      urgentJob,
      upcomingJobs,
      recentJobs,
      recentLeads,
      pendingInvoices,
    ] = await Promise.all([
      prisma.contractorJob.count({
        where: { contractorId, status: { in: ['in_progress', 'scheduled', 'approved'] } },
      }),
      prisma.contractorLeadMatch.count({
        where: { contractorId, status: 'pending' },
      }),
      prisma.contractorJob.findMany({
        where: { contractorId, createdAt: { gte: startOfMonth } },
        select: { actualCost: true, estimatedCost: true, status: true },
      }),
      prisma.contractorJob.findMany({
        where: { contractorId, createdAt: { gte: startOfYear } },
        select: { actualCost: true, status: true },
      }),
      // Trend: every job created in the last 6 months with cost + completion date
      prisma.contractorJob.findMany({
        where: {
          contractorId,
          OR: [
            { createdAt: { gte: trendStart } },
            { actualEndDate: { gte: trendStart } },
          ],
        },
        select: {
          createdAt: true,
          actualEndDate: true,
          status: true,
          estimatedCost: true,
          actualCost: true,
        },
      }),
      prisma.contractorJob.groupBy({
        by: ['status'],
        where: { contractorId },
        _count: { _all: true },
      }),
      // Most-urgent in-progress job — pick the one closest to estimated end
      prisma.contractorJob.findFirst({
        where: {
          contractorId,
          status: { in: ['in_progress', 'scheduled', 'approved'] },
        },
        orderBy: [
          { estimatedEndDate: 'asc' },
          { estimatedStartDate: 'asc' },
        ],
        select: {
          id: true,
          jobNumber: true,
          title: true,
          status: true,
          estimatedStartDate: true,
          estimatedEndDate: true,
          city: true,
          state: true,
          actualCost: true,
          estimatedCost: true,
        },
      }),
      prisma.contractorJob.findMany({
        where: {
          contractorId,
          status: { in: ['scheduled', 'approved'] },
          estimatedStartDate: { gte: now },
        },
        orderBy: { estimatedStartDate: 'asc' },
        take: 5,
        select: {
          id: true,
          jobNumber: true,
          title: true,
          status: true,
          estimatedStartDate: true,
          estimatedEndDate: true,
          city: true,
          state: true,
          estimatedCost: true,
        },
      }),
      prisma.contractorJob.findMany({
        where: { contractorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          jobNumber: true,
          title: true,
          status: true,
          actualCost: true,
          estimatedCost: true,
          createdAt: true,
          city: true,
          state: true,
        },
      }),
      prisma.contractorLeadMatch.findMany({
        where: { contractorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
          lead: {
            select: {
              projectTitle: true,
              projectType: true,
              budgetMin: true,
              budgetMax: true,
              propertyCity: true,
              propertyState: true,
              urgency: true,
            },
          },
        },
      }),
      // Try contractor invoices for available-balance estimate. Wrapped in
      // a try/catch via `as any` because some installs don't have the
      // ContractorInvoice model migrated yet.
      (async () => {
        try {
          const db = prisma as any;
          if (!db.contractorInvoice) return [] as { totalAmount: number }[];
          const rows = await db.contractorInvoice.findMany({
            where: { contractorId, status: 'paid' },
            select: { totalAmount: true },
          });
          return rows;
        } catch {
          return [] as { totalAmount: number }[];
        }
      })(),
    ]);

    // ── Computed stats ───────────────────────────────────────────────────
    const monthlyRevenue = monthlyJobs
      .filter((j) => j.status === 'completed' || j.status === 'paid' || j.status === 'invoiced')
      .reduce((sum, j) => sum + Number(j.actualCost ?? j.estimatedCost ?? 0), 0);

    const ytdRevenue = ytdJobs
      .filter((j) => j.status === 'completed' || j.status === 'paid' || j.status === 'invoiced')
      .reduce((sum, j) => sum + Number(j.actualCost ?? 0), 0);

    const completedThisMonth = monthlyJobs.filter((j) => j.status === 'completed' || j.status === 'paid').length;

    const scheduledThisMonth = monthlyJobs
      .filter((j) => j.status === 'scheduled' || j.status === 'approved' || j.status === 'in_progress')
      .reduce((sum, j) => sum + Number(j.estimatedCost ?? 0), 0);

    const paidThisMonth = monthlyJobs
      .filter((j) => j.status === 'paid')
      .reduce((sum, j) => sum + Number(j.actualCost ?? 0), 0);

    // Available balance (paid - already-cashed-out is not modeled here, so
    // this is a simple "all paid invoices" total).
    const availableBalance = (pendingInvoices as { totalAmount: number }[])
      .reduce((sum, r) => sum + Number(r?.totalAmount ?? 0), 0);

    // ── Trend (6 months bucketed) ────────────────────────────────────────
    const trend = trendMonths.map(({ date, label }) => {
      const monthStart = date;
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      let collected = 0;
      let scheduled = 0;
      for (const j of trendJobs) {
        const completedAt = j.actualEndDate ?? j.createdAt;
        const isCompleted = j.status === 'completed' || j.status === 'paid' || j.status === 'invoiced';
        if (isCompleted && completedAt >= monthStart && completedAt < monthEnd) {
          collected += Number(j.actualCost ?? j.estimatedCost ?? 0);
        }
        if ((j.status === 'scheduled' || j.status === 'approved') && j.createdAt >= monthStart && j.createdAt < monthEnd) {
          scheduled += Number(j.estimatedCost ?? 0);
        }
      }
      return { month: label, collected, scheduled };
    });

    // ── Pipeline counts ──────────────────────────────────────────────────
    const pipelineMap: Record<string, number> = {};
    for (const g of pipelineGroups) {
      pipelineMap[g.status] = g._count._all;
    }
    const pipeline = {
      quoted:      pipelineMap['quoted']      ?? 0,
      approved:    pipelineMap['approved']    ?? 0,
      scheduled:   pipelineMap['scheduled']   ?? 0,
      inProgress:  pipelineMap['in_progress'] ?? 0,
      completed:   pipelineMap['completed']   ?? 0,
      invoiced:    pipelineMap['invoiced']    ?? 0,
      paid:        pipelineMap['paid']        ?? 0,
      canceled:    pipelineMap['canceled']    ?? 0,
    };

    return NextResponse.json({
      profile: {
        ...contractorProfile,
        avgRating: Number(contractorProfile.avgRating ?? 0),
      },

      // ─── Backward-compat block ─────────────────────────────────────────
      stats: {
        activeJobs,
        pendingLeads,
        monthlyRevenue,
        completedThisMonth,
        totalCompleted: contractorProfile.completedJobs ?? 0,
        avgRating: Number(contractorProfile.avgRating ?? 0),
        totalReviews: contractorProfile.totalReviews ?? 0,
      },

      summary: {
        activeJobs,
        completedThisMonth,
        pendingLeads,
        ytdJobs: ytdJobs.length,
        revenueYTD: ytdRevenue,
        avgRating: Number(contractorProfile.avgRating ?? 0),
      },

      urgentJob: urgentJob
        ? {
            id: urgentJob.id,
            jobNumber: urgentJob.jobNumber,
            title: urgentJob.title,
            status: urgentJob.status,
            location: [urgentJob.city, urgentJob.state].filter(Boolean).join(', ') || null,
            estimatedStartDate: urgentJob.estimatedStartDate?.toISOString() ?? null,
            estimatedEndDate: urgentJob.estimatedEndDate?.toISOString() ?? null,
            estimatedCost: urgentJob.estimatedCost ? Number(urgentJob.estimatedCost) : null,
            actualCost: urgentJob.actualCost ? Number(urgentJob.actualCost) : null,
          }
        : null,

      revenueTrend: trend,

      financial: {
        scheduledThisMonth,
        paidThisMonth,
        ytdRevenue,
        availableBalance,
      },

      pipeline,

      upcomingJobs: upcomingJobs.map((j) => ({
        id: j.id,
        jobNumber: j.jobNumber,
        title: j.title,
        status: j.status,
        estimatedStartDate: j.estimatedStartDate?.toISOString() ?? null,
        estimatedEndDate: j.estimatedEndDate?.toISOString() ?? null,
        location: [j.city, j.state].filter(Boolean).join(', ') || null,
        estimatedCost: j.estimatedCost ? Number(j.estimatedCost) : null,
      })),

      recentJobs: recentJobs.map((j) => ({
        id: j.id,
        jobNumber: j.jobNumber,
        title: j.title,
        status: j.status,
        actualCost: j.actualCost ? Number(j.actualCost) : null,
        estimatedCost: j.estimatedCost ? Number(j.estimatedCost) : null,
        createdAt: j.createdAt.toISOString(),
        location: [j.city, j.state].filter(Boolean).join(', ') || null,
      })),

      recentLeads: recentLeads.map((m) => ({
        id: m.id,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        title: m.lead?.projectTitle ?? 'Lead',
        type: m.lead?.projectType ?? null,
        budgetMin: m.lead?.budgetMin ? Number(m.lead.budgetMin) : null,
        budgetMax: m.lead?.budgetMax ? Number(m.lead.budgetMax) : null,
        location: m.lead ? [m.lead.propertyCity, m.lead.propertyState].filter(Boolean).join(', ') || null : null,
        urgency: m.lead?.urgency ?? null,
      })),
    });
  } catch (error) {
    console.error('[mobile/contractor/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
