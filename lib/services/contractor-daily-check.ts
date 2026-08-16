/**
 * Contractor Daily Check Service
 * 
 * Performs daily usage checks inline with user requests (no cron jobs).
 * Checks if contractor is approaching limits and sends notifications.
 * Uses caching to ensure checks run only once per day per contractor.
 * 
 * TRIGGER: On any contractor API request
 * FREQUENCY: Once per day per contractor
 * EXECUTION: Async, non-blocking
 */

import { prisma } from '@/db/prisma';
import { getCurrentUsage } from './contractor-usage-tracker';
import { 
  createLimitWarningNotification, 
  createLimitReachedNotification,
  getFeatureDisplayName 
} from './contractor-notification-service';
import { sendUsageNotificationEmail } from './contractor-notification-email';
import { CONTRACTOR_TIERS } from '@/lib/config/contractor-subscription-tiers';

// ============= Types =============

interface DailyCheckResult {
  checked: boolean;
  notificationsSent: number;
  errors: string[];
}

// ============= In-Memory Cache =============
// In production, use Redis or similar distributed cache

interface CacheEntry {
  timestamp: number;
  date: string;
}

const dailyCheckCache = new Map<string, CacheEntry>();

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Get cache key for daily check
 */
function getCacheKey(contractorId: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `daily-check:${contractorId}:${today}`;
}

/**
 * Check if daily check already ran today
 */
function hasCheckedToday(contractorId: string): boolean {
  const cacheKey = getCacheKey(contractorId);
  const cached = dailyCheckCache.get(cacheKey);
  
  if (!cached) return false;
  
  const today = new Date().toISOString().split('T')[0];
  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
  
  // Check if it's the same day and not expired
  if (cached.date === today && !isExpired) {
    return true;
  }
  
  // Clean up expired entry
  dailyCheckCache.delete(cacheKey);
  return false;
}

/**
 * Mark daily check as completed
 */
function markCheckedToday(contractorId: string): void {
  const cacheKey = getCacheKey(contractorId);
  const today = new Date().toISOString().split('T')[0];
  
  dailyCheckCache.set(cacheKey, {
    timestamp: Date.now(),
    date: today,
  });
}

/**
 * Clean up old cache entries (run periodically)
 */
function cleanupCache(): void {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  for (const [key, entry] of dailyCheckCache.entries()) {
    const isExpired = now - entry.timestamp > CACHE_TTL;
    const isOldDate = entry.date !== today;
    
    if (isExpired || isOldDate) {
      dailyCheckCache.delete(key);
    }
  }
}

// Clean up cache every hour
setInterval(cleanupCache, 60 * 60 * 1000);

// ============= Daily Check Logic =============

/**
 * Check a single feature's usage and send notifications if needed
 */
