/**
 * GET /api/mobile/marketplace/my-bids
 *
 * Contractor's bids inbox. Returns bids submitted across both job kinds
 * (PM WorkOrders and Homeowner WorkOrders), unified into one list ordered
 * by recency.
 *
 * Response: { bids: Array<{
 *   id, kind, status, amount, message, createdAt,
 *   job: { id, title, kind, customerName }
 * }> }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const db = prisma as any;

    const [contractorRecord, contractorProfile] = await Promise.all([
      db.contractor.findFirst({ where: { userId: auth.userId }, select: { id: true } }),
      db.contractorProfile.findUnique({ where: { userId: auth.userId }, select: { id: true } }),
    ]);

    const wobIds = contractorRecord?.id ? [contractorRecord.id] : [];
    const hwobIds = contractorProfile?.id ? [contractorProfile.id] : [];

    const [wobs, hwobs] = await Promise.all([
      wobIds.length
        ? prisma.workOrderBid.findMany({
            where: { contractorId: { in: wobIds } },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              workOrder: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  landlord: { select: { companyName: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      hwobIds.length
        ? db.homeownerWorkOrderBid.findMany({
            where: { contractorId: { in: hwobIds } },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              workOrder: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  homeowner: {
                    select: { user: { select: { name: true } } },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const merged = [
      ...wobs.map((b: any) => ({
        id: b.id,
        kind: 'workorder' as const,
        status: b.status,
        amount: Number(b.amount),
        message: b.message ?? null,
        createdAt: b.createdAt.toISOString(),
        job: {
          id: b.workOrder.id,
          title: b.workOrder.title,
          status: b.workOrder.status,
          customerName: b.workOrder.landlord?.companyName ?? 'Landlord',
        },
      })),
      ...hwobs.map((b: any) => ({
        id: b.id,
        kind: 'homeowner' as const,
        status: b.status,
        amount: Number(b.amount),
        message: b.message ?? null,
        createdAt: b.createdAt.toISOString(),
        job: {
          id: b.workOrder.id,
          title: b.workOrder.title,
          status: b.workOrder.status,
          customerName: b.workOrder.homeowner?.user?.name ?? 'Homeowner',
        },
      })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({ bids: merged });
  } catch (error: any) {
    console.error('[mobile/marketplace/my-bids]', error);
    return NextResponse.json({ error: error?.message || 'Could not load bids' }, { status: 500 });
  }
}
