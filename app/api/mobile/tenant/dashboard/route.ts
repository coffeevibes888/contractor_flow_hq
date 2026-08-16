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
    if (payload.role !== 'tenant') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = payload.userId;

    const [activeLease, pendingPayments, openTickets, recentPayments] = await Promise.all([
      prisma.lease.findFirst({
        where: { tenantId: userId, status: { in: ['active', 'pending_signature'] } },
        include: {
          unit: {
            include: {
              property: {
                select: {
                  name: true,
                  address: true,
                  landlord: { select: { companyName: true, companyPhone: true, companyEmail: true } },
                },
              },
            },
          },
        },
      }),
      prisma.rentPayment.findMany({
        where: { tenantId: userId, status: { in: ['pending', 'overdue'] } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: { id: true, amount: true, dueDate: true, status: true },
      }),
      prisma.maintenanceTicket.findMany({
        where: { tenantId: userId, status: { in: ['open', 'in_progress'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, priority: true, createdAt: true },
      }),
      prisma.rentPayment.findMany({
        where: { tenantId: userId, status: 'paid' },
        orderBy: { paidAt: 'desc' },
        take: 3,
        select: { id: true, amount: true, paidAt: true, status: true },
      }),
    ]);

    const totalDue = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
      lease: activeLease
        ? {
            id: activeLease.id,
            status: activeLease.status,
            rentAmount: Number(activeLease.rentAmount),
            startDate: activeLease.startDate,
            endDate: activeLease.endDate,
            unit: activeLease.unit
              ? {
                  id: activeLease.unit.id,
                  unitNumber: (activeLease.unit as any).unitNumber,
                  property: activeLease.unit.property
                    ? {
                        name: activeLease.unit.property.name,
                        address: activeLease.unit.property.address,
                        landlord: activeLease.unit.property.landlord,
                      }
                    : null,
                }
              : null,
          }
        : null,
      pendingPayments: pendingPayments.map((p) => ({ ...p, amount: Number(p.amount) })),
      openTickets,
      recentPayments: recentPayments.map((p) => ({ ...p, amount: Number(p.amount) })),
      totalDue,
    });
  } catch (error) {
    console.error('[mobile/tenant/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
