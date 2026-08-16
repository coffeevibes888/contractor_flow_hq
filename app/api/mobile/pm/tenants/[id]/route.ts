/**
 * GET /api/mobile/pm/tenants/:id
 *
 * Returns the full tenant card payload used by the mobile tenant detail page:
 *   - identity (name, email, phone, avatar)
 *   - active lease (property, unit, rent, dates, signature status)
 *   - payment summary (on-time count, late count, balance)
 *   - recent rent payments
 *   - documents linked to this tenant
 *
 * Mirrors the bottom screenshot the user shared (Overview / Payments /
 * Recurring / Documents / Invoices tabs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 404 });

    const tenant = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        image: true,
        leasesAsTenant: {
          where: { unit: { property: { landlordId: landlord.id } } },
          include: {
            unit: {
              include: {
                property: { select: { id: true, name: true, address: true } },
              },
            },
            rentPayments: { orderBy: { dueDate: 'desc' }, take: 24 },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant || tenant.leasesAsTenant.length === 0) {
      return NextResponse.json({ error: 'Tenant not found in your portfolio' }, { status: 404 });
    }

    const activeLease =
      tenant.leasesAsTenant.find((l) => l.status === 'active')
      ?? tenant.leasesAsTenant[0];
    const allPayments = tenant.leasesAsTenant.flatMap((l) => l.rentPayments);

    const onTimeCount = allPayments.filter(
      (p) => p.status === 'paid' && p.paidAt && p.dueDate && p.paidAt <= p.dueDate,
    ).length;
    const lateCount = allPayments.filter(
      (p) => p.status === 'paid' && p.paidAt && p.dueDate && p.paidAt > p.dueDate,
    ).length;
    const owedBalance = allPayments
      .filter((p) => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const documents = await prisma.document.findMany({
      where: {
        landlordId: landlord.id,
        relatedToType: 'tenant',
        relatedToId: tenant.id,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        fileUrl: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phoneNumber,
        image: tenant.image,
      },
      lease: activeLease
        ? {
            id: activeLease.id,
            status: activeLease.status,
            rentAmount: Number(activeLease.rentAmount ?? activeLease.unit.rentAmount ?? 0),
            startDate: activeLease.startDate,
            endDate: activeLease.endDate,
            tenantSigned: !!activeLease.tenantSignedAt,
            landlordSigned: !!activeLease.landlordSignedAt,
            isMonthToMonth: !activeLease.endDate,
            unit: {
              id: activeLease.unit.id,
              name: activeLease.unit.name,
              property: activeLease.unit.property,
            },
          }
        : null,
      summary: {
        onTimeCount,
        lateCount,
        balance: owedBalance,
      },
      payments: allPayments.slice(0, 12).map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
      })),
      recurring: [],
      invoices: [],
      documents,
    });
  } catch (e) {
    console.error('tenant detail', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
