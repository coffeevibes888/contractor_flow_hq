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

    const userId = payload.userId;

    // Get active lease
    const lease = await prisma.lease.findFirst({
      where: { tenantId: userId, status: 'active' },
      select: {
        id: true,
        rentAmount: true,
        billingDayOfMonth: true,
        unit: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
        },
      },
    });

    // All payments
    const payments = await prisma.rentPayment.findMany({
      where: { tenantId: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        amount: true,
        status: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
        lease: {
          select: {
            unit: { select: { name: true, property: { select: { name: true } } } },
          },
        },
      },
    });

    const pending = payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
    const paid = payments.filter((p) => p.status === 'paid');
    const totalDue = pending.reduce((s, p) => s + Number(p.amount), 0);
    const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0);

    return NextResponse.json({
      lease: lease
        ? {
            id: lease.id,
            rentAmount: Number(lease.rentAmount),
            billingDay: lease.billingDayOfMonth,
            propertyName: lease.unit.property?.name ?? 'Property',
            unitName: lease.unit.name,
          }
        : null,
      summary: {
        totalDue,
        totalPaid,
        pendingCount: pending.length,
        paidCount: paid.length,
      },
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        dueDate: p.dueDate?.toISOString() ?? null,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        propertyName: p.lease?.unit?.property?.name ?? '',
        unitName: p.lease?.unit?.name ?? '',
      })),
    });
  } catch (error) {
    console.error('[mobile/tenant/rent]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
