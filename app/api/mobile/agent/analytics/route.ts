/**
 * GET /api/mobile/agent/analytics
 *
 * Pipeline value, sales YTD, conversion rate, lead funnel.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const db = prisma as any;
    const agent = await db.agent.findFirst({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!agent) return NextResponse.json({ analytics: null });

    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const [activeListings, soldListings, allLeads, closedLeads, totalLeadsAllTime] = await Promise.all([
      db.agentListing.findMany({
        where: { agentId: agent.id, status: 'active' },
        select: { price: true },
      }),
      db.agentListing.findMany({
        where: { agentId: agent.id, status: 'sold', soldAt: { gte: yearStart } },
        select: { price: true, soldPrice: true, listedAt: true, soldAt: true },
      }),
      db.agentLead.findMany({
        where: { agentId: agent.id, createdAt: { gte: yearStart } },
        select: { status: true, createdAt: true },
      }),
      db.agentLead.count({
        where: { agentId: agent.id, status: 'closed', createdAt: { gte: yearStart } },
      }),
      db.agentLead.count({ where: { agentId: agent.id } }),
    ]);

    const pipelineValue = activeListings.reduce((s: number, l: any) => s + Number(l.price ?? 0), 0);
    const soldVolumeYTD = soldListings.reduce(
      (s: number, l: any) => s + Number(l.soldPrice ?? l.price ?? 0),
      0,
    );
    const avgDaysOnMarket = soldListings.length > 0
      ? Math.round(
          soldListings
            .filter((l: any) => l.listedAt && l.soldAt)
            .reduce((sum: number, l: any) => sum + (+new Date(l.soldAt) - +new Date(l.listedAt)) / 86_400_000, 0)
          / soldListings.length,
        )
      : 0;
    const conversionRate = allLeads.length > 0
      ? Math.round((closedLeads / allLeads.length) * 100)
      : 0;

    // Lead funnel by status
    const funnel: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      showing: 0,
      offer: 0,
      closed: 0,
      lost: 0,
    };
    allLeads.forEach((l: any) => {
      if (funnel[l.status] !== undefined) funnel[l.status] += 1;
    });

    // Monthly sold volume (last 6 months)
    const monthlyVolume: { month: string; volume: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const sold = soldListings.filter(
        (l: any) => l.soldAt && new Date(l.soldAt) >= mStart && new Date(l.soldAt) < mEnd,
      );
      monthlyVolume.push({
        month: mStart.toLocaleDateString('en-US', { month: 'short' }),
        volume: sold.reduce((s: number, l: any) => s + Number(l.soldPrice ?? l.price ?? 0), 0),
      });
    }

    return NextResponse.json({
      analytics: {
        pipelineValue,
        soldVolumeYTD,
        soldCountYTD: soldListings.length,
        activeListingCount: activeListings.length,
        totalLeads: totalLeadsAllTime,
        leadsThisYear: allLeads.length,
        conversionRate,
        avgDaysOnMarket,
        funnel,
        monthlyVolume,
      },
    });
  } catch (error) {
    console.error('[mobile/agent/analytics]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
