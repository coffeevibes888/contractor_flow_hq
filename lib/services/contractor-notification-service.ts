/**
 * Contractor Notification Service
 * 
 * Handles creating and managing in-app notifications for contractors
 * related to subscription limits, feature locks, and upgrades.
 */

import { prisma } from '@/db/prisma';
import { 
  sendUsageNotificationEmail, 
  sendFeatureLockedNotification,
  sendUpgradeConfirmationEmail 
} from './contractor-notification-email';
import { CONTRACTOR_TIERS } from '@/lib/config/contractor-subscription-tiers';

// ============= Types =============

export type NotificationType = 
  | 'limit_warning'      // 80% of limit reached
  | 'limit_reached'      // 100% of limit reached
  | 'feature_locked'     // Attempted to access locked feature
  | 'upgrade_prompt'     // General upgrade suggestion
  | 'upgrade_success';   // Upgrade completed

export interface CreateNotificationData {
  contractorId: string;
  type: NotificationType;
  feature: string;
  featureDisplayName: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// ============= Feature Display Names =============

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  activeJobs: 'Active Jobs',
  invoicesPerMonth: 'Monthly Invoices',
  customers: 'Customers',
  teamMembers: 'Team Members',
  inventoryItems: 'Inventory Items',
  equipmentItems: 'Equipment Items',
  activeLeads: 'Active Leads',
  teamManagement: 'Team Management',
  crm: 'CRM Features',
  leadManagement: 'Lead Management',
  inventory: 'Inventory Management',
  equipment: 'Equipment Management',
  marketing: 'Marketing Features',
  advancedAnalytics: 'Advanced Analytics',
  apiAccess: 'API Access',
};

/**
 * Get human-readable feature name
 */
export function getFeatureDisplayName(feature: string): string {
  return FEATURE_DISPLAY_NAMES[feature] || feature;
}

// ============= Notification Creation =============

/**
 * Create a notification record in the database
 */
