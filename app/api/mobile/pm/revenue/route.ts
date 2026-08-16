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

    if (!landlord) return NextResponse.json({ revenue: null, payments: [] });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // All payments this month with details
    const payments = await prisma.rentPayment.findMany({
      where: {
        lease: { unit: { property: { landlordId: landlord.id } } },
        createdAt: { gte: startOfMonth },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        dueDate: true,
        lease: {
          select: {
            rentAmount: true,
            tenant: { select: { name: true, email: true } },
            unit: { select: { name: true, property: { select: { name: true } } } },
          },
        },
      },
    });

    // YTD totals
    const ytdPayments = await prisma.rentPayment.findMany({
      where: {
        lease: { unit: { property: { landlordId: landlord.id } } },
        status: 'paid',
        createdAt: { gte: startOfYear },
      },
      select: { amount: true },
    });

    const collectedThisMonth = payments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount), 0);
    const lateThisMonth = payments
      .filter((p) => p.status === 'overdue' || p.status === 'failed')
      .reduce((s, p) => s + Number(p.amount), 0);
    const pendingThisMonth = payments
      .filter((p) => p.status === 'pending')
      .reduce((s, p) => s + Number(p.amount), 0);
    const collectedYTD = ytdPayments.reduce((s, p) => s + Number(p.amount), 0);

    return NextResponse.json({
      revenue: {
        collectedThisMonth,
        lateThisMonth,
        pendingThisMonth,
        collectedYTD,
        paidCount: payments.filter((p) => p.status === 'paid').length,
        lateCount: payments.filter((p) => p.status === 'overdue' || p.status === 'failed').length,
        pendingCount: payments.filter((p) => p.status === 'pending').length,
      },
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        rentAmount: p.lease.rentAmount ? Number(p.lease.rentAmount) : null,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
        dueDate: p.dueDate?.toISOString() ?? null,
        tenantName: p.lease.tenant?.name ?? 'Unknown',
        tenantEmail: p.lease.tenant?.email ?? '',
        propertyName: p.lease.unit.property?.name ?? 'Property',
        unitName: p.lease.unit.name,
      })),
    });
  } catch (error) {
    console.error('[mobile/pm/revenue]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
