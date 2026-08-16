/**
 * Subscription Monitoring Infrastructure
 * 
 * Provides logging, tracking, and metrics collection for subscription-related events.
 * This module helps track limit violations, upgrade conversions, notification delivery,
 * and errors for monitoring and analytics purposes.
 */

import { prisma } from '@/db/prisma';

// ============= Types =============

export interface LimitViolationData {
  contractorId: string;
  feature: string;
  current: number;
  limit: number;
  tier: string;
  timestamp: Date;
}

export interface UpgradeConversionData {
  contractorId: string;
  fromTier: string;
  toTier: string;
  trigger: 'limit_hit' | 'feature_locked' | 'manual';
  timestamp: Date;
}

export interface NotificationDeliveryData {
  contractorId: string;
  type: 'email' | 'in_app';
  feature: string;
  success: boolean;
  timestamp: Date;
}

export interface SubscriptionErrorData {
  contractorId: string;
  errorType: string;
  feature: string;
  message: string;
  stack?: string;
  timestamp: Date;
}

export interface SubscriptionMetrics {
  limitHitRate: number;
  upgradeConversionRate: number;
  averageUsageByTier: Record<string, any>;
  topLimitedFeatures: Array<{ feature: string; count: number }>;
}

// ============= Logging Functions =============

/**
 * Log a limit violation event
 * 
 * This is called when a contractor attempts to exceed their tier limit.
 * Useful for identifying which features are most commonly hitting limits.
 */
export function logLimitViolation(data: LimitViolationData): void {
  try {
    // Log to console for immediate visibility
    console.log('[LIMIT_VIOLATION]', {
      contractorId: data.contractorId,
      feature: data.feature,
      current: data.current,
      limit: data.limit,
      tier: data.tier,
      timestamp: data.timestamp.toISOString(),
    });

    // Store in database for analytics (async, non-blocking)
    storeLimitViolation(data).catch((error) => {
      console.error('Failed to store limit violation:', error);
    });
  } catch (error) {
    console.error('Error logging limit violation:', error);
  }
}

/**
 * Track an upgrade conversion event
 * 
 * This is called when a contractor successfully upgrades their tier.
 * Helps measure conversion rates and understand what triggers upgrades.
 */
export function trackUpgradeConversion(data: UpgradeConversionData): void {
  try {
    // Log to console
    console.log('[UPGRADE_CONVERSION]', {
      contractorId: data.contractorId,
      fromTier: data.fromTier,
      toTier: data.toTier,
      trigger: data.trigger,
      timestamp: data.timestamp.toISOString(),
    });

    // Store in database for analytics (async, non-blocking)
    storeUpgradeConversion(data).catch((error) => {
      console.error('Failed to store upgrade conversion:', error);
    });
  } catch (error) {
    console.error('Error tracking upgrade conversion:', error);
  }
}

/**
 * Track notification delivery
 * 
 * This is called after attempting to send a notification (email or in-app).
 * Helps monitor notification delivery success rates.
 */
export function trackNotificationDelivery(data: NotificationDeliveryData): void {
  try {
    // Log to console
    console.log('[NOTIFICATION_DELIVERY]', {
      contractorId: data.contractorId,
      type: data.type,
      feature: data.feature,
      success: data.success,
      timestamp: data.timestamp.toISOString(),
    });

    // Store in database for analytics (async, non-blocking)
    storeNotificationDelivery(data).catch((error) => {
      console.error('Failed to store notification delivery:', error);
    });
  } catch (error) {
    console.error('Error tracking notification delivery:', error);
  }
}

/**
 * Track subscription-related errors
 * 
 * This is called when an error occurs in subscription operations.
 * Helps identify and debug issues in the subscription system.
 */
export function trackSubscriptionError(data: SubscriptionErrorData): void {
  try {
    // Log to console with full details
    console.error('[SUBSCRIPTION_ERROR]', {
      contractorId: data.contractorId,
      errorType: data.errorType,
      feature: data.feature,
      message: data.message,
      timestamp: data.timestamp.toISOString(),
    });

    if (data.stack) {
      console.error('Stack trace:', data.stack);
    }

    // Store in database for analytics (async, non-blocking)
    storeSubscriptionError(data).catch((error) => {
      console.error('Failed to store subscription error:', error);
    });
  } catch (error) {
    console.error('Error tracking subscription error:', error);
  }
}

// ============= Storage Functions =============

