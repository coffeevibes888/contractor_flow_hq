'use server';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '../auth-guard';
import { formatError } from '../utils';

/**
 * Get all contractors with subscription info
 */
export async function getAllContractorsForSuperAdmin() {
  await requireSuperAdmin();
  
  const contractors = await prisma.contractorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      usageTracking: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return contractors.map(c => ({
    id: c.id,
    userId: c.userId,
    userName: c.user?.name || 'Unknown',
    userEmail: c.user?.email || 'Unknown',
    businessName: c.businessName,
    email: c.email,
    phone: c.phone,
    subscriptionTier: c.subscriptionTier || 'starter',
    subscriptionStatus: c.subscriptionStatus || 'active',
    currentPeriodStart: c.currentPeriodStart,
    currentPeriodEnd: c.currentPeriodEnd,
    stripeCustomerId: c.stripeCustomerId,
    stripeSubscriptionId: c.stripeSubscriptionId,
    createdAt: c.createdAt,
    usage: c.usageTracking ? {
      activeJobs: c.usageTracking.activeJobsCount,
      invoices: c.usageTracking.invoicesThisMonth,
      customers: c.usageTracking.totalCustomers,
      teamMembers: c.usageTracking.teamMembersCount,
      inventory: c.usageTracking.inventoryCount,
      equipment: c.usageTracking.equipmentCount,
      leads: c.usageTracking.activeLeadsCount,
    } : null,
  }));
}

/**
 * Update contractor subscription tier
 */
export async function updateContractorSubscription(
  contractorId: string,
  tier: 'starter' | 'pro' | 'enterprise',
  status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active',
  isLifetime: boolean = false
) {
  await requireSuperAdmin();

  if (!contractorId) {
    return { success: false, message: 'Contractor ID is required' };
  }

  const validTiers = ['starter', 'pro', 'enterprise'];
  if (!validTiers.includes(tier)) {
    return { success: false, message: 'Invalid tier' };
  }

  const validStatuses = ['active', 'canceled', 'past_due', 'trialing'];
  if (!validStatuses.includes(status)) {
    return { success: false, message: 'Invalid status' };
  }

  try {
    const updateData: any = {
      subscriptionTier: tier,
      subscriptionStatus: status,
    };

    // If lifetime access, set period end to far future
    if (isLifetime) {
      const now = new Date();
      const farFuture = new Date(now);
      farFuture.setFullYear(farFuture.getFullYear() + 100); // 100 years from now

      updateData.currentPeriodStart = now;
      updateData.currentPeriodEnd = farFuture;
      updateData.subscriptionStatus = 'active';
    } else if (!isLifetime && status === 'active') {
      // Set normal billing period (1 month)
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      updateData.currentPeriodStart = now;
      updateData.currentPeriodEnd = nextMonth;
    }

    await prisma.contractorProfile.update({
      where: { id: contractorId },
      data: updateData,
    });

    const lifetimeText = isLifetime ? ' (Lifetime Access)' : '';
    return { 
      success: true, 
      message: `Contractor subscription updated to ${tier}${lifetimeText}` 
    };
  } catch (error) {
    console.error('Error updating contractor subscription:', error);
    return { success: false, message: formatError(error) };
  }
}

/**
 * Grant lifetime enterprise access to a contractor
 */
export async function grantLifetimeEnterprise(contractorId: string) {
  return updateContractorSubscription(contractorId, 'enterprise', 'active', true);
}

/**
 * Reset contractor usage counters
 */
export async function resetContractorUsage(contractorId: string) {
  await requireSuperAdmin();

  if (!contractorId) {
    return { success: false, message: 'Contractor ID is required' };
  }

  try {
    // Check if usage tracking exists
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      include: { usageTracking: true },
    });

    if (!contractor) {
      return { success: false, message: 'Contractor not found' };
    }

    if (!contractor.usageTracking) {
      // Create usage tracking if it doesn't exist
      await prisma.contractorUsageTracking.create({
        data: {
          contractorId: contractorId,
          activeJobsCount: 0,
          invoicesThisMonth: 0,
          totalCustomers: 0,
          teamMembersCount: 0,
          inventoryCount: 0,
          equipmentCount: 0,
          activeLeadsCount: 0,
          lastResetDate: new Date(),
        },
      });
    } else {
      // Reset existing usage tracking
      await prisma.contractorUsageTracking.update({
        where: { contractorId: contractorId },
        data: {
          activeJobsCount: 0,
          invoicesThisMonth: 0,
          totalCustomers: 0,
          teamMembersCount: 0,
          inventoryCount: 0,
          equipmentCount: 0,
          activeLeadsCount: 0,
          lastResetDate: new Date(),
        },
      });
    }

    return { success: true, message: 'Contractor usage counters reset' };
  } catch (error) {
    console.error('Error resetting contractor usage:', error);
    return { success: false, message: formatError(error) };
  }
}

/**
 * Get contractor subscription statistics
 */
export async function getContractorSubscriptionStats() {
  await requireSuperAdmin();

  try {
    const contractors = await prisma.contractorProfile.findMany({
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    const stats = {
      total: contractors.length,
      byTier: {
        starter: contractors.filter(c => (c.subscriptionTier || 'starter') === 'starter').length,
        pro: contractors.filter(c => c.subscriptionTier === 'pro').length,
        enterprise: contractors.filter(c => c.subscriptionTier === 'enterprise').length,
      },
      byStatus: {
        active: contractors.filter(c => (c.subscriptionStatus || 'active') === 'active').length,
        canceled: contractors.filter(c => c.subscriptionStatus === 'canceled').length,
        past_due: contractors.filter(c => c.subscriptionStatus === 'past_due').length,
        trialing: contractors.filter(c => c.subscriptionStatus === 'trialing').length,
      },
    };

    return { success: true, stats };
  } catch (error) {
    console.error('Error getting contractor subscription stats:', error);
    return { success: false, message: formatError(error), stats: null };
  }
}
