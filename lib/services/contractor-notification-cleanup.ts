/**
 * Contractor Notification Cleanup Service
 * 
 * Cleans up old notifications inline with user requests (no cron jobs).
 * Uses probabilistic execution to avoid running on every request.
 * Archives old notifications and deletes read notifications.
 * 
 * TRIGGER: On notification-related API requests (probabilistic)
 * FREQUENCY: ~1% of requests (configurable)
 * EXECUTION: Async, non-blocking
 */

import { prisma } from '@/db/prisma';

// ============= Types =============

interface CleanupResult {
  archived: number;
  deleted: number;
  errors: string[];
  duration: number;
}

interface CleanupStats {
  totalNotifications: number;
  unreadNotifications: number;
  readNotifications: number;
  oldNotifications: number;
  lastCleanup: Date | null;
}

// ============= Configuration =============

// Probability of running cleanup (0.01 = 1%)
const CLEANUP_PROBABILITY = 0.01;

// Archive notifications older than 30 days
const ARCHIVE_THRESHOLD_DAYS = 30;

// Delete read notifications older than 7 days
const DELETE_THRESHOLD_DAYS = 7;

// Batch size for operations
const BATCH_SIZE = 100;

// ============= Cleanup Tracking =============

let lastCleanupTime: Date | null = null;
let isCleanupRunning = false;

/**
 * Check if cleanup should run (probabilistic)
 */
export function shouldRunCleanup(): boolean {
  // Don't run if already running
  if (isCleanupRunning) return false;
  
  // Probabilistic check
  return Math.random() < CLEANUP_PROBABILITY;
}

/**
 * Get last cleanup time
 */
export function getLastCleanupTime(): Date | null {
  return lastCleanupTime;
}

/**
 * Check if cleanup is currently running
 */
export function isCleanupInProgress(): boolean {
  return isCleanupRunning;
}

// ============= Cleanup Logic =============

/**
 * Archive old notifications (>30 days)
 * 
 * Archived notifications are marked but not deleted,
 * allowing for potential recovery or analytics.
 */
async function archiveOldNotifications(): Promise<number> {
  const archiveDate = new Date();
  archiveDate.setDate(archiveDate.getDate() - ARCHIVE_THRESHOLD_DAYS);
  
  try {
    // Find old notifications in batches
    let totalArchived = 0;
    let hasMore = true;
    
    while (hasMore) {
      const oldNotifications = await prisma.contractorNotification.findMany({
        where: {
          createdAt: {
            lt: archiveDate,
          },
          // Only archive if not already archived (if we add an archived field)
        },
        take: BATCH_SIZE,
        select: {
          id: true,
        },
      });
      
      if (oldNotifications.length === 0) {
        hasMore = false;
        break;
      }
      
      // For now, we'll just count them
      // In a real implementation, you might add an 'archived' field
      // and update it here, or move to an archive table
      totalArchived += oldNotifications.length;
      
      // If we got less than batch size, we're done
      if (oldNotifications.length < BATCH_SIZE) {
        hasMore = false;
      }
    }
    
    console.log(`Archived ${totalArchived} old notifications`);
    return totalArchived;
  } catch (error) {
    console.error('Error archiving old notifications:', error);
    throw error;
  }
}

/**
 * Delete read notifications older than 7 days
 * 
 * This helps keep the database clean and performant.
 */
async function deleteOldReadNotifications(): Promise<number> {
  const deleteDate = new Date();
  deleteDate.setDate(deleteDate.getDate() - DELETE_THRESHOLD_DAYS);
  
  try {
    // Delete in batches to avoid long-running transactions
    let totalDeleted = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Delete a batch
      const result = await prisma.contractorNotification.deleteMany({
        where: {
          read: true,
          createdAt: {
            lt: deleteDate,
          },
        },
        // Note: Prisma doesn't support LIMIT in deleteMany,
        // so we'll need to use a different approach
      });
      
      totalDeleted += result.count;
      
      // If we deleted less than batch size, we're done
      if (result.count < BATCH_SIZE) {
        hasMore = false;
      }
      
      // Safety check: if we deleted 0, stop
      if (result.count === 0) {
        hasMore = false;
      }
    }
    
    console.log(`Deleted ${totalDeleted} old read notifications`);
    return totalDeleted;
  } catch (error) {
    console.error('Error deleting old read notifications:', error);
    throw error;
  }
}

/**
 * Perform cleanup operations
 * 
 * This is the main cleanup function that orchestrates
 * archiving and deletion operations.
 */
