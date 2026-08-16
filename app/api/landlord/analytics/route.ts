import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

type RentPaymentRow = {
  amount: unknown;
  dueDate: Date;
  paidAt: Date | null;
  lease: {
    id: string;
    tenantId: string;
    unit: {
      id: string;
      propertyId: string;
    };
  };
};

type MaintenanceTicketRow = {
  id: string;
  unitId: string | null;
  tenantId: string | null;
  title: string;
  priority: string;
  status: string;
  cost: unknown;
  createdAt: Date;
  resolvedAt: Date | null;
};

type PlatformFeeRow = {
  amount: unknown;
  createdAt: Date;
  type: string;
};

type ExpenseRow = {
  amount: unknown;
  category: string;
  incurredAt: Date;
  propertyId: string | null;
};

type MarketBenchmarkRow = {
  averageRent: unknown;
  propertyId: string | null;
  zip: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  effectiveDate: Date;
  source: string | null;
};

type LeaseViolationRow = {
  id: string;
  tenantId: string | null;
  unitId: string | null;
  type: string;
  occurredAt: Date;
  resolvedAt: Date | null;
};

type LeaseRow = {
  status: string;
  startDate: Date;
  endDate: Date | null;
};

type UnitRow = {
  id: string;
  rentAmount: unknown;
  isAvailable: boolean;
  availableFrom: Date | null;
  updatedAt: Date;
  leases: LeaseRow[];
};

