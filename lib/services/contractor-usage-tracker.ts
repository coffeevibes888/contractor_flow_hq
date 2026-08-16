/**
 * Contractor Usage Tracker Service
 * 
 * Tracks usage metrics for subscription tier enforcement.
 * Automatically creates usage tracking records if they don't exist.
 * Triggers notifications when usage thresholds are crossed.
 */

import { prisma } from '@/db/prisma';
import { checkAndNotifyUsageThreshold } from './contractor-notification-service';
import { CONTRACTOR_TIERS } from '@/lib/config/contractor-subscription-tiers';

// ============= Types =============

export interface UsageData {
  activeJobsCount: number;
  invoicesThisMonth: number;
  totalCustomers: number;
  teamMembersCount: number;
  inventoryCount: number;
  equipmentCount: number;
  activeLeadsCount: number;
  lastResetDate: Date;
}

// ============= Helper Functions =============

/**
 * Get contractor's subscription tier
 */
async function getContractorTier(contractorId: string): Promise<string> {
  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    select: { subscriptionTier: true },
  });
  return contractor?.subscriptionTier || 'starter';
}

/**
 * Get limit for a feature based on tier
 */
function getFeatureLimit(tier: string, feature: string): number {
  const tierConfig = CONTRACTOR_TIERS[tier as keyof typeof CONTRACTOR_TIERS];
  if (!tierConfig) return 0;
  
  const featureMap: Record<string, keyof typeof tierConfig.limits> = {
    activeJobsCount: 'activeJobs',
    invoicesThisMonth: 'invoicesPerMonth',
    totalCustomers: 'customers',
    teamMembersCount: 'teamMembers',
    inventoryCount: 'inventoryItems',
    equipmentCount: 'equipmentItems',
    activeLeadsCount: 'activeLeads',
  };
  
  const limitKey = featureMap[feature];
  return limitKey ? tierConfig.limits[limitKey] : -1;
}

/**
 * Check and notify if usage threshold crossed
 */
async function checkUsageThreshold(
  contractorId: string,
  feature: string,
  currentValue: number
): Promise<void> {
  try {
    const tier = await getContractorTier(contractorId);
    const limit = getFeatureLimit(tier, feature);
    
    // Skip notification check if unlimited
    if (limit === -1) return;
    
    // Trigger notification check (runs async, doesn't block)
    checkAndNotifyUsageThreshold(contractorId, feature, currentValue, limit, tier).catch(error => {
      console.error('Error checking usage threshold:', error);
      // Don't throw - we don't want to block the main operation
    });
  } catch (error) {
    console.error('Error in checkUsageThreshold:', error);
    // Don't throw - we don't want to block the main operation
  }
}

/**
 * Ensure usage tracking record exists for a contractor
 * Creates one if it doesn't exist
 */
async function ensureUsageTrackingExists(contractorId: string): Promise<void> {
  const existing = await prisma.contractorUsageTracking.findUnique({
    where: { contractorId },
  });

  if (!existing) {
    try {
      await prisma.contractorUsageTracking.create({
        data: {
          contractorId,
          activeJobsCount: 0,
          invoicesThisMonth: 0,
          totalCustomers: 0,
          teamMembersCount: 0,
          inventoryCount: 0,
          equipmentCount: 0,
          activeLeadsCount: 0,
        },
      });
      console.log(`Created usage tracking record for contractor: ${contractorId}`);
    } catch (error) {
      // Handle race condition - another process may have created it
      if ((error as any).code === 'P2002') {
        console.log(`Usage tracking record already exists for contractor: ${contractorId}`);
      } else {
        throw error;
      }
    }
  }
}

// ============= Increment Functions =============

