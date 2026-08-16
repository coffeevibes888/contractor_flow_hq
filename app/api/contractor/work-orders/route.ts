import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch work orders for contractor
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const openBids = searchParams.get('openBids') === 'true';

    // Get contractor profiles for this user
    const contractors = await prisma.contractor.findMany({
      where: { userId: session.user.id },
      select: { id: true, landlordId: true },
    });

    if (contractors.length === 0) {
      return NextResponse.json({ workOrders: [], openJobs: [] });
    }

    const contractorIds = contractors.map(c => c.id);
    const landlordIds = contractors.map(c => c.landlordId);

    // Get assigned work orders
    const workOrders = await prisma.workOrder.findMany({
      where: {
        contractorId: { in: contractorIds },
        ...(status ? { status } : {}),
      },
      include: {
        property: { select: { id: true, name: true, address: true } },
        unit: { select: { id: true, name: true } },
        landlord: { select: { id: true, name: true, companyName: true } },
        media: { where: { phase: 'before' }, take: 3 },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get open jobs available for bidding (from landlords they work with)
    let openJobs: any[] = [];
    if (openBids) {
      openJobs = await prisma.workOrder.findMany({
        where: {
          landlordId: { in: landlordIds },
          isOpenBid: true,
          status: 'open',
          bidDeadline: { gte: new Date() },
        },
        include: {
          property: { select: { id: true, name: true, address: true } },
          landlord: { select: { id: true, name: true, companyName: true } },
          media: { where: { phase: 'before' }, take: 3 },
          bids: {
            where: { contractorId: { in: contractorIds } },
            select: { id: true, amount: true, status: true },
          },
          _count: { select: { bids: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ workOrders, openJobs });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}
