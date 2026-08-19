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

    try {
      const db = prisma as any;
      if (!db.contractorPurchaseOrder) return NextResponse.json({ purchaseOrders: [] });

      const orders = await db.contractorPurchaseOrder.findMany({
        where: { contractorId: contractorProfile.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({
        purchaseOrders: orders.map((o: any) => ({
          id: o.id,
          poNumber: o.poNumber || null,
          vendor: o.vendorName || o.vendor || null,
          status: o.status || 'draft',
          total: o.total ? Number(o.total) : o.amount ? Number(o.amount) : 0,
          createdAt: o.createdAt?.toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({ purchaseOrders: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/purchase-orders GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
