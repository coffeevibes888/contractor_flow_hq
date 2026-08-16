import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

// GET - Fetch open work orders for contractors to browse
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const specialty = searchParams.get('specialty');
    const minBudget = searchParams.get('minBudget');
    const maxBudget = searchParams.get('maxBudget');
    const priority = searchParams.get('priority');
    const sort = searchParams.get('sort') || 'newest';

    // Build where clause for open work orders
    const where: any = {
      isOpenBid: true,
      status: 'open',
    };

    // Filter by budget range
    if (minBudget) {
      where.budgetMax = { gte: parseFloat(minBudget) };
    }
    if (maxBudget) {
      where.budgetMin = { lte: parseFloat(maxBudget) };
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'budget_high') {
      orderBy = { budgetMax: 'desc' };
    } else if (sort === 'budget_low') {
      orderBy = { budgetMin: 'asc' };
    } else if (sort === 'deadline') {
      orderBy = { bidDeadline: 'asc' };
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      orderBy,
      include: {
        property: {
          select: {
            name: true,
            address: true,
          },
        },
        unit: {
          select: { name: true },
        },
        landlord: {
          select: {
            id: true,
            name: true,
            companyName: true,
            logoUrl: true,
          },
        },
        media: {
          where: { phase: 'before' },
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            type: true,
            caption: true,
          },
          take: 5,
        },
        _count: {
          select: { bids: true, media: true },
        },
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      workOrders: workOrders.map((wo) => ({
        id: wo.id,
        title: wo.title,
        description: wo.description,
        priority: wo.priority,
        budgetMin: wo.budgetMin?.toString() || null,
        budgetMax: wo.budgetMax?.toString() || null,
        bidDeadline: wo.bidDeadline,
        scheduledDate: wo.scheduledDate,
        property: {
          name: wo.property.name,
          city: (wo.property.address as any)?.city || 'Unknown',
          state: (wo.property.address as any)?.state || '',
        },
        unit: wo.unit?.name || null,
        landlord: {
          id: wo.landlord.id,
          name: wo.landlord.companyName || wo.landlord.name,
          logo: wo.landlord.logoUrl,
        },
        media: wo.media,
        mediaCount: wo._count.media,
        bidCount: wo._count.bids,
        createdAt: wo.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching open work orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch open jobs' },
      { status: 500 }
    );
  }
}