async function checkFeatureUsage(
  contractorId: string,
  feature: string,
  currentUsage: number,
  limit: number,
  tier: string,
  contractorInfo: { businessName: string; email: string }
): Promise<boolean> {
  // Skip if unlimited
  if (limit === -1) return false;
  
  const percentage = Math.round((currentUsage / limit) * 100);
  const featureDisplayName = getFeatureDisplayName(feature);
  
  // Check if we've already sent a notification for this threshold recently
  const recentNotification = await prisma.contractorNotification.findFirst({
    where: {
      contractorId,
      feature,
      type: percentage >= 100 ? 'limit_reached' : 'limit_warning',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  });
  
  // Don't send duplicate notifications within 24 hours
  if (recentNotification) {
    return false;
  }
  
  try {
    // Check thresholds: 80%, 90%, 95%, 100%
    if (percentage >= 100) {
      // 100% - Limit reached
      await createLimitReachedNotification(contractorId, feature, limit);
      await sendUsageNotificationEmail(
        contractorInfo.businessName,
        contractorInfo.email,
        feature,
        featureDisplayName,
        currentUsage,
        limit,
        tier
      );
      console.log(`Sent limit reached notification for ${feature} (${percentage}%)`);
      return true;
    } else if (percentage >= 95) {
      // 95% - Critical warning
      await createLimitWarningNotification(contractorId, feature, currentUsage, limit);
      await sendUsageNotificationEmail(
        contractorInfo.businessName,
        contractorInfo.email,
        feature,
        featureDisplayName,
        currentUsage,
        limit,
        tier
      );
      console.log(`Sent critical warning notification for ${feature} (${percentage}%)`);
      return true;
    } else if (percentage >= 90) {
      // 90% - High warning
      await createLimitWarningNotification(contractorId, feature, currentUsage, limit);
      await sendUsageNotificationEmail(
        contractorInfo.businessName,
        contractorInfo.email,
        feature,
        featureDisplayName,
        currentUsage,
        limit,
        tier
      );
      console.log(`Sent high warning notification for ${feature} (${percentage}%)`);
      return true;
    } else if (percentage >= 80) {
      // 80% - Warning
      await createLimitWarningNotification(contractorId, feature, currentUsage, limit);
      await sendUsageNotificationEmail(
        contractorInfo.businessName,
        contractorInfo.email,
        feature,
        featureDisplayName,
        currentUsage,
        limit,
        tier
      );
      console.log(`Sent warning notification for ${feature} (${percentage}%)`);
      return true;
    }
  } catch (error) {
    console.error(`Error sending notification for ${feature}:`, error);
    throw error;
  }
  
  return false;
}

/**
 * Perform daily check for a contractor
 * This is the main function that checks all features
 */
async function performDailyCheck(contractorId: string): Promise<DailyCheckResult> {
  const result: DailyCheckResult = {
    checked: true,
    notificationsSent: 0,
    errors: [],
  };
  
  try {
    // Get contractor info
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        businessName: true,
        email: true,
        subscriptionTier: true,
      },
    });
    
    if (!contractor) {
      result.errors.push('Contractor not found');
      return result;
    }
    
    const tier = contractor.subscriptionTier || 'starter';
    const tierConfig = CONTRACTOR_TIERS[tier as keyof typeof CONTRACTOR_TIERS];
    
    if (!tierConfig) {
      result.errors.push(`Invalid tier: ${tier}`);
      return result;
    }
    
    // Get current usage
    const usage = await getCurrentUsage(contractorId);
    
    // Check each feature with limits
    const featureChecks = [
      { feature: 'activeJobsCount', current: usage.activeJobsCount, limit: tierConfig.limits.activeJobs },
      { feature: 'invoicesThisMonth', current: usage.invoicesThisMonth, limit: tierConfig.limits.invoicesPerMonth },
      { feature: 'totalCustomers', current: usage.totalCustomers, limit: tierConfig.limits.customers },
      { feature: 'teamMembersCount', current: usage.teamMembersCount, limit: tierConfig.limits.teamMembers },
      { feature: 'inventoryCount', current: usage.inventoryCount, limit: tierConfig.limits.inventoryItems },
      { feature: 'equipmentCount', current: usage.equipmentCount, limit: tierConfig.limits.equipmentItems },
      { feature: 'activeLeadsCount', current: usage.activeLeadsCount, limit: tierConfig.limits.activeLeads },
    ];
    
    // Check each feature
    for (const check of featureChecks) {
      try {
        const notificationSent = await checkFeatureUsage(
          contractorId,
          check.feature,
          check.current,
          check.limit,
          tier,
          { businessName: contractor.businessName, email: contractor.email }
        );
        
        if (notificationSent) {
          result.notificationsSent++;
        }
      } catch (error) {
        const errorMsg = `Error checking ${check.feature}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    console.log(`Daily check completed for contractor ${contractorId}: ${result.notificationsSent} notifications sent`);
  } catch (error) {
    const errorMsg = `Error in daily check: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }
  
  return result;
}

// ============= Public API =============

/**
 * Perform daily check if needed (main entry point)
 * 
 * This function should be called on every contractor API request.
 * It checks if the daily check has already run today, and if not,
 * runs it asynchronously without blocking the request.
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise that resolves immediately (doesn't wait for check to complete)
 */
export async function performDailyCheckIfNeeded(contractorId: string): Promise<void> {
  // Check if already ran today
  if (hasCheckedToday(contractorId)) {
    return;
  }
  
  // Mark as checked immediately to prevent duplicate checks
  markCheckedToday(contractorId);
  
  // Run check async (fire and forget)
  performDailyCheck(contractorId).catch(error => {
    console.error(`Error in daily check for contractor ${contractorId}:`, error);
    // Remove from cache so it can be retried
    const cacheKey = getCacheKey(contractorId);
    dailyCheckCache.delete(cacheKey);
  });
}

/**
 * Force a daily check (for testing or manual triggers)
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with check results
 */
export async function forceDailyCheck(contractorId: string): Promise<DailyCheckResult> {
  // Clear cache for this contractor
  const cacheKey = getCacheKey(contractorId);
  dailyCheckCache.delete(cacheKey);
  
  // Run check and wait for results
  const result = await performDailyCheck(contractorId);
  
  // Mark as checked
  markCheckedToday(contractorId);
  
  return result;
}

/**
 * Get cache statistics (for monitoring)
 */
export function getDailyCheckCacheStats(): {
  size: number;
  entries: Array<{ contractorId: string; date: string; age: number }>;
} {
  const entries = Array.from(dailyCheckCache.entries()).map(([key, entry]) => {
    const contractorId = key.split(':')[1];
    return {
      contractorId,
      date: entry.date,
      age: Date.now() - entry.timestamp,
    };
  });
  
  return {
    size: dailyCheckCache.size,
    entries,
  };
}

/**
 * Clear all cache entries (for testing)
 */
export function clearDailyCheckCache(): void {
  dailyCheckCache.clear();
}