type PropertyRow = {
  id: string;
  name: string;
  units: UnitRow[];
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'Landlord ID required' }, { status: 400 });
    }

    // Verify user owns this landlord
    const landlord = await prisma.landlord.findFirst({
      where: {
        id: landlordId,
        ownerUserId: session.user.id,
      },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
    const daysBetween = (a: Date, b: Date) => Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const twelveMonthsAgo = new Date(currentMonthStart);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);

    const prismaAny = prisma as any;

    const properties = (await prismaAny.property.findMany({
      where: { landlordId },
      include: {
        finance: true,
        units: {
          include: {
            leases: true,
          },
        },
      },
    })) as PropertyRow[];

    const [rentPayments, maintenanceTickets, platformFees, expenses, marketBenchmarks, leaseViolations] =
      (await Promise.all([
        prisma.rentPayment.findMany({
          where: {
            paidAt: { gte: twelveMonthsAgo },
            status: 'paid',
            lease: {
              unit: {
                property: { landlordId },
              },
            },
          },
          select: {
            amount: true,
            dueDate: true,
            paidAt: true,
            lease: {
              select: {
                id: true,
                tenantId: true,
                unit: {
                  select: {
                    id: true,
                    propertyId: true,
                  },
                },
              },
            },
          },
        }) as Promise<RentPaymentRow[]>,
        prismaAny.maintenanceTicket.findMany({
          where: {
            createdAt: { gte: twelveMonthsAgo },
            unit: {
              property: { landlordId },
            },
          },
          select: {
            id: true,
            unitId: true,
            tenantId: true,
            title: true,
            priority: true,
            status: true,
            cost: true,
            createdAt: true,
            resolvedAt: true,
          },
        }) as Promise<MaintenanceTicketRow[]>,
        prisma.platformFee.findMany({
          where: {
            landlordId,
            createdAt: { gte: twelveMonthsAgo },
          },
          select: {
            amount: true,
            createdAt: true,
            type: true,
          },
        }) as Promise<PlatformFeeRow[]>,
        prismaAny.expense.findMany({
          where: {
            landlordId,
            incurredAt: { gte: twelveMonthsAgo },
          },
          select: {
            amount: true,
            category: true,
            incurredAt: true,
            propertyId: true,
          },
        }) as Promise<ExpenseRow[]>,
        prismaAny.marketBenchmark.findMany({
          where: {
            landlordId,
          },
          orderBy: { effectiveDate: 'desc' },
          take: 50,
          select: {
            averageRent: true,
            propertyId: true,
            zip: true,
            propertyType: true,
            bedrooms: true,
            effectiveDate: true,
            source: true,
          },
        }) as Promise<MarketBenchmarkRow[]>,
        prismaAny.leaseViolation.findMany({
          where: {
            landlordId,
            occurredAt: { gte: twelveMonthsAgo },
          },
          select: {
            id: true,
            tenantId: true,
            unitId: true,
            type: true,
            occurredAt: true,
            resolvedAt: true,
          },
        }) as Promise<LeaseViolationRow[]>,
      ])) as [
        RentPaymentRow[],
        MaintenanceTicketRow[],
        PlatformFeeRow[],
        ExpenseRow[],
        MarketBenchmarkRow[],
        LeaseViolationRow[],
      ];

    const totalUnits = properties.reduce((sum: number, p: PropertyRow) => sum + p.units.length, 0);
    const occupiedUnits = properties.reduce(
      (sum: number, p: PropertyRow) =>
        sum + p.units.filter((u: UnitRow) => u.leases.some((l: LeaseRow) => l.status === 'active')).length,
      0
    );
    const vacancyRate = totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits) * 100 : 0;

    const rentPossibleThisMonth = properties.reduce(
      (sum: number, p: PropertyRow) => sum + p.units.reduce((s: number, u: UnitRow) => s + Number(u.rentAmount || 0), 0),
      0
    );

    const rentCollectedThisMonth = rentPayments
      .filter((p: RentPaymentRow) => p.paidAt && p.paidAt >= currentMonthStart && p.paidAt < currentMonthEnd)
      .reduce((sum: number, p: RentPaymentRow) => sum + Number(p.amount), 0);

    const vacancyLossThisMonth = Math.max(0, rentPossibleThisMonth - rentCollectedThisMonth);

    const economicOccupancy = rentPossibleThisMonth > 0 ? (rentCollectedThisMonth / rentPossibleThisMonth) * 100 : 0;
    const physicalOccupancy = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const maintenanceCostsThisMonth = maintenanceTickets
      .filter((t: MaintenanceTicketRow) => t.createdAt >= currentMonthStart && t.createdAt < currentMonthEnd)
      .reduce((sum: number, t: MaintenanceTicketRow) => sum + Number(t.cost || 0), 0);

    const platformFeesThisMonth = platformFees
      .filter((f: PlatformFeeRow) => f.createdAt >= currentMonthStart && f.createdAt < currentMonthEnd)
      .reduce((sum: number, f: PlatformFeeRow) => sum + Number(f.amount || 0), 0);

    const otherExpensesThisMonth = expenses
      .filter((e: ExpenseRow) => e.incurredAt >= currentMonthStart && e.incurredAt < currentMonthEnd)
      .reduce((sum: number, e: ExpenseRow) => sum + Number(e.amount || 0), 0);

    const expensesRecordedThisMonth = maintenanceCostsThisMonth > 0 || platformFeesThisMonth > 0 || otherExpensesThisMonth > 0;

    const totalExpensesThisMonth = maintenanceCostsThisMonth + platformFeesThisMonth + otherExpensesThisMonth;
    const netProfitThisMonth = rentCollectedThisMonth - totalExpensesThisMonth;
    const profitMarginThisMonth = rentCollectedThisMonth > 0 ? (netProfitThisMonth / rentCollectedThisMonth) * 100 : 0;

    const averageRent = totalUnits > 0 ? rentPossibleThisMonth / totalUnits : 0;
    const totalTenants = occupiedUnits;

    const monthBuckets = Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(twelveMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      return { start, end, label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}` };
    });

    const monthlyRevenue = monthBuckets.map(({ start, end }) =>
      rentPayments
        .filter((p: RentPaymentRow) => p.paidAt && p.paidAt >= start && p.paidAt < end)
        .reduce((sum: number, p: RentPaymentRow) => sum + Number(p.amount), 0)
    );

    const monthlyExpenses = monthBuckets.map(({ start, end }) => {
      const maint = maintenanceTickets
        .filter((t: MaintenanceTicketRow) => t.createdAt >= start && t.createdAt < end)
        .reduce((sum: number, t: MaintenanceTicketRow) => sum + Number(t.cost || 0), 0);
      const fees = platformFees
        .filter((f: PlatformFeeRow) => f.createdAt >= start && f.createdAt < end)
        .reduce((sum: number, f: PlatformFeeRow) => sum + Number(f.amount || 0), 0);
      const other = expenses
        .filter((e: ExpenseRow) => e.incurredAt >= start && e.incurredAt < end)
        .reduce((sum: number, e: ExpenseRow) => sum + Number(e.amount || 0), 0);
      return maint + fees + other;
    });

    const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);
    const totalExpenses = monthlyExpenses.reduce((a, b) => a + b, 0);
    const netProfit = totalRevenue - totalExpenses;

    const expenseBreakdownThisMonth = (() => {
      const map = new Map<string, number>();
      const add = (k: string, v: number) => map.set(k, (map.get(k) ?? 0) + v);

      add('maintenance', maintenanceCostsThisMonth);
      add('platform_fees', platformFeesThisMonth);

      expenses
        .filter((e: ExpenseRow) => e.incurredAt >= currentMonthStart && e.incurredAt < currentMonthEnd)
        .forEach((e: ExpenseRow) => add(e.category || 'other', Number(e.amount || 0)));

      return Array.from(map.entries())
        .filter(([, v]) => v !== 0)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({ category, amount }));
    })();

    const paymentStats = (() => {
      const paid = rentPayments.filter((p: RentPaymentRow) => p.paidAt);
      const onTime = paid.filter((p: RentPaymentRow) => p.paidAt && p.paidAt <= p.dueDate);
      const late = paid.filter((p: RentPaymentRow) => p.paidAt && p.paidAt > p.dueDate);
      const avgDaysLate =
        late.length === 0
          ? 0
          : late.reduce((sum: number, p: RentPaymentRow) => sum + daysBetween(p.dueDate, p.paidAt as Date), 0) / late.length;

      return {
        paidCount: paid.length,
        onTimePercent: paid.length > 0 ? (onTime.length / paid.length) * 100 : 0,
        latePaymentFrequency: paid.length > 0 ? (late.length / paid.length) * 100 : 0,
        avgDaysLate,
      };
    })();

    const tenantQuality = (() => {
      const paymentsByTenant = new Map<string, { paid: number; onTime: number; lateCount: number; daysLate: number }>();
      for (const p of rentPayments) {
        const tenantId = p.lease?.tenantId;
        if (!tenantId || !p.paidAt) continue;
        const existing = paymentsByTenant.get(tenantId) ?? { paid: 0, onTime: 0, lateCount: 0, daysLate: 0 };
        existing.paid += 1;
        if (p.paidAt <= p.dueDate) {
          existing.onTime += 1;
        } else {
          existing.lateCount += 1;
          existing.daysLate += daysBetween(p.dueDate, p.paidAt);
        }
        paymentsByTenant.set(tenantId, existing);
      }

      const maintenanceByTenant = new Map<string, number>();
      for (const t of maintenanceTickets) {
        if (!t.tenantId) continue;
        maintenanceByTenant.set(t.tenantId, (maintenanceByTenant.get(t.tenantId) ?? 0) + 1);
      }

      const violationsByTenant = new Map<string, number>();
      for (const v of leaseViolations) {
        if (!v.tenantId) continue;
        violationsByTenant.set(v.tenantId, (violationsByTenant.get(v.tenantId) ?? 0) + 1);
      }

      const tenants = Array.from(new Set([...paymentsByTenant.keys(), ...maintenanceByTenant.keys(), ...violationsByTenant.keys()]));
      const worst = tenants
        .map((tenantId) => {
          const p = paymentsByTenant.get(tenantId);
          const paid = p?.paid ?? 0;
          const onTime = p?.onTime ?? 0;
          const onTimePercent = paid > 0 ? (onTime / paid) * 100 : 0;
          const avgDaysLate = p?.lateCount ? p.daysLate / p.lateCount : 0;
          const maintenanceRequests = maintenanceByTenant.get(tenantId) ?? 0;
          const violationCount = violationsByTenant.get(tenantId) ?? 0;
          return {
            tenantId,
            onTimePercent,
            latePaymentFrequency: paid > 0 ? ((p?.lateCount ?? 0) / paid) * 100 : 0,
            avgDaysLate,
            maintenanceRequests,
            violationCount,
          };
        })
        .sort((a, b) => a.onTimePercent - b.onTimePercent)
        .slice(0, 5);

      return {
        onTimePaymentPercent: paymentStats.onTimePercent,
        latePaymentFrequency: paymentStats.latePaymentFrequency,
        avgDaysLate: paymentStats.avgDaysLate,
        worstTenants: worst,
      };
    })();

    const maintenanceAnalytics = (() => {
      const costs = maintenanceTickets
        .map((t: MaintenanceTicketRow) => Number(t.cost || 0))
        .filter((n: number) => n > 0);
      const totalCost = costs.reduce((a: number, b: number) => a + b, 0);
      const costPerUnit = totalUnits > 0 ? totalCost / totalUnits : 0;

      const resolved = maintenanceTickets.filter((t: MaintenanceTicketRow) => t.resolvedAt);
      const avgResolutionTimeDays =
        resolved.length === 0
          ? 0
          : resolved.reduce((sum: number, t: MaintenanceTicketRow) => sum + daysBetween(t.createdAt, t.resolvedAt as Date), 0) / resolved.length;

      const emergencyCount = maintenanceTickets.filter((t: MaintenanceTicketRow) => ['urgent', 'high'].includes(t.priority)).length;
      const nonEmergencyCount = maintenanceTickets.length - emergencyCount;
      const emergencyRatio = maintenanceTickets.length > 0 ? (emergencyCount / maintenanceTickets.length) * 100 : 0;

      const repeatIssues = (() => {
        const keyCount = new Map<string, number>();
        for (const t of maintenanceTickets) {
          if (!t.unitId) continue;
          const key = `${t.unitId}::${t.title}`;
          keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
        }
        return Array.from(keyCount.entries())
          .filter(([, c]) => c >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key, count]) => {
            const [unitId, title] = key.split('::');
            return { unitId, title, count };
          });
      })();

      return {
        totalCost,
        costPerUnit,
        avgResolutionTimeDays,
        emergencyRatio,
        repeatIssues,
      };
    })();

    const vacancyAnalytics = (() => {
      const units: Array<{ unit: UnitRow; propertyId: string }> = properties.flatMap((p: PropertyRow) =>
        p.units.map((u: UnitRow) => ({ unit: u, propertyId: p.id }))
      );
      const currentVacant = units
        .filter(({ unit }: { unit: UnitRow; propertyId: string }) => unit.isAvailable)
        .map(({ unit, propertyId }: { unit: UnitRow; propertyId: string }) => {
          const start = unit.availableFrom ?? unit.updatedAt;
          return {
            unitId: unit.id,
            propertyId,
            daysVacant: daysBetween(start, now),
          };
        });

      const leases: Array<{ unitId: string; propertyId: string; lease: LeaseRow }> = properties.flatMap((p: PropertyRow) =>
        p.units.flatMap((u: UnitRow) => u.leases.map((l: LeaseRow) => ({ unitId: u.id, propertyId: p.id, lease: l })))
      );

      const vacancyGaps: Array<{ unitId: string; propertyId: string; days: number }> = [];
      const leasesByUnit = new Map<string, Array<{ propertyId: string; startDate: Date; endDate: Date | null }>>();

      for (const { unitId, propertyId, lease } of leases) {
        const startDate = lease.startDate;
        const endDate = lease.endDate ?? null;
        const arr = leasesByUnit.get(unitId) ?? [];
        arr.push({ propertyId, startDate, endDate });
        leasesByUnit.set(unitId, arr);
      }

      for (const [unitId, unitLeases] of leasesByUnit.entries()) {
        const sorted = [...unitLeases].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i];
          const b = sorted[i + 1];
          if (!a.endDate) continue;
          const days = daysBetween(a.endDate, b.startDate);
          if (days > 0) vacancyGaps.push({ unitId, propertyId: a.propertyId, days });
        }
      }

      const avgDaysVacant = vacancyGaps.length > 0 ? vacancyGaps.reduce((s, g) => s + g.days, 0) / vacancyGaps.length : 0;

      const vacancyCostYtd = monthBuckets
        .filter(({ start }) => start.getFullYear() === now.getFullYear())
        .reduce((sum: number, { start, end }: { start: Date; end: Date; label: string }) => {
          const possible = rentPossibleThisMonth; // approximation: same monthly potential
          const collected = rentPayments
            .filter((p: RentPaymentRow) => p.paidAt && p.paidAt >= start && p.paidAt < end)
            .reduce((s: number, p: RentPaymentRow) => s + Number(p.amount), 0);
          return sum + Math.max(0, possible - collected);
        }, 0);

      return {
        avgDaysVacant,
        currentVacantUnits: currentVacant.slice(0, 20),
        vacancyCostYtd,
      };
    })();

    const marketComparison = (() => {
      const benchmark = marketBenchmarks[0];
      const marketAvg = benchmark ? Number(benchmark.averageRent) : null;
      const delta = marketAvg != null ? averageRent - marketAvg : null;
      return {
        marketAverageRent: marketAvg,
        delta,
        source: benchmark?.source ?? null,
        effectiveDate: benchmark?.effectiveDate?.toISOString() ?? null,
      };
    })();

    const portfolioHealth = (() => {
      const occScore = clamp01(physicalOccupancy / 100);
      const onTimeScore = clamp01(tenantQuality.onTimePaymentPercent / 100);
      const maintScore = clamp01(1 - Math.min(1, maintenanceTickets.length / Math.max(1, totalUnits * 2))); // heuristic
      const vacancyScore = clamp01(1 - Math.min(1, vacancyAnalytics.avgDaysVacant / 45));

      const revTrend = (() => {
        const last = monthlyRevenue[monthlyRevenue.length - 1] ?? 0;
        const prev = monthlyRevenue[monthlyRevenue.length - 2] ?? 0;
        if (prev <= 0 && last <= 0) return 0.5;
        if (prev <= 0) return 1;
        const change = (last - prev) / prev;
        return clamp01(0.5 + change); // -50% => 0, +50% => 1
      })();

      const score =
        100 *
        (0.3 * occScore +
          0.25 * onTimeScore +
          0.2 * maintScore +
          0.15 * vacancyScore +
          0.1 * revTrend);

      return {
        score: Math.round(score),
        trend: revTrend >= 0.55 ? 'improving' : revTrend <= 0.45 ? 'declining' : 'stable',
      };
    })();

    const propertyPerformance = properties.map((property: PropertyRow) => {
      const units: UnitRow[] = property.units;
      const propertyUnits = units.length;
      const propertyOccupiedUnits = units.filter((u: UnitRow) => u.leases.some((l: LeaseRow) => l.status === 'active')).length;
      const propertyOccupancyRate = propertyUnits > 0 ? (propertyOccupiedUnits / propertyUnits) * 100 : 0;

      const propertyPayments = rentPayments.filter((p: RentPaymentRow) => p.lease.unit.propertyId === property.id);
      const propertyRevenue = propertyPayments.reduce((sum: number, p: RentPaymentRow) => sum + Number(p.amount), 0);

      const propertyMaintenance = maintenanceTickets.filter((t: MaintenanceTicketRow) => {
        if (!t.unitId) return false;
        const unit = units.find((u: UnitRow) => u.id === t.unitId);
        return Boolean(unit);
      });
      const propertyMaintenanceCost = propertyMaintenance.reduce((sum: number, t: MaintenanceTicketRow) => sum + Number(t.cost || 0), 0);

      const propertyExpenseOther = expenses
        .filter((e: ExpenseRow) => e.propertyId === property.id)
        .reduce((sum: number, e: ExpenseRow) => sum + Number(e.amount || 0), 0);

      const propertyFeeTotal =
        platformFees.reduce((sum: number, f: PlatformFeeRow) => sum + Number(f.amount || 0), 0) *
        (propertyUnits / Math.max(1, totalUnits));
      const propertyExpensesTotal = propertyMaintenanceCost + propertyExpenseOther + propertyFeeTotal;

      return {
        id: property.id,
        name: property.name,
        revenue: propertyRevenue,
        expenses: propertyExpensesTotal,
        occupancyRate: propertyOccupancyRate,
        units: propertyUnits,
      };
    });

    const analyticsData = {
      period: {
        monthStart: currentMonthStart.toISOString(),
        monthEnd: currentMonthEnd.toISOString(),
      },

      totalRevenue,
      totalExpenses,
      netProfit,

      monthlyRevenue,
      monthlyExpenses,

      totalProperties: properties.length,
      totalUnits,
      occupiedUnits,
      vacancyRate,
      totalTenants,
      averageRent,

      physicalOccupancy,
      economicOccupancy,
      rentPossibleThisMonth,
      rentCollectedThisMonth,
      vacancyLossThisMonth,

      maintenanceCostsThisMonth,
      platformFeesThisMonth,
      otherExpensesThisMonth,
      totalExpensesThisMonth,
      expensesRecordedThisMonth,
      netProfitThisMonth,
      profitMarginThisMonth,
      expenseBreakdownThisMonth,

      tenantQuality,
      maintenanceAnalytics,
      vacancyAnalytics,
      marketComparison,
      portfolioHealth,

      propertyPerformance,
    };

    return NextResponse.json({ success: true, data: analyticsData });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
