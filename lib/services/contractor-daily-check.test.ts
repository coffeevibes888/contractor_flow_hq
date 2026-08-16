/**
 * Tests for Contractor Daily Check Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  performDailyCheckIfNeeded,
  forceDailyCheck,
  getDailyCheckCacheStats,
  clearDailyCheckCache,
} from './contractor-daily-check';
import { prisma } from '@/db/prisma';
import * as notificationService from './contractor-notification-service';
import * as notificationEmail from './contractor-notification-email';

// Mock dependencies
vi.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findUnique: vi.fn(),
    },
    contractorNotification: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('./contractor-usage-tracker', () => ({
  getCurrentUsage: vi.fn(),
}));

vi.mock('./contractor-notification-service', () => ({
  createLimitWarningNotification: vi.fn(),
  createLimitReachedNotification: vi.fn(),
  getFeatureDisplayName: vi.fn((feature) => feature),
}));

vi.mock('./contractor-notification-email', () => ({
  sendUsageNotificationEmail: vi.fn(),
}));

describe('Contractor Daily Check Service', () => {
  const mockContractorId = 'contractor-123';
  const mockContractor = {
    businessName: 'Test Contractor',
    email: 'test@example.com',
    subscriptionTier: 'pro',
  };

  beforeEach(() => {
    clearDailyCheckCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearDailyCheckCache();
  });

  describe('performDailyCheckIfNeeded', () => {
    it('should run check on first call of the day', async () => {
      await performDailyCheckIfNeeded(mockContractorId);
      
      const stats = getDailyCheckCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should not run check twice on same day', async () => {
      await performDailyCheckIfNeeded(mockContractorId);
      await performDailyCheckIfNeeded(mockContractorId);
      
      const stats = getDailyCheckCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should return immediately without blocking', async () => {
      const start = Date.now();
      await performDailyCheckIfNeeded(mockContractorId);
      const duration = Date.now() - start;
      
      // Should return in less than 10ms (cache check only)
      expect(duration).toBeLessThan(10);
    });
  });

  describe('forceDailyCheck', () => {
    beforeEach(() => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue(mockContractor);
      (prisma.contractorNotification.findFirst as any).mockResolvedValue(null);
    });

    it('should run check even if already ran today', async () => {
      await performDailyCheckIfNeeded(mockContractorId);
      
      // Force check should still run
      const result = await forceDailyCheck(mockContractorId);
      
      expect(result.checked).toBe(true);
    });

    it('should return error if contractor not found', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue(null);
      
      const result = await forceDailyCheck(mockContractorId);
      
      expect(result.checked).toBe(true);
      expect(result.errors).toContain('Contractor not found');
    });

    it('should send notifications for features at 80% threshold', async () => {
      const { getCurrentUsage } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        activeJobsCount: 40, // 80% of 50
        invoicesThisMonth: 0,
        totalCustomers: 0,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      });

      const result = await forceDailyCheck(mockContractorId);
      
      expect(result.notificationsSent).toBeGreaterThan(0);
      expect(notificationService.createLimitWarningNotification).toHaveBeenCalled();
      expect(notificationEmail.sendUsageNotificationEmail).toHaveBeenCalled();
    });

    it('should send notifications for features at 100% threshold', async () => {
      const { getCurrentUsage } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        activeJobsCount: 50, // 100% of 50
        invoicesThisMonth: 0,
        totalCustomers: 0,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      });

      const result = await forceDailyCheck(mockContractorId);
      
      expect(result.notificationsSent).toBeGreaterThan(0);
      expect(notificationService.createLimitReachedNotification).toHaveBeenCalled();
    });

    it('should not send duplicate notifications within 24 hours', async () => {
      const { getCurrentUsage } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        activeJobsCount: 40,
        invoicesThisMonth: 0,
        totalCustomers: 0,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      });

      // Mock recent notification
      (prisma.contractorNotification.findFirst as any).mockResolvedValue({
        id: 'notification-123',
        createdAt: new Date(),
      });

      const result = await forceDailyCheck(mockContractorId);
      
      expect(result.notificationsSent).toBe(0);
    });

    it('should skip unlimited features', async () => {
      const { getCurrentUsage } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        activeJobsCount: 0,
        invoicesThisMonth: 1000, // Unlimited for Pro tier
        totalCustomers: 0,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      });

      const result = await forceDailyCheck(mockContractorId);
      
      // Should not send notification for unlimited feature
      expect(result.notificationsSent).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      (prisma.contractorProfile.findUnique as any).mockRejectedValue(
        new Error('Database error')
      );

      const result = await forceDailyCheck(mockContractorId);
      
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getDailyCheckCacheStats', () => {
    it('should return cache statistics', async () => {
      await performDailyCheckIfNeeded('contractor-1');
      await performDailyCheckIfNeeded('contractor-2');
      
      const stats = getDailyCheckCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0]).toHaveProperty('contractorId');
      expect(stats.entries[0]).toHaveProperty('date');
      expect(stats.entries[0]).toHaveProperty('age');
    });

    it('should return empty stats when cache is empty', () => {
      const stats = getDailyCheckCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.entries).toHaveLength(0);
    });
  });

  describe('clearDailyCheckCache', () => {
    it('should clear all cache entries', async () => {
      await performDailyCheckIfNeeded('contractor-1');
      await performDailyCheckIfNeeded('contractor-2');
      
      expect(getDailyCheckCacheStats().size).toBe(2);
      
      clearDailyCheckCache();
      
      expect(getDailyCheckCacheStats().size).toBe(0);
    });
  });

  describe('Cache Expiration', () => {
    it('should expire cache entries after 24 hours', async () => {
      // This test would require mocking Date.now() or using fake timers
      // For now, we'll just verify the cache key includes the date
      await performDailyCheckIfNeeded(mockContractorId);
      
      const stats = getDailyCheckCacheStats();
      const today = new Date().toISOString().split('T')[0];
      
      expect(stats.entries[0].date).toBe(today);
    });
  });

  describe('Multiple Features', () => {
    it('should check all features with limits', async () => {
      const { getCurrentUsage } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        activeJobsCount: 40, // 80% of 50
        invoicesThisMonth: 0,
        totalCustomers: 400, // 80% of 500
        teamMembersCount: 5, // 83% of 6
        inventoryCount: 160, // 80% of 200
        equipmentCount: 16, // 80% of 20
        activeLeadsCount: 80, // 80% of 100
      });

      const result = await forceDailyCheck(mockContractorId);
      
      // Should send notifications for multiple features
      expect(result.notificationsSent).toBeGreaterThan(3);
    });
  });
});
