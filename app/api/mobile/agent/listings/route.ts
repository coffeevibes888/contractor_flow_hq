/**
 * GET /api/mobile/agent/listings
 *
 * Agent's properties with filter by status.
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const db = prisma as any;
    const agent = await db.agent.findFirst({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!agent) return NextResponse.json({ listings: [] });

    const where: any = { agentId: agent.id };
    if (status && status !== 'all') where.status = status;

    const listings = await db.agentListing.findMany({
      where,
      orderBy: { listedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        propertyType: true,
        listingType: true,
        status: true,
        address: true,
        price: true,
        soldPrice: true,
        bedrooms: true,
        bathrooms: true,
        sizeSqFt: true,
        images: true,
        isFeatured: true,
        listedAt: true,
        soldAt: true,
        _count: { select: { leads: true, openHouses: true } },
      },
    });

    const counts = {
      all: listings.length,
      active: listings.filter((l: any) => l.status === 'active').length,
      pending: listings.filter((l: any) => l.status === 'pending').length,
      sold: listings.filter((l: any) => l.status === 'sold').length,
      withdrawn: listings.filter((l: any) => l.status === 'withdrawn').length,
    };

    return NextResponse.json({
      listings: listings.map((l: any) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        propertyType: l.propertyType,
        listingType: l.listingType,
        status: l.status,
        address: l.address,
        price: Number(l.price),
        soldPrice: l.soldPrice ? Number(l.soldPrice) : null,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms ? Number(l.bathrooms) : null,
        sizeSqFt: l.sizeSqFt,
        coverImage: l.images?.[0] ?? null,
        imageCount: l.images?.length ?? 0,
        isFeatured: l.isFeatured,
        listedAt: l.listedAt.toISOString(),
        soldAt: l.soldAt?.toISOString() ?? null,
        leadCount: l._count.leads,
        openHouseCount: l._count.openHouses,
      })),
      counts,
    });
  } catch (error) {
    console.error('[mobile/agent/listings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
