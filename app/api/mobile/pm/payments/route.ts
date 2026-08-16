import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });

    const leaseFilter = landlord
      ? { unit: { property: { landlordId: landlord.id } } }
      : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      rentPaidThisMonth,
      rentPaidYtd,
      scheduledRent,
      recentPayments,
    ] = await Promise.all([
      prisma.rentPayment.aggregate({
        _sum: { amount: true },
        where: { status: 'paid', paidAt: { gte: startOfMonth }, lease: leaseFilter },
      }),
      prisma.rentPayment.aggregate({
        _sum: { amount: true },
        where: { status: 'paid', paidAt: { gte: startOfYear }, lease: leaseFilter },
      }),
      prisma.lease.aggregate({
        _sum: { rentAmount: true },
        where: { status: 'active', ...leaseFilter },
      }),
      prisma.rentPayment.findMany({
        where: { lease: leaseFilter },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          amount: true,
          status: true,
          paidAt: true,
          dueDate: true,
          lease: {
            select: {
              tenant: { select: { name: true } },
              unit: {
                select: {
                  name: true,
                  property: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const collectedThisMonth = Number(rentPaidThisMonth._sum?.amount ?? 0);
    const collectedYtd = Number(rentPaidYtd._sum?.amount ?? 0);
    const scheduledMonthly = Number(scheduledRent._sum?.rentAmount ?? 0);
    // Direct payment model: money goes straight to PM's connected bank account.
    // "availableBalance" here represents total rent collected this month for display
    // purposes only — it is NOT sitting in a platform wallet.
    const availableBalance = collectedThisMonth;
    const collectionRate = scheduledMonthly > 0 ? (collectedThisMonth / scheduledMonthly) * 100 : 0;

    return NextResponse.json({
      summary: {
        collectedThisMonth,
        collectedYtd,
        scheduledMonthly,
        availableBalance,
        collectionRate,
      },
      payments: recentPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        dueDate: p.dueDate ? p.dueDate.toISOString() : null,
        tenantName: p.lease?.tenant?.name ?? 'Tenant',
        propertyName: p.lease?.unit?.property?.name ?? 'Property',
        unitName: p.lease?.unit?.name ?? 'Unit',
      })),
    });
  } catch (error) {
    console.error('[mobile/pm/payments]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