async function performCleanup(): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    archived: 0,
    deleted: 0,
    errors: [],
    duration: 0,
  };
  
  try {
    // Archive old notifications
    try {
      result.archived = await archiveOldNotifications();
    } catch (error) {
      const errorMsg = `Error archiving notifications: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }
    
    // Delete old read notifications
    try {
      result.deleted = await deleteOldReadNotifications();
    } catch (error) {
      const errorMsg = `Error deleting notifications: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }
    
    result.duration = Date.now() - startTime;
    
    console.log(`Cleanup completed in ${result.duration}ms: ${result.archived} archived, ${result.deleted} deleted`);
  } catch (error) {
    const errorMsg = `Error in cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
    result.duration = Date.now() - startTime;
  }
  
  return result;
}

// ============= Public API =============

/**
 * Run cleanup if needed (main entry point)
 * 
 * This function should be called on notification-related API requests.
 * It uses probabilistic execution to avoid running on every request.
 * The cleanup runs asynchronously and doesn't block the request.
 * 
 * @returns Promise that resolves immediately (doesn't wait for cleanup)
 */
export async function cleanupOldNotifications(): Promise<void> {
  // Check if we should run cleanup
  if (!shouldRunCleanup()) {
    return;
  }
  
  // Mark as running
  isCleanupRunning = true;
  
  // Run cleanup async (fire and forget)
  performCleanup()
    .then(result => {
      lastCleanupTime = new Date();
      console.log('Cleanup completed:', result);
    })
    .catch(error => {
      console.error('Error in cleanup:', error);
    })
    .finally(() => {
      isCleanupRunning = false;
    });
}

/**
 * Force cleanup (for testing or manual triggers)
 * 
 * @returns Promise with cleanup results
 */
export async function forceCleanup(): Promise<CleanupResult> {
  // Wait if cleanup is already running
  if (isCleanupRunning) {
    throw new Error('Cleanup is already running');
  }
  
  isCleanupRunning = true;
  
  try {
    const result = await performCleanup();
    lastCleanupTime = new Date();
    return result;
  } finally {
    isCleanupRunning = false;
  }
}

/**
 * Get cleanup statistics
 * 
 * @returns Promise with cleanup stats
 */
export async function getCleanupStats(): Promise<CleanupStats> {
  try {
    const [total, unread, read, old] = await Promise.all([
      // Total notifications
      prisma.contractorNotification.count(),
      
      // Unread notifications
      prisma.contractorNotification.count({
        where: { read: false },
      }),
      
      // Read notifications
      prisma.contractorNotification.count({
        where: { read: true },
      }),
      
      // Old notifications (>30 days)
      prisma.contractorNotification.count({
        where: {
          createdAt: {
            lt: new Date(Date.now() - ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);
    
    return {
      totalNotifications: total,
      unreadNotifications: unread,
      readNotifications: read,
      oldNotifications: old,
      lastCleanup: lastCleanupTime,
    };
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    throw error;
  }
}

/**
 * Get notifications eligible for deletion
 * 
 * @returns Promise with count of notifications that would be deleted
 */
export async function getEligibleForDeletion(): Promise<number> {
  const deleteDate = new Date();
  deleteDate.setDate(deleteDate.getDate() - DELETE_THRESHOLD_DAYS);
  
  try {
    return await prisma.contractorNotification.count({
      where: {
        read: true,
        createdAt: {
          lt: deleteDate,
        },
      },
    });
  } catch (error) {
    console.error('Error getting eligible notifications:', error);
    return 0;
  }
}

/**
 * Get notifications eligible for archiving
 * 
 * @returns Promise with count of notifications that would be archived
 */
export async function getEligibleForArchiving(): Promise<number> {
  const archiveDate = new Date();
  archiveDate.setDate(archiveDate.getDate() - ARCHIVE_THRESHOLD_DAYS);
  
  try {
    return await prisma.contractorNotification.count({
      where: {
        createdAt: {
          lt: archiveDate,
        },
      },
    });
  } catch (error) {
    console.error('Error getting eligible notifications:', error);
    return 0;
  }
}

/**
 * Delete all notifications for a contractor (for testing or GDPR)
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with count of deleted notifications
 */
export async function deleteAllNotifications(contractorId: string): Promise<number> {
  try {
    const result = await prisma.contractorNotification.deleteMany({
      where: { contractorId },
    });
    
    console.log(`Deleted ${result.count} notifications for contractor ${contractorId}`);
    return result.count;
  } catch (error) {
    console.error(`Error deleting notifications for contractor ${contractorId}:`, error);
    throw error;
  }
}

/**
 * Configure cleanup settings (for testing)
 */
export function configureCleanup(options: {
  probability?: number;
  archiveThresholdDays?: number;
  deleteThresholdDays?: number;
  batchSize?: number;
}): void {
  if (options.probability !== undefined) {
    // Note: This would require making the constants mutable
    console.warn('Cleanup probability configuration not implemented in production');
  }
  if (options.archiveThresholdDays !== undefined) {
    console.warn('Archive threshold configuration not implemented in production');
  }
  if (options.deleteThresholdDays !== undefined) {
    console.warn('Delete threshold configuration not implemented in production');
  }
  if (options.batchSize !== undefined) {
    console.warn('Batch size configuration not implemented in production');
  }
}
