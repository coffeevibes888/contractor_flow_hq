/**
 * Tests for Contractor Notification Cleanup Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cleanupOldNotifications,
  forceCleanup,
  getCleanupStats,
  getEligibleForDeletion,
  getEligibleForArchiving,
  deleteAllNotifications,
  shouldRunCleanup,
  getLastCleanupTime,
  isCleanupInProgress,
} from './contractor-notification-cleanup';
import { prisma } from '@/db/prisma';

// Mock dependencies
vi.mock('@/db/prisma', () => ({
  prisma: {
    contractorNotification: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('Contractor Notification Cleanup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldRunCleanup', () => {
    it('should return true approximately 1% of the time', () => {
      const runs = 10000;
      let trueCount = 0;

      for (let i = 0; i < runs; i++) {
        if (shouldRunCleanup()) {
          trueCount++;
        }
      }

      // Should be around 1% (100 out of 10000)
      // Allow for some variance (0.5% to 1.5%)
      expect(trueCount).toBeGreaterThan(50);
      expect(trueCount).toBeLessThan(150);
    });

    it('should return false if cleanup is already running', async () => {
      // Start a cleanup
      const cleanupPromise = forceCleanup();

      // Try to run another cleanup
      const shouldRun = shouldRunCleanup();

      expect(shouldRun).toBe(false);

      // Wait for cleanup to finish
      await cleanupPromise;
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should return immediately without blocking', async () => {
      const start = Date.now();
      await cleanupOldNotifications();
      const duration = Date.now() - start;

      // Should return in less than 10ms (probabilistic check only)
      expect(duration).toBeLessThan(10);
    });

    it('should not run if probability check fails', async () => {
      // Mock Math.random to always return > 0.01
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      await cleanupOldNotifications();

      // Should not have called any database methods
      expect(prisma.contractorNotification.findMany).not.toHaveBeenCalled();
      expect(prisma.contractorNotification.deleteMany).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe('forceCleanup', () => {
    it('should delete old read notifications', async () => {
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 50,
      });

      const result = await forceCleanup();

      expect(result.deleted).toBe(50);
      expect(result.errors).toHaveLength(0);
      expect(prisma.contractorNotification.deleteMany).toHaveBeenCalled();
    });

    it('should archive old notifications', async () => {
      (prisma.contractorNotification.findMany as any).mockResolvedValue(
        Array(30).fill({ id: 'notification-123' })
      );
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 0,
      });

      const result = await forceCleanup();

      expect(result.archived).toBe(30);
    });

    it('should handle errors gracefully', async () => {
      (prisma.contractorNotification.deleteMany as any).mockRejectedValue(
        new Error('Database error')
      );

      const result = await forceCleanup();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Database error');
    });

    it('should update last cleanup time', async () => {
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 10,
      });
      (prisma.contractorNotification.findMany as any).mockResolvedValue([]);

      const beforeTime = new Date();
      await forceCleanup();
      const afterTime = new Date();

      const lastCleanup = getLastCleanupTime();

      expect(lastCleanup).toBeDefined();
      expect(lastCleanup!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(lastCleanup!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should throw if cleanup already running', async () => {
      (prisma.contractorNotification.deleteMany as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ count: 0 }), 100))
      );
      (prisma.contractorNotification.findMany as any).mockResolvedValue([]);

      // Start first cleanup
      const firstCleanup = forceCleanup();

      // Try to start second cleanup
      await expect(forceCleanup()).rejects.toThrow('Cleanup is already running');

      // Wait for first cleanup to finish
      await firstCleanup;
    });

    it('should process notifications in batches', async () => {
      // Mock large number of notifications
      const notifications = Array(250).fill({ id: 'notification-123' });
      (prisma.contractorNotification.findMany as any).mockResolvedValue(notifications);
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 0,
      });

      const result = await forceCleanup();

      // Should have archived all notifications
      expect(result.archived).toBe(250);
    });

    it('should measure cleanup duration', async () => {
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 10,
      });
      (prisma.contractorNotification.findMany as any).mockResolvedValue([]);

      const result = await forceCleanup();

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('getCleanupStats', () => {
    it('should return cleanup statistics', async () => {
      (prisma.contractorNotification.count as any)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30)  // unread
        .mockResolvedValueOnce(70)  // read
        .mockResolvedValueOnce(20); // old

      const stats = await getCleanupStats();

      expect(stats.totalNotifications).toBe(100);
      expect(stats.unreadNotifications).toBe(30);
      expect(stats.readNotifications).toBe(70);
      expect(stats.oldNotifications).toBe(20);
    });

    it('should include last cleanup time', async () => {
      (prisma.contractorNotification.count as any).mockResolvedValue(0);
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 0,
      });
      (prisma.contractorNotification.findMany as any).mockResolvedValue([]);

      // Run cleanup first
      await forceCleanup();

      const stats = await getCleanupStats();

      expect(stats.lastCleanup).toBeDefined();
      expect(stats.lastCleanup).toBeInstanceOf(Date);
    });

    it('should handle errors', async () => {
      (prisma.contractorNotification.count as any).mockRejectedValue(
        new Error('Database error')
      );

      await expect(getCleanupStats()).rejects.toThrow('Database error');
    });
  });

  describe('getEligibleForDeletion', () => {
    it('should count notifications eligible for deletion', async () => {
      (prisma.contractorNotification.count as any).mockResolvedValue(25);

      const count = await getEligibleForDeletion();

      expect(count).toBe(25);
      expect(prisma.contractorNotification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            read: true,
            createdAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should return 0 on error', async () => {
      (prisma.contractorNotification.count as any).mockRejectedValue(
        new Error('Database error')
      );

      const count = await getEligibleForDeletion();

      expect(count).toBe(0);
    });
  });

  describe('getEligibleForArchiving', () => {
    it('should count notifications eligible for archiving', async () => {
      (prisma.contractorNotification.count as any).mockResolvedValue(40);

      const count = await getEligibleForArchiving();

      expect(count).toBe(40);
      expect(prisma.contractorNotification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should return 0 on error', async () => {
      (prisma.contractorNotification.count as any).mockRejectedValue(
        new Error('Database error')
      );

      const count = await getEligibleForArchiving();

      expect(count).toBe(0);
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications for a contractor', async () => {
      const contractorId = 'contractor-123';
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 15,
      });

      const count = await deleteAllNotifications(contractorId);

      expect(count).toBe(15);
      expect(prisma.contractorNotification.deleteMany).toHaveBeenCalledWith({
        where: { contractorId },
      });
    });

    it('should handle errors', async () => {
      const contractorId = 'contractor-123';
      (prisma.contractorNotification.deleteMany as any).mockRejectedValue(
        new Error('Database error')
      );

      await expect(deleteAllNotifications(contractorId)).rejects.toThrow('Database error');
    });
  });

  describe('isCleanupInProgress', () => {
    it('should return false when no cleanup running', () => {
      expect(isCleanupInProgress()).toBe(false);
    });

    it('should return true when cleanup is running', async () => {
      (prisma.contractorNotification.deleteMany as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ count: 0 }), 100))
      );
      (prisma.contractorNotification.findMany as any).mockResolvedValue([]);

      // Start cleanup
      const cleanupPromise = forceCleanup();

      // Check if running
      expect(isCleanupInProgress()).toBe(true);

      // Wait for cleanup to finish
      await cleanupPromise;

      // Should be false again
      expect(isCleanupInProgress()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty notification list', async () => {
      (prisma.contractorNotification.findMany as any).mockResolvedValue([]);
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 0,
      });

      const result = await forceCleanup();

      expect(result.archived).toBe(0);
      expect(result.deleted).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      (prisma.contractorNotification.findMany as any).mockRejectedValue(
        new Error('Archive error')
      );
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 10,
      });

      const result = await forceCleanup();

      // Should still delete even if archive fails
      expect(result.deleted).toBe(10);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle very large batches', async () => {
      // Mock 1000 notifications
      const notifications = Array(1000).fill({ id: 'notification-123' });
      (prisma.contractorNotification.findMany as any).mockResolvedValue(notifications);
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 0,
      });

      const result = await forceCleanup();

      expect(result.archived).toBe(1000);
    });
  });

  describe('Performance', () => {
    it('should complete cleanup in reasonable time', async () => {
      (prisma.contractorNotification.findMany as any).mockResolvedValue(
        Array(100).fill({ id: 'notification-123' })
      );
      (prisma.contractorNotification.deleteMany as any).mockResolvedValue({
        count: 50,
      });

      const start = Date.now();
      await forceCleanup();
      const duration = Date.now() - start;

      // Should complete in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