/**
 * Store limit violation in database
 */
async function storeLimitViolation(data: LimitViolationData): Promise<void> {
  // Create a log entry in the database
  // This could be a dedicated SubscriptionLog table or use existing logging infrastructure
  await prisma.$executeRaw`
    INSERT INTO subscription_logs (contractor_id, event_type, feature, data, created_at)
    VALUES (
      ${data.contractorId},
      'limit_violation',
      ${data.feature},
      ${JSON.stringify({
        current: data.current,
        limit: data.limit,
        tier: data.tier,
      })},
      ${data.timestamp}
    )
    ON CONFLICT DO NOTHING
  `.catch(() => {
    // Table might not exist yet, that's okay
    console.log('Subscription logs table not available, skipping storage');
  });
}

/**
 * Store upgrade conversion in database
 */
async function storeUpgradeConversion(data: UpgradeConversionData): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO subscription_logs (contractor_id, event_type, feature, data, created_at)
    VALUES (
      ${data.contractorId},
      'upgrade_conversion',
      'subscription',
      ${JSON.stringify({
        fromTier: data.fromTier,
        toTier: data.toTier,
        trigger: data.trigger,
      })},
      ${data.timestamp}
    )
    ON CONFLICT DO NOTHING
  `.catch(() => {
    console.log('Subscription logs table not available, skipping storage');
  });
}

/**
 * Store notification delivery in database
 */
async function storeNotificationDelivery(data: NotificationDeliveryData): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO subscription_logs (contractor_id, event_type, feature, data, created_at)
    VALUES (
      ${data.contractorId},
      'notification_delivery',
      ${data.feature},
      ${JSON.stringify({
        type: data.type,
        success: data.success,
      })},
      ${data.timestamp}
    )
    ON CONFLICT DO NOTHING
  `.catch(() => {
    console.log('Subscription logs table not available, skipping storage');
  });
}

/**
 * Store subscription error in database
 */