export async function createNotification(data: CreateNotificationData): Promise<void> {
  try {
    await prisma.contractorNotification.create({
      data: {
        contractorId: data.contractorId,
        type: data.type,
        feature: data.feature,
        message: data.message,
        actionUrl: data.actionUrl,
        read: false,
      },
    });

    console.log(`Created ${data.type} notification for contractor ${data.contractorId}`);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a limit warning notification (80% threshold)
 */
export async function createLimitWarningNotification(
  contractorId: string,
  feature: string,
  currentUsage: number,
  limit: number
): Promise<void> {
  const featureDisplayName = getFeatureDisplayName(feature);
  const percentage = Math.round((currentUsage / limit) * 100);

  await createNotification({
    contractorId,
    type: 'limit_warning',
    feature,
    featureDisplayName,
    message: `You're using ${currentUsage} of ${limit} ${featureDisplayName.toLowerCase()} (${percentage}%). Consider upgrading to avoid interruptions.`,
    actionUrl: '/contractor-dashboard/settings/subscription',
    metadata: {
      currentUsage,
      limit,
      percentage,
    },
  });
}

/**
 * Create a limit reached notification (100% threshold)
 */
export async function createLimitReachedNotification(
  contractorId: string,
  feature: string,
  limit: number
): Promise<void> {
  const featureDisplayName = getFeatureDisplayName(feature);

  await createNotification({
    contractorId,
    type: 'limit_reached',
    feature,
    featureDisplayName,
    message: `You've reached your limit of ${limit} ${featureDisplayName.toLowerCase()}. Upgrade now to continue.`,
    actionUrl: '/contractor-dashboard/settings/subscription',
    metadata: {
      limit,
    },
  });
}

/**
 * Create a feature locked notification
 */
export async function createFeatureLockedNotification(
  contractorId: string,
  feature: string,
  requiredTier: string
): Promise<void> {
  const featureDisplayName = getFeatureDisplayName(feature);

  await createNotification({
    contractorId,
    type: 'feature_locked',
    feature,
    featureDisplayName,
    message: `${featureDisplayName} is available on the ${requiredTier} plan. Upgrade to unlock this feature.`,
    actionUrl: '/contractor-dashboard/settings/subscription',
    metadata: {
      requiredTier,
    },
  });
}

/**
 * Create an upgrade success notification
 */
export async function createUpgradeSuccessNotification(
  contractorId: string,
  newTier: string
): Promise<void> {
  await createNotification({
    contractorId,
    type: 'upgrade_success',
    feature: 'subscription',
    featureDisplayName: 'Subscription',
    message: `Welcome to ${newTier}! All your new features are now active.`,
    actionUrl: '/contractor-dashboard',
    metadata: {
      newTier,
    },
  });
}

// ============= Notification Queries =============

/**
 * Get unread notifications for a contractor
 */
export async function getUnreadNotifications(contractorId: string) {
  try {
    return await prisma.contractorNotification.findMany({
      where: {
        contractorId,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw new Error(`Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(contractorId: string): Promise<number> {
  try {
    return await prisma.contractorNotification.count({
      where: {
        contractorId,
        read: false,
      },
    });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await prisma.contractorNotification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mark all notifications as read for a contractor
 */
export async function markAllNotificationsAsRead(contractorId: string): Promise<void> {
  try {
    await prisma.contractorNotification.updateMany({
      where: {
        contractorId,
        read: false,
      },
      data: {
        read: true,
      },
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error(`Failed to mark all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await prisma.contractorNotification.delete({
      where: { id: notificationId },
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw new Error(`Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============= Combined Notification & Email =============

/**
 * Check usage and send notifications if thresholds are crossed
 * This should be called after incrementing usage counters
 */
export async function checkAndNotifyUsageThreshold(
  contractorId: string,
  feature: string,
  currentUsage: number,
  limit: number,
  tier: string
): Promise<void> {
  // Skip if unlimited
  if (limit === -1) return;

  const percentage = Math.round((currentUsage / limit) * 100);
  const featureDisplayName = getFeatureDisplayName(feature);

  // Get contractor info for email
  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    select: {
      businessName: true,
      email: true,
    },
  });

  if (!contractor) {
    console.error(`Contractor not found: ${contractorId}`);
    return;
  }

  // Check if we've already sent a notification for this threshold
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
    console.log(`Skipping duplicate notification for ${feature} at ${percentage}%`);
    return;
  }

  try {
    if (percentage >= 100) {
      // 100% - Limit reached
      await createLimitReachedNotification(contractorId, feature, limit);
      
      // Send email
      await sendUsageNotificationEmail(
        contractor.businessName,
        contractor.email,
        feature,
        featureDisplayName,
        currentUsage,
        limit,
        tier
      );
    } else if (percentage >= 80) {
      // 80% - Warning
      await createLimitWarningNotification(contractorId, feature, currentUsage, limit);
      
      // Send email
      await sendUsageNotificationEmail(
        contractor.businessName,
        contractor.email,
        feature,
        featureDisplayName,
        currentUsage,
        limit,
        tier
      );
    }
  } catch (error) {
    console.error('Error in checkAndNotifyUsageThreshold:', error);
    // Don't throw - we don't want to block the main operation if notifications fail
  }
}

/**
 * Notify about feature lock attempt
 */
export async function notifyFeatureLocked(
  contractorId: string,
  feature: string,
  currentTier: string,
  requiredTier: string
): Promise<void> {
  const featureDisplayName = getFeatureDisplayName(feature);

  // Get contractor info
  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    select: {
      businessName: true,
      email: true,
    },
  });

  if (!contractor) {
    console.error(`Contractor not found: ${contractorId}`);
    return;
  }

  try {
    // Create in-app notification
    await createFeatureLockedNotification(contractorId, feature, requiredTier);

    // Send email (but not too frequently - check for recent notifications)
    const recentNotification = await prisma.contractorNotification.findFirst({
      where: {
        contractorId,
        feature,
        type: 'feature_locked',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    if (!recentNotification) {
      await sendFeatureLockedNotification(
        contractor.businessName,
        contractor.email,
        feature,
        featureDisplayName,
        currentTier,
        requiredTier
      );
    }
  } catch (error) {
    console.error('Error in notifyFeatureLocked:', error);
    // Don't throw - we don't want to block the main operation
  }
}

/**
 * Notify about successful upgrade
 */
export async function notifyUpgradeSuccess(
  contractorId: string,
  previousTier: string,
  newTier: string,
  billingPeriod: 'monthly' | 'annual' = 'monthly'
): Promise<void> {
  // Get contractor info
  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    select: {
      businessName: true,
      email: true,
    },
  });

  if (!contractor) {
    console.error(`Contractor not found: ${contractorId}`);
    return;
  }

  const tierConfig = CONTRACTOR_TIERS[newTier as keyof typeof CONTRACTOR_TIERS];
  const newTierPrice = tierConfig?.price || 0;

  try {
    // Create in-app notification
    await createUpgradeSuccessNotification(contractorId, newTier);

    // Send confirmation email
    await sendUpgradeConfirmationEmail({
      contractorName: contractor.businessName,
      contractorEmail: contractor.email,
      previousTier,
      newTier,
      newTierPrice,
      billingPeriod,
      effectiveDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });
  } catch (error) {
    console.error('Error in notifyUpgradeSuccess:', error);
    // Don't throw - upgrade already succeeded
  }
}
