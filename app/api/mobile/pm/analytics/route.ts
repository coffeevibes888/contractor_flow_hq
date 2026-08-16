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

    if (!landlord) return NextResponse.json({ analytics: null });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Properties & units
    const properties = await prisma.property.findMany({
      where: { landlordId: landlord.id },
      include: { units: { select: { id: true, isAvailable: true, rentAmount: true } } },
    });

    const totalUnits = properties.reduce((s, p) => s + p.units.length, 0);
    const occupiedUnits = properties.reduce((s, p) => s + p.units.filter((u) => !u.isAvailable).length, 0);
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const potentialMonthlyRent = properties.reduce(
      (s, p) => s + p.units.reduce((us, u) => us + (u.rentAmount ? Number(u.rentAmount) : 0), 0),
      0
    );

    // Leases
    const activeLeases = await prisma.lease.count({
      where: { status: 'active', unit: { property: { landlordId: landlord.id } } },
    });
    const pendingLeases = await prisma.lease.count({
      where: { status: 'pending_signature', unit: { property: { landlordId: landlord.id } } },
    });

    // Rent payments this month
    const monthPayments = await prisma.rentPayment.findMany({
      where: {
        lease: { unit: { property: { landlordId: landlord.id } } },
        createdAt: { gte: startOfMonth },
      },
      select: { amount: true, status: true },
    });

    const collectedThisMonth = monthPayments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount), 0);
    const lateThisMonth = monthPayments
      .filter((p) => p.status === 'overdue' || p.status === 'failed')
      .reduce((s, p) => s + Number(p.amount), 0);

    // YTD
    const ytdPayments = await prisma.rentPayment.findMany({
      where: {
        lease: { unit: { property: { landlordId: landlord.id } } },
        status: 'paid',
        createdAt: { gte: startOfYear },
      },
      select: { amount: true },
    });
    const collectedYTD = ytdPayments.reduce((s, p) => s + Number(p.amount), 0);

    // Maintenance
    const openTickets = await prisma.maintenanceTicket.count({
      where: { status: { not: 'completed' }, unit: { property: { landlordId: landlord.id } } },
    });
    const urgentTickets = await prisma.maintenanceTicket.count({
      where: { priority: 'urgent', status: { not: 'completed' }, unit: { property: { landlordId: landlord.id } } },
    });

    // Applications
    const pendingApps = await prisma.rentalApplication.count({
      where: { status: 'pending', unit: { property: { landlordId: landlord.id } } },
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mPayments = await prisma.rentPayment.findMany({
        where: {
          lease: { unit: { property: { landlordId: landlord.id } } },
          status: 'paid',
          createdAt: { gte: mStart, lt: mEnd },
        },
        select: { amount: true },
      });
      monthlyTrend.push({
        month: mStart.toLocaleDateString('en-US', { month: 'short' }),
        collected: mPayments.reduce((s, p) => s + Number(p.amount), 0),
      });
    }

    return NextResponse.json({
      analytics: {
        properties: properties.length,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        potentialMonthlyRent,
        activeLeases,
        pendingLeases,
        collectedThisMonth,
        lateThisMonth,
        collectedYTD,
        openTickets,
        urgentTickets,
        pendingApps,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error('[mobile/pm/analytics]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