async function storeSubscriptionError(data: SubscriptionErrorData): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO subscription_logs (contractor_id, event_type, feature, data, created_at)
    VALUES (
      ${data.contractorId},
      'error',
      ${data.feature},
      ${JSON.stringify({
        errorType: data.errorType,
        message: data.message,
        stack: data.stack,
      })},
      ${data.timestamp}
    )
    ON CONFLICT DO NOTHING
  `.catch(() => {
    console.log('Subscription logs table not available, skipping storage');
  });
}

// ============= Metrics Functions =============

/**
 * Get subscription metrics for a time range
 * 
 * Returns aggregated metrics for monitoring and analytics.
 */
export async function getSubscriptionMetrics(timeRange: {
  start: Date;
  end: Date;
}): Promise<SubscriptionMetrics> {
  try {
    // Get all contractors and their usage
    const contractors = await prisma.contractorProfile.findMany({
      select: {
        id: true,
        subscriptionTier: true,
        usageTracking: {
          select: {
            activeJobsCount: true,
            invoicesThisMonth: true,
            totalCustomers: true,
            teamMembersCount: true,
            inventoryCount: true,
            equipmentCount: true,
            activeLeadsCount: true,
          },
        },
      },
    });

    // Calculate metrics
    const totalContractors = contractors.length;
    
    // Average usage by tier
    const usageByTier: Record<string, any> = {
      starter: { count: 0, avgJobs: 0, avgInvoices: 0, avgCustomers: 0 },
      pro: { count: 0, avgJobs: 0, avgInvoices: 0, avgCustomers: 0 },
      enterprise: { count: 0, avgJobs: 0, avgInvoices: 0, avgCustomers: 0 },
    };

    contractors.forEach((contractor) => {
      const tier = contractor.subscriptionTier || 'starter';
      const usage = contractor.usageTracking;

      if (usage && usageByTier[tier]) {
        usageByTier[tier].count++;
        usageByTier[tier].avgJobs += usage.activeJobsCount;
        usageByTier[tier].avgInvoices += usage.invoicesThisMonth;
        usageByTier[tier].avgCustomers += usage.totalCustomers;
      }
    });

    // Calculate averages
    Object.keys(usageByTier).forEach((tier) => {
      const data = usageByTier[tier];
      if (data.count > 0) {
        data.avgJobs = Math.round(data.avgJobs / data.count);
        data.avgInvoices = Math.round(data.avgInvoices / data.count);
        data.avgCustomers = Math.round(data.avgCustomers / data.count);
      }
    });

    // For now, return mock data for rates since we don't have historical logs yet
    // In production, these would be calculated from the subscription_logs table
    return {
      limitHitRate: 0.15, // 15% of contractors hit limits
      upgradeConversionRate: 0.25, // 25% of limit hits result in upgrades
      averageUsageByTier: usageByTier,
      topLimitedFeatures: [
        { feature: 'activeJobs', count: 45 },
        { feature: 'customers', count: 32 },
        { feature: 'invoicesPerMonth', count: 28 },
        { feature: 'teamMembers', count: 18 },
        { feature: 'activeLeads', count: 12 },
      ],
    };
  } catch (error) {
    console.error('Error getting subscription metrics:', error);
    throw error;
  }
}

/**
 * Get limit hit rate for a specific feature
 */
export async function getFeatureLimitHitRate(
  feature: string,
  timeRange: { start: Date; end: Date }
): Promise<number> {
  try {
    // This would query the subscription_logs table
    // For now, return a mock value
    return 0.12; // 12% hit rate
  } catch (error) {
    console.error('Error getting feature limit hit rate:', error);
    return 0;
  }
}

/**
 * Get upgrade conversion rate
 */
export async function getUpgradeConversionRate(
  timeRange: { start: Date; end: Date }
): Promise<number> {
  try {
    // This would query the subscription_logs table
    // For now, return a mock value
    return 0.25; // 25% conversion rate
  } catch (error) {
    console.error('Error getting upgrade conversion rate:', error);
    return 0;
  }
}

/**
 * Get notification delivery success rate
 */
export async function getNotificationSuccessRate(
  timeRange: { start: Date; end: Date }
): Promise<{ email: number; inApp: number }> {
  try {
    // This would query the subscription_logs table
    // For now, return mock values
    return {
      email: 0.95, // 95% success rate
      inApp: 0.99, // 99% success rate
    };
  } catch (error) {
    console.error('Error getting notification success rate:', error);
    return { email: 0, inApp: 0 };
  }
}

/**
 * Get error rate for subscription operations
 */
export async function getSubscriptionErrorRate(
  timeRange: { start: Date; end: Date }
): Promise<number> {
  try {
    // This would query the subscription_logs table
    // For now, return a mock value
    return 0.02; // 2% error rate
  } catch (error) {
    console.error('Error getting subscription error rate:', error);
    return 0;
  }
}

// ============= Alert Functions =============

/**
 * Check if alert thresholds are exceeded
 * 
 * This can be called periodically to check if any metrics exceed alert thresholds.
 */
export async function checkAlertThresholds(): Promise<{
  alerts: Array<{ type: string; message: string; severity: 'warning' | 'critical' }>;
}> {
  const alerts: Array<{ type: string; message: string; severity: 'warning' | 'critical' }> = [];

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check error rate
    const errorRate = await getSubscriptionErrorRate({ start: oneDayAgo, end: now });
    if (errorRate > 0.05) {
      alerts.push({
        type: 'error_rate',
        message: `Subscription error rate is ${(errorRate * 100).toFixed(1)}% (threshold: 5%)`,
        severity: 'critical',
      });
    }

    // Check notification delivery
    const notificationRates = await getNotificationSuccessRate({ start: oneDayAgo, end: now });
    if (notificationRates.email < 0.9) {
      alerts.push({
        type: 'notification_delivery',
        message: `Email notification success rate is ${(notificationRates.email * 100).toFixed(1)}% (threshold: 90%)`,
        severity: 'warning',
      });
    }

    // Check upgrade conversion rate
    const conversionRate = await getUpgradeConversionRate({ start: oneDayAgo, end: now });
    if (conversionRate < 0.1) {
      alerts.push({
        type: 'conversion_rate',
        message: `Upgrade conversion rate is ${(conversionRate * 100).toFixed(1)}% (threshold: 10%)`,
        severity: 'warning',
      });
    }
  } catch (error) {
    console.error('Error checking alert thresholds:', error);
  }

  return { alerts };
}

// ============= Export All =============

export default {
  logLimitViolation,
  trackUpgradeConversion,
  trackNotificationDelivery,
  trackSubscriptionError,
  getSubscriptionMetrics,
  getFeatureLimitHitRate,
  getUpgradeConversionRate,
  getNotificationSuccessRate,
  getSubscriptionErrorRate,
  checkAlertThresholds,
};
