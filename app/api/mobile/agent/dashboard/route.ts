/**
 * GET /api/mobile/agent/dashboard
 *
 * Agent home stats: active listings, hot leads, upcoming open houses,
 * pipeline value, recent activity.
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
      select: {
        id: true,
        name: true,
        subdomain: true,
        brokerage: true,
        logoUrl: true,
        themeColor: true,
        totalSales: true,
        totalListings: true,
        yearsExperience: true,
        subscriptionTier: true,
      },
    });
    if (!agent) return NextResponse.json({ profile: null, stats: null });

    const [activeListings, soldYTD, totalLeads, hotLeads, upcomingOpenHouses, recentLeads, recentListings] = await Promise.all([
      db.agentListing.count({ where: { agentId: agent.id, status: 'active' } }),
      db.agentListing.count({
        where: {
          agentId: agent.id,
          status: 'sold',
          soldAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
        },
      }),
      db.agentLead.count({ where: { agentId: agent.id } }),
      db.agentLead.count({
        where: { agentId: agent.id, status: { in: ['qualified', 'showing', 'offer'] } },
      }),
      db.agentOpenHouse.count({
        where: { agentId: agent.id, date: { gte: new Date() } },
      }),
      db.agentLead.findMany({
        where: { agentId: agent.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, type: true, status: true,
          budget: true, createdAt: true,
        },
      }),
      db.agentListing.findMany({
        where: { agentId: agent.id, status: 'active' },
        orderBy: { listedAt: 'desc' },
        take: 5,
        select: {
          id: true, title: true, slug: true, price: true,
          bedrooms: true, bathrooms: true, sizeSqFt: true,
          images: true, status: true,
        },
      }),
    ]);

    // Pipeline value (sum of active listing prices)
    const activeAgg = await db.agentListing.aggregate({
      _sum: { price: true },
      where: { agentId: agent.id, status: 'active' },
    });
    const pipelineValue = Number(activeAgg._sum?.price ?? 0);

    return NextResponse.json({
      profile: {
        id: agent.id,
        name: agent.name,
        subdomain: agent.subdomain,
        brokerage: agent.brokerage ?? null,
        logoUrl: agent.logoUrl ?? null,
        totalSales: agent.totalSales,
        totalListings: agent.totalListings,
        yearsExperience: agent.yearsExperience ?? null,
        tier: agent.subscriptionTier,
      },
      stats: {
        activeListings,
        soldYTD,
        totalLeads,
        hotLeads,
        upcomingOpenHouses,
        pipelineValue,
      },
      recentLeads: recentLeads.map((l: any) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        status: l.status,
        budget: l.budget ? Number(l.budget) : null,
        createdAt: l.createdAt.toISOString(),
      })),
      recentListings: recentListings.map((l: any) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        price: Number(l.price),
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms ? Number(l.bathrooms) : null,
        sizeSqFt: l.sizeSqFt,
        coverImage: l.images?.[0] ?? null,
        status: l.status,
      })),
    });
  } catch (error) {
    console.error('[mobile/agent/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