/**
 * Increment the active jobs count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function incrementJobCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    const updated = await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        activeJobsCount: {
          increment: 1,
        },
      },
      select: {
        activeJobsCount: true,
      },
    });

    console.log(`Incremented job count for contractor: ${contractorId}`);
    
    // Check if notification should be sent
    await checkUsageThreshold(contractorId, 'activeJobsCount', updated.activeJobsCount);
  } catch (error) {
    console.error(`Error incrementing job count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to increment job count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Increment the invoice count for a contractor (monthly counter)
 * 
 * @param contractorId - The contractor's ID
 */
export async function incrementInvoiceCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    const updated = await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        invoicesThisMonth: {
          increment: 1,
        },
      },
      select: {
        invoicesThisMonth: true,
      },
    });

    console.log(`Incremented invoice count for contractor: ${contractorId}`);
    
    // Check if notification should be sent
    await checkUsageThreshold(contractorId, 'invoicesThisMonth', updated.invoicesThisMonth);
  } catch (error) {
    console.error(`Error incrementing invoice count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to increment invoice count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Increment the customer count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function incrementCustomerCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    const updated = await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        totalCustomers: {
          increment: 1,
        },
      },
      select: {
        totalCustomers: true,
      },
    });

    console.log(`Incremented customer count for contractor: ${contractorId}`);
    
    // Check if notification should be sent
    await checkUsageThreshold(contractorId, 'totalCustomers', updated.totalCustomers);
  } catch (error) {
    console.error(`Error incrementing customer count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to increment customer count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Increment the team member count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function incrementTeamMemberCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    const updated = await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        teamMembersCount: {
          increment: 1,
        },
      },
      select: {
        teamMembersCount: true,
      },
    });

    console.log(`Incremented team member count for contractor: ${contractorId}`);
    
    // Check if notification should be sent
    await checkUsageThreshold(contractorId, 'teamMembersCount', updated.teamMembersCount);
  } catch (error) {
    console.error(`Error incrementing team member count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to increment team member count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Increment the inventory count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function incrementInventoryCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    const updated = await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        inventoryCount: {
          increment: 1,
        },
      },
      select: {
        inventoryCount: true,
      },
    });

    console.log(`Incremented inventory count for contractor: ${contractorId}`);
    
    // Check if notification should be sent
    await checkUsageThreshold(contractorId, 'inventoryCount', updated.inventoryCount);
  } catch (error) {
    console.error(`Error incrementing inventory count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to increment inventory count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Increment the equipment count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function incrementEquipmentCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    const updated = await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        equipmentCount: {
          increment: 1,
        },
      },
      select: {
        equipmentCount: true,
      },
    });

    console.log(`Incremented equipment count for contractor: ${contractorId}`);
    
    // Check if notification should be sent
    await checkUsageThreshold(contractorId, 'equipmentCount', updated.equipmentCount);
  } catch (error) {
    console.error(`Error incrementing equipment count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to increment equipment count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Increment the active leads count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function incrementLeadCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    const updated = await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        activeLeadsCount: {
          increment: 1,
        },
      },
      select: {
        activeLeadsCount: true,
      },
    });

    console.log(`Incremented lead count for contractor: ${contractorId}`);
    
    // Check if notification should be sent
    await checkUsageThreshold(contractorId, 'activeLeadsCount', updated.activeLeadsCount);
  } catch (error) {
    console.error(`Error incrementing lead count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to increment lead count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============= Decrement Functions =============

/**
 * Decrement the active jobs count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function decrementJobCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        activeJobsCount: {
          decrement: 1,
        },
      },
    });

    console.log(`Decremented job count for contractor: ${contractorId}`);
  } catch (error) {
    console.error(`Error decrementing job count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to decrement job count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrement the customer count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function decrementCustomerCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        totalCustomers: {
          decrement: 1,
        },
      },
    });

    console.log(`Decremented customer count for contractor: ${contractorId}`);
  } catch (error) {
    console.error(`Error decrementing customer count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to decrement customer count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrement the team member count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function decrementTeamMemberCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        teamMembersCount: {
          decrement: 1,
        },
      },
    });

    console.log(`Decremented team member count for contractor: ${contractorId}`);
  } catch (error) {
    console.error(`Error decrementing team member count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to decrement team member count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrement the inventory count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function decrementInventoryCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        inventoryCount: {
          decrement: 1,
        },
      },
    });

    console.log(`Decremented inventory count for contractor: ${contractorId}`);
  } catch (error) {
    console.error(`Error decrementing inventory count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to decrement inventory count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrement the equipment count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function decrementEquipmentCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        equipmentCount: {
          decrement: 1,
        },
      },
    });

    console.log(`Decremented equipment count for contractor: ${contractorId}`);
  } catch (error) {
    console.error(`Error decrementing equipment count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to decrement equipment count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrement the active leads count for a contractor
 * 
 * @param contractorId - The contractor's ID
 */
export async function decrementLeadCount(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        activeLeadsCount: {
          decrement: 1,
        },
      },
    });

    console.log(`Decremented lead count for contractor: ${contractorId}`);
  } catch (error) {
    console.error(`Error decrementing lead count for contractor ${contractorId}:`, error);
    throw new Error(`Failed to decrement lead count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============= Query Functions =============

/**
 * Get current usage data for a contractor
 * 
 * @param contractorId - The contractor's ID
 * @returns UsageData object with all usage metrics
 */
export async function getCurrentUsage(contractorId: string): Promise<UsageData> {
  try {
    await ensureUsageTrackingExists(contractorId);

    const usage = await prisma.contractorUsageTracking.findUnique({
      where: { contractorId },
      select: {
        activeJobsCount: true,
        invoicesThisMonth: true,
        totalCustomers: true,
        teamMembersCount: true,
        inventoryCount: true,
        equipmentCount: true,
        activeLeadsCount: true,
        lastResetDate: true,
      },
    });

    if (!usage) {
      throw new Error(`Usage tracking record not found for contractor: ${contractorId}`);
    }

    return usage;
  } catch (error) {
    console.error(`Error getting current usage for contractor ${contractorId}:`, error);
    throw new Error(`Failed to get current usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============= Reset Functions =============

/**
 * Reset monthly counters for a contractor
 * This should be called on the billing anniversary date
 * 
 * @param contractorId - The contractor's ID
 */
export async function resetMonthlyCounters(contractorId: string): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        invoicesThisMonth: 0,
        lastResetDate: new Date(),
      },
    });

    console.log(`Reset monthly counters for contractor: ${contractorId}`);
  } catch (error) {
    console.error(`Error resetting monthly counters for contractor ${contractorId}:`, error);
    throw new Error(`Failed to reset monthly counters: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch reset monthly counters for multiple contractors
 * Useful for scheduled jobs
 * 
 * @param contractorIds - Array of contractor IDs
 * @returns Number of contractors successfully reset
 */
export async function batchResetMonthlyCounters(contractorIds: string[]): Promise<number> {
  let successCount = 0;

  for (const contractorId of contractorIds) {
    try {
      await resetMonthlyCounters(contractorId);
      successCount++;
    } catch (error) {
      console.error(`Failed to reset counters for contractor ${contractorId}:`, error);
      // Continue with other contractors
    }
  }

  console.log(`Batch reset completed: ${successCount}/${contractorIds.length} contractors`);
  return successCount;
}

/**
 * Set a specific counter value (useful for corrections or migrations)
 * 
 * @param contractorId - The contractor's ID
 * @param counter - The counter to set
 * @param value - The value to set
 */
export async function setCounterValue(
  contractorId: string,
  counter: keyof Omit<UsageData, 'lastResetDate'>,
  value: number
): Promise<void> {
  try {
    await ensureUsageTrackingExists(contractorId);

    await prisma.contractorUsageTracking.update({
      where: { contractorId },
      data: {
        [counter]: value,
      },
    });

    console.log(`Set ${counter} to ${value} for contractor: ${contractorId}`);
  } catch (error) {
    console.error(`Error setting counter value for contractor ${contractorId}:`, error);
    throw new Error(`Failed to set counter value: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
