/**
 * GET /api/mobile/pm/dashboard
 *
 * Full PM dashboard payload — designed to mirror the website's landing
 * dashboard so the mobile UI can render every section without extra
 * round trips:
 *
 *   - profile         - business name + landlord id
 *   - stats           - top-row counters (rent / occupancy / tickets / apps)
 *   - summary         - 6 mini stats (PROPERTIES / UNITS / TENANTS / VACANT / RENT YTD / AVAILABLE BALANCE)
 *   - urgentTicket    - the highest-priority open ticket (if any) for the banner
 *   - rentTrend       - last 6 months of scheduled vs collected
 *   - financial       - scheduled / collected this month / collected YTD / available cash-out
 *   - upcomingLeases  - leases ending in the next 90 days
 *
 * Role check accepts every PM-side role: 'admin', 'superAdmin', 'landlord',
 * 'property_manager'. (Earlier versions only allowed admin/superAdmin which
 * blocked legitimate landlord-role users.)
 */
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

    const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = payload.userId;

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: userId },
      select: { id: true, companyName: true, name: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const landlordFilter = landlord ? { landlordId: landlord.id } : {};
    const propertyFilter = landlord ? { property: { landlordId: landlord.id } } : {};
    const leaseFilter = landlord ? { unit: { property: { landlordId: landlord.id } } } : {};

    const [
      totalProperties,
      totalTenants,
      totalUnits,
      occupiedUnits,
      openMaintenanceTickets,
      urgentTickets,
      urgentTicketRow,
      rentPaidThisMonth,
      rentPaidYTD,
      pendingApplications,
      activeLeases,
      upcomingLeases,
      walletBalance,
    ] = await Promise.all([
      prisma.property.count({ where: landlordFilter }),
      prisma.user.count({
        where: {
          role: 'tenant',
          leasesAsTenant: { some: leaseFilter },
        },
      }),
      prisma.unit.count({ where: propertyFilter }),
      prisma.lease.count({
        where: { status: 'active', ...leaseFilter },
      }),
      prisma.maintenanceTicket.count({
        where: {
          status: { in: ['open', 'in_progress'] },
          unit: propertyFilter.property ? { property: propertyFilter.property } : undefined,
        },
      }),
      prisma.maintenanceTicket.count({
        where: {
          status: { in: ['open', 'in_progress'] },
          priority: 'urgent',
          unit: propertyFilter.property ? { property: propertyFilter.property } : undefined,
        },
      }),
      // The most-urgent open ticket for the banner
      prisma.maintenanceTicket.findFirst({
        where: {
          status: { in: ['open', 'in_progress'] },
          unit: propertyFilter.property ? { property: propertyFilter.property } : undefined,
        },
        orderBy: [
          { priority: 'desc' }, // urgent > high > medium > low alphabetically; close enough for ordering
          { createdAt: 'desc' },
        ],
        select: { id: true, title: true, priority: true, createdAt: true },
      }),
      prisma.rentPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          paidAt: { gte: startOfMonth },
          lease: leaseFilter,
        },
      }),
      prisma.rentPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          paidAt: { gte: startOfYear },
          lease: leaseFilter,
        },
      }),
      prisma.rentalApplication.count({
        where: { unit: propertyFilter },
      }),
      // Sum of `rentAmount` on active leases = scheduled monthly rent
      prisma.lease.aggregate({
        _sum: { rentAmount: true },
        where: { status: 'active', ...leaseFilter },
      }),
      // Upcoming lease expirations
      prisma.lease.findMany({
        where: {
          status: 'active',
          endDate: { gte: now, lte: ninetyDaysOut },
          ...leaseFilter,
        },
        orderBy: { endDate: 'asc' },
        take: 5,
        select: {
          id: true,
          endDate: true,
          rentAmount: true,
          unit: {
            select: {
              name: true,
              property: { select: { name: true } },
            },
          },
          tenant: { select: { name: true } },
        },
      }),
      // Available balance — landlord wallet
      landlord
        ? (prisma as any).landlordWallet.findUnique({
            where: { landlordId: landlord.id },
            select: { availableBalance: true },
          })
        : Promise.resolve(null),
    ]);

    // ─── 6-month rent trend ─────────────────────────────────────────────────
    // Pull every paid payment in the last 6 months in one query, bucket on
    // the server, return one entry per month (oldest → newest) for the chart.
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const recentPayments = await prisma.rentPayment.findMany({
      where: {
        status: 'paid',
        paidAt: { gte: sixMonthsAgo },
        lease: leaseFilter,
      },
      select: { amount: true, paidAt: true },
    });

    const buckets: { month: string; collected: number; scheduled: number }[] = [];
    const scheduledPerMonth = Number(activeLeases._sum?.rentAmount || 0);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString(undefined, { month: 'short' });
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const collected = recentPayments
        .filter((p) => p.paidAt && p.paidAt >= d && p.paidAt < next)
        .reduce((s, p) => s + Number(p.amount), 0);
      buckets.push({
        month: monthLabel,
        collected,
        scheduled: scheduledPerMonth,
      });
    }

    const monthlyRentCollected = Number(rentPaidThisMonth._sum?.amount || 0);
    const ytdCollected = Number(rentPaidYTD._sum?.amount || 0);
    const scheduledRent = Number(activeLeases._sum?.rentAmount || 0);
    const availableBalance = walletBalance ? Number(walletBalance.availableBalance || 0) : 0;
    const vacantUnits = Math.max(0, totalUnits - occupiedUnits);

    return NextResponse.json({
      profile: {
        id: landlord?.id ?? null,
        businessName: landlord?.companyName ?? landlord?.name ?? 'Super Admin',
      },
      stats: {
        totalProperties,
        totalTenants,
        totalUnits,
        occupiedUnits,
        openMaintenanceTickets,
        urgentTickets,
        monthlyRentCollected,
        pendingApplications,
      },
      summary: {
        properties: totalProperties,
        totalUnits,
        tenants: totalTenants,
        vacantUnits,
        rentYTD: ytdCollected,
        availableBalance,
      },
      urgentTicket: urgentTicketRow
        ? {
            id: urgentTicketRow.id,
            title: urgentTicketRow.title,
            priority: urgentTicketRow.priority,
          }
        : null,
      rentTrend: buckets,
      financial: {
        scheduledRent,
        collectedThisMonth: monthlyRentCollected,
        collectedYTD: ytdCollected,
        availableToCashOut: availableBalance,
      },
      upcomingLeases: upcomingLeases.map((l) => ({
        id: l.id,
        endDate: l.endDate?.toISOString() ?? null,
        rentAmount: Number(l.rentAmount),
        propertyName: l.unit?.property?.name ?? 'Property',
        unitName: l.unit?.name ?? null,
        tenantName: l.tenant?.name ?? null,
      })),
    });
  } catch (error) {
    console.error('[mobile/pm/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
