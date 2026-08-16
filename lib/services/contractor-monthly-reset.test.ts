/**
 * Tests for Contractor Monthly Reset Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkAndResetMonthlyCounters,
  forceMonthlyReset,
  getNextResetDate,
  getDaysUntilReset,
} from './contractor-monthly-reset';
import { prisma } from '@/db/prisma';

// Mock dependencies
vi.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('./contractor-usage-tracker', () => ({
  getCurrentUsage: vi.fn(),
  resetMonthlyCounters: vi.fn(),
}));

vi.mock('./resend-email', () => ({
  sendEmail: vi.fn(),
}));

describe('Contractor Monthly Reset Service', () => {
  const mockContractorId = 'contractor-123';
  const mockContractor = {
    businessName: 'Test Contractor',
    email: 'test@example.com',
    subscriptionTier: 'pro',
    subscriptionEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndResetMonthlyCounters', () => {
    it('should reset counters when billing period has ended', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue(mockContractor);
      (prisma.contractorProfile.update as any).mockResolvedValue({});
      
      const { getCurrentUsage, resetMonthlyCounters } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        invoicesThisMonth: 15,
        activeJobsCount: 10,
        totalCustomers: 50,
        teamMembersCount: 3,
        inventoryCount: 100,
        equipmentCount: 10,
        activeLeadsCount: 20,
      });

      const result = await checkAndResetMonthlyCounters(mockContractorId);
      
      expect(result.reset).toBe(true);
      expect(result.previousUsage?.invoicesThisMonth).toBe(15);
      expect(resetMonthlyCounters).toHaveBeenCalledWith(mockContractorId);
      expect(prisma.contractorProfile.update).toHaveBeenCalled();
    });

    it('should not reset if billing period has not ended', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      (prisma.contractorProfile.findUnique as any).mockResolvedValue({
        ...mockContractor,
        subscriptionEndsAt: futureDate,
      });

      const result = await checkAndResetMonthlyCounters(mockContractorId);
      
      expect(result.reset).toBe(false);
    });

    it('should return error if contractor not found', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue(null);

      const result = await checkAndResetMonthlyCounters(mockContractorId);
      
      expect(result.reset).toBe(false);
      expect(result.error).toBe('Contractor not found');
    });

    it('should update billing period end date', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue(mockContractor);
      (prisma.contractorProfile.update as any).mockResolvedValue({});
      
      const { getCurrentUsage, resetMonthlyCounters } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        invoicesThisMonth: 15,
        activeJobsCount: 10,
        totalCustomers: 50,
        teamMembersCount: 3,
        inventoryCount: 100,
        equipmentCount: 10,
        activeLeadsCount: 20,
      });

      await checkAndResetMonthlyCounters(mockContractorId);
      
      expect(prisma.contractorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockContractorId },
          data: expect.objectContaining({
            subscriptionEndsAt: expect.any(Date),
          }),
        })
      );
    });

    it('should send monthly summary email', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue(mockContractor);
      (prisma.contractorProfile.update as any).mockResolvedValue({});
      
      const { getCurrentUsage, resetMonthlyCounters } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        invoicesThisMonth: 15,
        activeJobsCount: 10,
        totalCustomers: 50,
        teamMembersCount: 3,
        inventoryCount: 100,
        equipmentCount: 10,
        activeLeadsCount: 20,
      });

      // Mock Resend
      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null }),
        },
      };
      jest.mock('resend', () => ({
        Resend: jest.fn(() => mockResend),
      }));

      await checkAndResetMonthlyCounters(mockContractorId);
      
      // Wait a bit for async email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (prisma.contractorProfile.findUnique as any).mockRejectedValue(
        new Error('Database error')
      );

      const result = await checkAndResetMonthlyCounters(mockContractorId);
      
      expect(result.reset).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should identify features approaching limits', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue(mockContractor);
      (prisma.contractorProfile.update as any).mockResolvedValue({});
      
      const { getCurrentUsage, resetMonthlyCounters } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        invoicesThisMonth: 15,
        activeJobsCount: 45, // 90% of 50
        totalCustomers: 450, // 90% of 500
        teamMembersCount: 3,
        inventoryCount: 180, // 90% of 200
        equipmentCount: 18, // 90% of 20
        activeLeadsCount: 90, // 90% of 100
      });

      // Mock Resend
      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null }),
        },
      };
      jest.mock('resend', () => ({
        Resend: jest.fn(() => mockResend),
      }));

      await checkAndResetMonthlyCounters(mockContractorId);
      
      // Wait for async email
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Email should include approaching limits
      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Approaching Limits'),
        })
      );
    });
  });

  describe('forceMonthlyReset', () => {
    it('should reset counters regardless of billing period', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      (prisma.contractorProfile.findUnique as any).mockResolvedValue({
        ...mockContractor,
        subscriptionEndsAt: futureDate,
      });
      (prisma.contractorProfile.update as any).mockResolvedValue({});
      
      const { getCurrentUsage, resetMonthlyCounters } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        invoicesThisMonth: 20,
        activeJobsCount: 10,
        totalCustomers: 50,
        teamMembersCount: 3,
        inventoryCount: 100,
        equipmentCount: 10,
        activeLeadsCount: 20,
      });

      const result = await forceMonthlyReset(mockContractorId);
      
      expect(result.reset).toBe(true);
      expect(result.previousUsage?.invoicesThisMonth).toBe(20);
      expect(resetMonthlyCounters).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (prisma.contractorProfile.findUnique as any).mockRejectedValue(
        new Error('Database error')
      );

      const result = await forceMonthlyReset(mockContractorId);
      
      expect(result.reset).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getNextResetDate', () => {
    it('should return subscription end date', async () => {
      const endDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      (prisma.contractorProfile.findUnique as any).mockResolvedValue({
        subscriptionEndsAt: endDate,
      });

      const result = await getNextResetDate(mockContractorId);
      
      expect(result).toEqual(endDate);
    });

    it('should return null if no subscription end date', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue({
        subscriptionEndsAt: null,
      });

      const result = await getNextResetDate(mockContractorId);
      
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (prisma.contractorProfile.findUnique as any).mockRejectedValue(
        new Error('Database error')
      );

      const result = await getNextResetDate(mockContractorId);
      
      expect(result).toBeNull();
    });
  });

  describe('getDaysUntilReset', () => {
    it('should calculate days until reset', async () => {
      const endDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
      (prisma.contractorProfile.findUnique as any).mockResolvedValue({
        subscriptionEndsAt: endDate,
      });

      const result = await getDaysUntilReset(mockContractorId);
      
      expect(result).toBe(15);
    });

    it('should return negative days if past reset date', async () => {
      const endDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      (prisma.contractorProfile.findUnique as any).mockResolvedValue({
        subscriptionEndsAt: endDate,
      });

      const result = await getDaysUntilReset(mockContractorId);
      
      expect(result).toBeLessThan(0);
    });

    it('should return null if no reset date', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue({
        subscriptionEndsAt: null,
      });

      const result = await getDaysUntilReset(mockContractorId);
      
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (prisma.contractorProfile.findUnique as any).mockRejectedValue(
        new Error('Database error')
      );

      const result = await getDaysUntilReset(mockContractorId);
      
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle contractor with no subscription tier', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue({
        ...mockContractor,
        subscriptionTier: null,
      });
      (prisma.contractorProfile.update as any).mockResolvedValue({});
      
      const { getCurrentUsage, resetMonthlyCounters } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        invoicesThisMonth: 15,
        activeJobsCount: 10,
        totalCustomers: 50,
        teamMembersCount: 3,
        inventoryCount: 100,
        equipmentCount: 10,
        activeLeadsCount: 20,
      });

      const result = await checkAndResetMonthlyCounters(mockContractorId);
      
      // Should still reset, defaulting to starter tier
      expect(result.reset).toBe(true);
    });

    it('should handle zero usage', async () => {
      (prisma.contractorProfile.findUnique as any).mockResolvedValue(mockContractor);
      (prisma.contractorProfile.update as any).mockResolvedValue({});
      
      const { getCurrentUsage, resetMonthlyCounters } = await import('./contractor-usage-tracker');
      (getCurrentUsage as any).mockResolvedValue({
        invoicesThisMonth: 0,
        activeJobsCount: 0,
        totalCustomers: 0,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      });

      const result = await checkAndResetMonthlyCounters(mockContractorId);
      
      expect(result.reset).toBe(true);
      expect(result.previousUsage?.invoicesThisMonth).toBe(0);
    });
  });
});
