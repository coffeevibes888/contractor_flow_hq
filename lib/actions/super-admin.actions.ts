'use server';

import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
import { requireSuperAdmin } from '../auth-guard';
import Stripe from 'stripe';

// Helper to normalize tier names (map legacy tiers to current ones)
function normalizeTierName(tier: string | null | undefined): string {
  if (!tier || tier === 'free') return 'starter';
  if (tier === 'growth' || tier === 'professional') return 'pro';
  return tier;
}

type RentAggregate = {
  day: number;
  week: number;
  month: number;
  year: number;
};

type PlatformRevenue = {
  convenienceFees: RentAggregate;
  cashoutFees: RentAggregate;
  subscriptionRevenue: RentAggregate;
  total: RentAggregate;
};

export async function getSuperAdminInsights() {
  try {
    await requireSuperAdmin();
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday as start

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const startOfYear = new Date(startOfDay.getFullYear(), 0, 1);

    // Calculate 7 days ago and 30 days ago for recent signups
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(startOfDay);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      landlords,
      properties,
      units,
      leases,
      propertyManagersCount,
      rentPayments,
      platformFees,
      subscriptionEvents,
      // New queries for enhanced dashboard
      recentPayouts,
      maintenanceTickets,
      activeSubscriptions,
      newUsersThisWeek,
      newUsersThisMonth,
      newLandlordsThisWeek,
      newLandlordsThisMonth,
      failedPaymentsCount,
      // Contractor data
      contractorCount,
      contractorTierBreakdown,
      contractorJobCount,
      newContractorsThisWeek,
      newContractorsThisMonth,
    ] = await Promise.all([
      prisma.landlord.findMany({
        where: {
          ownerUserId: { not: null }, // Only include landlords with valid user accounts
        },
        include: {
          properties: {
            include: {
              units: {
                include: {
                  leases: {
                    include: {
                      rentPayments: true,
                    },
                  },
                },
              },
            },
          },
          subscription: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.property.findMany({
        include: { landlord: true },
      }),
      prisma.unit.findMany(),
      prisma.lease.findMany({
        where: { status: 'active' },
      }),
      prisma.user.count({ where: { role: 'property_manager' } }),
      prisma.rentPayment.findMany({
        where: {
          status: {
            in: ['paid', 'processing', 'pending', 'overdue', 'failed'],
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.platformFee.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.subscriptionEvent.findMany({
        where: {
          eventType: 'renewed',
        },
        orderBy: { createdAt: 'asc' },
      }),
      // Recent payouts across all landlords (last 20)
      prisma.payout.findMany({
        orderBy: { initiatedAt: 'desc' },
        take: 20,
        include: {
          landlord: {
            select: { name: true, subdomain: true },
          },
        },
      }),
      // Maintenance tickets
      prisma.maintenanceTicket.findMany({
        select: {
          id: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),
      // Active subscriptions for MRR
      prisma.landlordSubscription.findMany({
        where: {
          status: { in: ['active', 'trialing'] },
          tier: { not: 'free' },
        },
        select: {
          tier: true,
          stripePriceId: true,
        },
      }),
      // New users this week
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      // New users this month
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      // New landlords this week
      prisma.landlord.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      // New landlords this month
      prisma.landlord.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      // Failed payments in last 30 days
      prisma.rentPayment.count({
        where: {
          status: 'failed',
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),
      // Total contractors with profiles
      prisma.contractorProfile.count(),
      // Contractor subscription tier breakdown
      prisma.contractorProfile.groupBy({
        by: ['subscriptionTier'],
        _count: { id: true },
      }),
      // Total contractor jobs ever processed
      prisma.contractorJob.count(),
      // New contractors this week
      prisma.contractorProfile.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      // New contractors this month
      prisma.contractorProfile.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const landlordsCount = landlords.length;
    const propertiesCount = properties.length;
    const unitsCount = units.length;
    const activeLeases = leases.length;

    const landlordsPortfolio = landlords.map((landlord) => {
      const propertyCount = landlord.properties.length;
      let unitCount = 0;
      let tenantCount = 0;
      let rentCollected = 0;

      for (const property of landlord.properties) {
        unitCount += property.units.length;
        for (const unit of property.units) {
          tenantCount += unit.leases.length;
          for (const lease of unit.leases) {
            for (const payment of lease.rentPayments) {
              rentCollected += Number(payment.amount || 0);
            }
          }
        }
      }

      return {
        id: landlord.id,
        name: landlord.name,
        subdomain: landlord.subdomain,
        properties: propertyCount,
        units: unitCount,
        tenants: tenantCount,
        rentCollected,
        subscriptionTier: normalizeTierName(landlord.subscription?.tier || landlord.subscriptionTier || 'starter'),
      };
    });

    const rentTotals: RentAggregate = { day: 0, week: 0, month: 0, year: 0 };
    const revenueTimelineMap = new Map<string, number>(); // key: YYYY-MM
    let revenueMTD = 0;
    let revenuePrevMonth = 0;
    let expectedThisMonth = 0;
    let paidThisMonth = 0;
    let overdueCount = 0;
    const delinquencyBuckets: Record<'0-30' | '31-60' | '61+', number> = {
      '0-30': 0,
      '31-60': 0,
      '61+': 0,
    };

    const convenienceFees: RentAggregate = { day: 0, week: 0, month: 0, year: 0 };

    for (const payment of rentPayments) {
      const paidAt = payment.paidAt || payment.createdAt;
      const value = Number(payment.amount || 0);
      const fee = Number(payment.convenienceFee || 0);

      if (paidAt) {
        if (paidAt >= startOfDay) {
          rentTotals.day += value;
          convenienceFees.day += fee;
        }
        if (paidAt >= startOfWeek) {
          rentTotals.week += value;
          convenienceFees.week += fee;
        }
        if (paidAt >= startOfMonth) {
          rentTotals.month += value;
          convenienceFees.month += fee;
        }
        if (paidAt >= startOfYear) {
          rentTotals.year += value;
          convenienceFees.year += fee;
        }

        const key = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`;
        revenueTimelineMap.set(key, (revenueTimelineMap.get(key) || 0) + value);

        const isCurrentMonth =
          paidAt.getFullYear() === startOfMonth.getFullYear() &&
          paidAt.getMonth() === startOfMonth.getMonth();
        const prevMonthDate = new Date(startOfMonth);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const isPrevMonth =
          paidAt.getFullYear() === prevMonthDate.getFullYear() &&
          paidAt.getMonth() === prevMonthDate.getMonth();

        if (isCurrentMonth && payment.status === 'paid') {
          paidThisMonth += value;
          revenueMTD += value;
        } else if (isPrevMonth && payment.status === 'paid') {
          revenuePrevMonth += value;
        }
      }

      if (payment.dueDate) {
        const due = payment.dueDate;
        const isDueThisMonth =
          due.getFullYear() === startOfMonth.getFullYear() &&
          due.getMonth() === startOfMonth.getMonth();
        if (isDueThisMonth) {
          expectedThisMonth += value;
        }
      }

      if (payment.dueDate && payment.status !== 'paid') {
        const nowDate = new Date();
        const diffDays = Math.floor(
          (nowDate.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays > 0) {
          overdueCount += 1;
          if (diffDays <= 30) delinquencyBuckets['0-30'] += 1;
          else if (diffDays <= 60) delinquencyBuckets['31-60'] += 1;
          else delinquencyBuckets['61+'] += 1;
        }
      }
    }

    const cashoutFees: RentAggregate = { day: 0, week: 0, month: 0, year: 0 };
    for (const fee of platformFees) {
      const createdAt = fee.createdAt;
      const value = Number(fee.amount || 0);

      if (createdAt >= startOfDay) cashoutFees.day += value;
      if (createdAt >= startOfWeek) cashoutFees.week += value;
      if (createdAt >= startOfMonth) cashoutFees.month += value;
      if (createdAt >= startOfYear) cashoutFees.year += value;
    }

    const subscriptionRevenue: RentAggregate = { day: 0, week: 0, month: 0, year: 0 };
    for (const event of subscriptionEvents) {
      const createdAt = event.createdAt;
      const value = Number(event.amount || 0);

      if (createdAt >= startOfDay) subscriptionRevenue.day += value;
      if (createdAt >= startOfWeek) subscriptionRevenue.week += value;
      if (createdAt >= startOfMonth) subscriptionRevenue.month += value;
      if (createdAt >= startOfYear) subscriptionRevenue.year += value;
    }

    const platformRevenue: PlatformRevenue = {
      convenienceFees,
      cashoutFees,
      subscriptionRevenue,
      total: {
        day: convenienceFees.day + cashoutFees.day + subscriptionRevenue.day,
        week: convenienceFees.week + cashoutFees.week + subscriptionRevenue.week,
        month: convenienceFees.month + cashoutFees.month + subscriptionRevenue.month,
        year: convenienceFees.year + cashoutFees.year + subscriptionRevenue.year,
      },
    };

    const revenueTimeline = Array.from(revenueTimelineMap.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, total]) => ({ month, total }));

    const stateDistribution: Record<string, number> = {};
    const cityDistribution: Record<string, number> = {};

    for (const property of properties) {
      const address = (property.address as Record<string, any>) || {};
      const state = (address.state || address.stateCode || '').toString().trim();
      const city = (address.city || '').toString().trim();

      if (state) stateDistribution[state] = (stateDistribution[state] || 0) + 1;
      if (city) cityDistribution[city] = (cityDistribution[city] || 0) + 1;
    }

    const landlordCohorts = landlords.reduce<Record<string, number>>((acc, landlord) => {
      const created = landlord.createdAt;
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const subscriptionBreakdown = {
      starter: landlords.filter(l => {
        const tier = (l.subscription?.tier || l.subscriptionTier || 'starter');
        return tier === 'starter' || tier === 'free'; // Map legacy 'free' to starter
      }).length,
      pro: landlords.filter(l => {
        const tier = (l.subscription?.tier || l.subscriptionTier);
        return tier === 'pro' || tier === 'growth' || tier === 'professional'; // Include legacy tiers
      }).length,
      enterprise: landlords.filter(l => (l.subscription?.tier || l.subscriptionTier) === 'enterprise').length,
    };

    const collectionRate =
      expectedThisMonth > 0 ? Math.min(1, paidThisMonth / expectedThisMonth) : 0;

    const arpuPerLandlord = landlordsCount > 0 ? paidThisMonth / landlordsCount : 0;

    const lateRate =
      rentPayments.length > 0 ? overdueCount / rentPayments.length : 0;

    const funnel = {
      signedUpLandlords: landlordsCount,
      onboardedProperties: propertiesCount,
      activeLeases,
      propertyManagers: propertyManagersCount,
    };

    const landlordCohortsArr = Object.entries(landlordCohorts)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, count]) => ({ month, count }));

    const locations = {
      states: Object.entries(stateDistribution)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      cities: Object.entries(cityDistribution)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };

    // Stripe Connect onboarding status breakdown
    const stripeConnectStatus = {
      completed: landlords.filter(l => l.stripeOnboardingStatus === 'active').length,
      pendingVerification: landlords.filter(l => l.stripeOnboardingStatus === 'pending_verification').length,
      pending: landlords.filter(l => l.stripeOnboardingStatus === 'pending').length,
      notStarted: landlords.filter(l => !l.stripeOnboardingStatus || l.stripeOnboardingStatus === null).length,
    };

    // Maintenance ticket summary
    const maintenanceSummary = {
      open: maintenanceTickets.filter(t => t.status === 'open').length,
      inProgress: maintenanceTickets.filter(t => t.status === 'in_progress').length,
      resolved: maintenanceTickets.filter(t => t.status === 'resolved').length,
      closed: maintenanceTickets.filter(t => t.status === 'closed').length,
      urgent: maintenanceTickets.filter(t => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length,
      high: maintenanceTickets.filter(t => t.priority === 'high' && t.status !== 'closed' && t.status !== 'resolved').length,
      total: maintenanceTickets.length,
    };

    // MRR calculation based on tier pricing
    // Pricing: pro = $29/mo, enterprise = $99/mo (adjust as needed)
    const tierPricing: Record<string, number> = {
      free: 0,
      pro: 29,
      growth: 49, // legacy
      professional: 79, // legacy
      enterprise: 99,
    };
    const mrr = activeSubscriptions.reduce((sum, sub) => {
      return sum + (tierPricing[sub.tier] || 0);
    }, 0);

    // Recent signups
    const recentSignups = {
      usersThisWeek: newUsersThisWeek,
      usersThisMonth: newUsersThisMonth,
      landlordsThisWeek: newLandlordsThisWeek,
      landlordsThisMonth: newLandlordsThisMonth,
    };

    // System health
    const systemHealth = {
      failedPaymentsLast30Days: failedPaymentsCount,
      overduePayments: overdueCount,
    };

    // Format recent payouts for display
    const recentPayoutsFormatted = recentPayouts.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      initiatedAt: p.initiatedAt.toISOString(),
      paidAt: p.paidAt?.toISOString() || null,
      landlordName: p.landlord?.name || 'Unknown',
      landlordSubdomain: p.landlord?.subdomain || '',
    }));

    // Build contractor subscription breakdown from groupBy result
    const contractorSubscriptionBreakdown = {
      starter: 0,
      pro: 0,
      enterprise: 0,
    };
    for (const row of contractorTierBreakdown) {
      const tier = normalizeTierName(row.subscriptionTier);
      if (tier === 'starter') contractorSubscriptionBreakdown.starter += row._count.id;
      else if (tier === 'pro') contractorSubscriptionBreakdown.pro += row._count.id;
      else if (tier === 'enterprise') contractorSubscriptionBreakdown.enterprise += row._count.id;
    }

    const contractorStats = {
      total: contractorCount,
      subscriptionBreakdown: contractorSubscriptionBreakdown,
      totalJobs: contractorJobCount,
      newThisWeek: newContractorsThisWeek,
      newThisMonth: newContractorsThisMonth,
    };

    return {
      landlordsCount,
      propertyManagersCount,
      propertiesCount,
      unitsCount,
      activeLeases,
      tenantsCount: leases.length,
      landlordsPortfolio,
      rentTotals,
      revenueMTD,
      revenuePrevMonth,
      arpuPerLandlord,
      collectionRate,
      expectedThisMonth,
      paidThisMonth,
      delinquencyBuckets,
      landlordCohorts: landlordCohortsArr,
      funnel,
      lateRate,
      revenueTimeline,
      locations,
      platformRevenue,
      subscriptionBreakdown,
      // New enhanced data
      stripeConnectStatus,
      maintenanceSummary,
      mrr,
      recentSignups,
      systemHealth,
      recentPayouts: recentPayoutsFormatted,
      contractorStats,
    };
  } catch (error) {
    console.error('Failed to load super admin insights', formatError(error));
    return {
      landlordsCount: 0,
      propertyManagersCount: 0,
      propertiesCount: 0,
      unitsCount: 0,
      activeLeases: 0,
      tenantsCount: 0,
      landlordsPortfolio: [],
      rentTotals: { day: 0, week: 0, month: 0, year: 0 },
      revenueMTD: 0,
      revenuePrevMonth: 0,
      arpuPerLandlord: 0,
      collectionRate: 0,
      expectedThisMonth: 0,
      paidThisMonth: 0,
      delinquencyBuckets: { '0-30': 0, '31-60': 0, '61+': 0 },
      landlordCohorts: [],
      funnel: { signedUpLandlords: 0, onboardedProperties: 0, activeLeases: 0, propertyManagers: 0 },
      lateRate: 0,
      revenueTimeline: [],
      locations: { states: [], cities: [] },
      platformRevenue: {
        convenienceFees: { day: 0, week: 0, month: 0, year: 0 },
        cashoutFees: { day: 0, week: 0, month: 0, year: 0 },
        subscriptionRevenue: { day: 0, week: 0, month: 0, year: 0 },
        total: { day: 0, week: 0, month: 0, year: 0 },
      },
      subscriptionBreakdown: { starter: 0, pro: 0, enterprise: 0 },
      // New enhanced data defaults
      stripeConnectStatus: { completed: 0, pendingVerification: 0, pending: 0, notStarted: 0 },
      maintenanceSummary: { open: 0, inProgress: 0, resolved: 0, closed: 0, urgent: 0, high: 0, total: 0 },
      mrr: 0,
      recentSignups: { usersThisWeek: 0, usersThisMonth: 0, landlordsThisWeek: 0, landlordsThisMonth: 0 },
      systemHealth: { failedPaymentsLast30Days: 0, overduePayments: 0 },
      recentPayouts: [],
      contractorStats: {
        total: 0,
        subscriptionBreakdown: { starter: 0, pro: 0, enterprise: 0 },
        totalJobs: 0,
        newThisWeek: 0,
        newThisMonth: 0,
      },
    };
  }
}

export async function listUsersForSuperAdmin(limit = 100) {
  await requireSuperAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  
  // Add isBlocked field if it exists (may not exist before migration)
  return users.map(u => ({ ...u, isBlocked: (u as any).isBlocked || false }));
}

export async function listLandlordsForSuperAdmin() {
  await requireSuperAdmin();
  return prisma.landlord.findMany({
    where: {
      ownerUserId: { not: null }, // Only include landlords with valid user accounts
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      ownerUserId: true,
    },
  });
}

export async function deleteUserBySuperAdmin(userId: string) {
  await requireSuperAdmin();
  if (!userId) throw new Error('User id required');

  // Fetch the user to understand their role and related data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      email: true,
      stripeCustomerId: true,
    },
  });

  if (!user) throw new Error('User not found');

  // --- 1. Clean up Landlord (onDelete: SetNull, so must delete manually) ---
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: userId },
    select: { id: true, stripeSubscriptionId: true, stripeCustomerId: true },
  });

  if (landlord) {
    // Cancel Stripe subscription if active
    if (landlord.stripeSubscriptionId) {
      try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
          const stripeClient = new Stripe(stripeSecretKey);
          await stripeClient.subscriptions.cancel(landlord.stripeSubscriptionId).catch(() => {});
        }
      } catch {
        // Non-fatal: Stripe cleanup is best-effort
      }
    }
    await prisma.landlord.delete({ where: { id: landlord.id } });
  }

  // --- 2. Clean up ContractorProfile (onDelete: Cascade handles this, but cancel Stripe first) ---
  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true, stripeSubscriptionId: true, stripeCustomerId: true },
  });

  if (contractorProfile?.stripeSubscriptionId) {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (stripeSecretKey) {
        const stripeClient = new Stripe(stripeSecretKey);
        await stripeClient.subscriptions.cancel(contractorProfile.stripeSubscriptionId).catch(() => {});
      }
    } catch {
      // Non-fatal
    }
  }

  // --- 3. Clean up Agent profile Stripe subscription (onDelete: Cascade handles the record) ---
  const agent = await prisma.agent.findUnique({
    where: { userId },
    select: { id: true, stripeSubscriptionId: true },
  });

  if (agent?.stripeSubscriptionId) {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (stripeSecretKey) {
        const stripeClient = new Stripe(stripeSecretKey);
        await stripeClient.subscriptions.cancel(agent.stripeSubscriptionId).catch(() => {});
      }
    } catch {
      // Non-fatal
    }
  }

  // --- 4. Unlink Contractor directory entries (onDelete: SetNull leaves orphans) ---
  // These are landlord-directory contractor records that reference this user.
  // Setting userId to null is what the schema does, but we should also clear the link cleanly.
  await prisma.contractor.updateMany({
    where: { userId },
    data: { userId: null },
  });

  // --- 5. Clean up threads where this user is the ONLY participant ---
  // Find threads where this user participates
  const userThreads = await prisma.threadParticipant.findMany({
    where: { userId },
    select: { threadId: true },
  });

  if (userThreads.length > 0) {
    const threadIds = userThreads.map(t => t.threadId);

    // Find threads that will have zero participants after this user is removed
    for (const threadId of threadIds) {
      const otherParticipants = await prisma.threadParticipant.count({
        where: {
          threadId,
          userId: { not: userId },
        },
      });

      if (otherParticipants === 0) {
        // This thread will be empty — delete it and its messages
        await prisma.thread.delete({ where: { id: threadId } });
      }
    }
  }

  // --- 6. Delete the user (cascades to ContractorProfile, Agent, Homeowner, etc.) ---
  await prisma.user.delete({ where: { id: userId } });

  return { success: true };
}

export async function clearDemoRevenueData() {
  await requireSuperAdmin();
  // Delete only obviously demo/test orders (safe guard).
  const result = await prisma.order.deleteMany({
    where: {
      OR: [
        { paymentMethod: 'demo' },
        { paymentMethod: 'test' },
      ],
    },
  });
  return { success: true, deleted: result.count };
}

// Clean up orphaned landlords (those without valid user accounts)
export async function cleanupOrphanedLandlords() {
  await requireSuperAdmin();
  
  // Find landlords with null ownerUserId
  const orphanedLandlords = await prisma.landlord.findMany({
    where: { ownerUserId: null },
    select: { id: true, name: true },
  });
  
  if (orphanedLandlords.length === 0) {
    return { success: true, deleted: 0, message: 'No orphaned landlords found' };
  }
  
  // Delete each orphaned landlord (cascades to properties, units, etc.)
  for (const landlord of orphanedLandlords) {
    await prisma.landlord.delete({ where: { id: landlord.id } });
  }
  
  return { 
    success: true, 
    deleted: orphanedLandlords.length,
    message: `Deleted ${orphanedLandlords.length} orphaned landlord(s)`,
  };
}


// Property Management for Super Admin
export async function getAllPropertiesForSuperAdmin() {
  await requireSuperAdmin();
  
  const properties = await prisma.property.findMany({
    where: {
      landlord: {
        ownerUserId: { not: null }, // Only include properties from landlords with valid user accounts
      },
    },
    include: {
      landlord: {
        select: {
          id: true,
          name: true,
          companyName: true,
          ownerUserId: true,
        },
      },
      units: {
        select: {
          id: true,
          name: true,
          isAvailable: true,
          rentAmount: true,
        },
      },
      _count: {
        select: {
          units: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return properties.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    status: p.status || 'active',
    isPublished: p.isPublished,
    addressVerified: p.addressVerified,
    address: p.address,
    landlordId: p.landlordId,
    landlordName: p.landlord?.companyName || p.landlord?.name || 'Unknown',
    unitCount: p._count.units,
    availableUnits: p.units.filter(u => u.isAvailable).length,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function updatePropertyStatus(propertyId: string, status: 'active' | 'paused' | 'suspended' | 'deleted') {
  await requireSuperAdmin();
  
  if (!propertyId) {
    return { success: false, message: 'Property ID is required' };
  }

  const validStatuses = ['active', 'paused', 'suspended', 'deleted'];
  if (!validStatuses.includes(status)) {
    return { success: false, message: 'Invalid status' };
  }

  try {
    await prisma.property.update({
      where: { id: propertyId },
      data: { status },
    });

    return { success: true, message: `Property ${status === 'active' ? 'activated' : status}` };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deletePropertyPermanently(propertyId: string) {
  await requireSuperAdmin();
  
  if (!propertyId) {
    return { success: false, message: 'Property ID is required' };
  }

  try {
    // Check for uncredited payments that would be lost
    const uncreditedPayments = await prisma.rentPayment.findMany({
      where: {
        lease: {
          unit: { propertyId },
        },
        OR: [
          { status: 'pending' },
          { status: 'processing' },
          { status: 'paid', walletCredited: false },
        ],
      },
      select: { amount: true },
    });

    if (uncreditedPayments.length > 0) {
      const totalAmount = uncreditedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      return { 
        success: false, 
        message: `Cannot delete property. There are ${uncreditedPayments.length} payment(s) totaling $${totalAmount.toFixed(2)} that haven't been credited to the landlord's wallet yet. Wait for payments to process or use soft delete instead.` 
      };
    }

    // Check if property has active leases
    const activeLeases = await prisma.lease.count({
      where: {
        unit: { propertyId },
        status: 'active',
      },
    });

    if (activeLeases > 0) {
      return { 
        success: false, 
        message: `Cannot delete property with ${activeLeases} active lease(s). Suspend it instead.` 
      };
    }

    // No active leases and no uncredited payments — safe to hard delete.
    // Cascade will handle: Units → Leases → RentPayments, CashPayments,
    // MaintenanceTickets, WorkOrders, Inspections, Expenses, etc.
    await prisma.property.delete({
      where: { id: propertyId },
    });

    return { success: true, message: 'Property and all related data permanently deleted.' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
