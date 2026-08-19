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

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Work orders assigned to this contractor from the marketplace
    const workOrders = await prisma.workOrder.findMany({
      where: {
        assignedContractorId: contractorProfile.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        scheduledDate: true,
        createdAt: true,
        property: { select: { name: true, address: true } },
      },
    });

    return NextResponse.json({
      workOrders: workOrders.map((wo) => ({
        id: wo.id,
        title: wo.title,
        description: wo.description?.substring(0, 200) || null,
        status: wo.status,
        priority: wo.priority,
        property: wo.property?.name || wo.property?.address || null,
        scheduledDate: wo.scheduledDate?.toISOString() || null,
        createdAt: wo.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[mobile/contractor/work-orders GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
