/**
 * Unit Tests for Contractor Feature Gate Service
 * 
 * Note: TypeScript may show errors for contractorUsageTracking if Prisma client
 * hasn't been regenerated after schema changes. Run `npx prisma generate` to fix.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { ContractorTier } from '@/lib/config/contractor-subscription-tiers';

// Mock Prisma before importing the service
jest.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findUnique: jest.fn(),
    },
    contractorUsageTracking: {
      findUnique: jest.fn(),
    },
  },
}));

import {
  canAccessFeature,
  checkLimit,
  checkMultipleLimits,
  getFeatureLimit,
  getContractorUsageOverview,
  invalidateCache,
  clearCache,
  SubscriptionLimitError,
  FeatureLockedError,
} from './contractor-feature-gate';
import { prisma } from '@/db/prisma';

describe('Contractor Feature Gate Service', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  describe('getFeatureLimit', () => {
    it('should return correct limits for starter tier', () => {
      expect(getFeatureLimit('starter', 'activeJobs')).toBe(15);
      expect(getFeatureLimit('starter', 'invoicesPerMonth')).toBe(20);
      expect(getFeatureLimit('starter', 'customers')).toBe(50);
      expect(getFeatureLimit('starter', 'teamMembers')).toBe(0);
    });

    it('should return correct limits for pro tier', () => {
      expect(getFeatureLimit('pro', 'activeJobs')).toBe(50);
      expect(getFeatureLimit('pro', 'invoicesPerMonth')).toBe(-1); // unlimited
      expect(getFeatureLimit('pro', 'customers')).toBe(500);
      expect(getFeatureLimit('pro', 'teamMembers')).toBe(6);
    });

    it('should return correct limits for enterprise tier', () => {
      expect(getFeatureLimit('enterprise', 'activeJobs')).toBe(-1); // unlimited
      expect(getFeatureLimit('enterprise', 'invoicesPerMonth')).toBe(-1);
      expect(getFeatureLimit('enterprise', 'customers')).toBe(-1);
      expect(getFeatureLimit('enterprise', 'teamMembers')).toBe(-1);
    });
  });

  describe('canAccessFeature', () => {
    it('should allow starter tier to access basic features', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);

      const result = await canAccessFeature('contractor-1', 'basicJobManagement');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('starter');
      expect(result.feature).toBe('basicJobManagement');
      expect(result.reason).toBeUndefined();
    });

    it('should deny starter tier access to team management', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);

      const result = await canAccessFeature('contractor-1', 'teamManagement');
      
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('starter');
      expect(result.feature).toBe('teamManagement');
      expect(result.reason).toContain('Pro plan');
    });

    it('should allow pro tier to access team management', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-2',
        subscriptionTier: 'pro',
      } as any);

      const result = await canAccessFeature('contractor-2', 'teamManagement');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('pro');
    });

    it('should deny pro tier access to enterprise features', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-2',
        subscriptionTier: 'pro',
      } as any);

      const result = await canAccessFeature('contractor-2', 'apiAccess');
      
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('pro');
      expect(result.reason).toContain('Enterprise plan');
    });

    it('should allow enterprise tier to access all features', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-3',
        subscriptionTier: 'enterprise',
      } as any);

      const result1 = await canAccessFeature('contractor-3', 'teamManagement');
      const result2 = await canAccessFeature('contractor-3', 'apiAccess');
      const result3 = await canAccessFeature('contractor-3', 'whiteLabel');
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
    });

    it('should use cache for repeated calls', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);

      await canAccessFeature('contractor-1', 'basicJobManagement');
      await canAccessFeature('contractor-1', 'teamManagement');
      
      // Should only call database once due to caching
      expect(mockPrisma.contractorProfile.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent contractor', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue(null);

      await expect(
        canAccessFeature('non-existent', 'basicJobManagement')
      ).rejects.toThrow('Contractor not found');
    });
  });

  describe('checkLimit', () => {
    beforeEach(() => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);
    });

    it('should return allowed when under limit', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-1',
        activeJobsCount: 10,
        invoicesThisMonth: 15,
        totalCustomers: 30,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      } as any);

      const result = await checkLimit('contractor-1', 'activeJobs');
      
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(10);
      expect(result.limit).toBe(15);
      expect(result.remaining).toBe(5);
      expect(result.percentage).toBe(67); // 10/15 = 66.67% rounded
      expect(result.isApproaching).toBe(false);
      expect(result.isAtLimit).toBe(false);
    });

    it('should return not allowed when at limit', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-1',
        activeJobsCount: 15,
        invoicesThisMonth: 20,
        totalCustomers: 50,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      } as any);

      const result = await checkLimit('contractor-1', 'activeJobs');
      
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(15);
      expect(result.limit).toBe(15);
      expect(result.remaining).toBe(0);
      expect(result.percentage).toBe(100);
      expect(result.isApproaching).toBe(true);
      expect(result.isAtLimit).toBe(true);
    });

    it('should detect approaching limit at 80%', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-1',
        activeJobsCount: 12, // 80% of 15
        invoicesThisMonth: 10,
        totalCustomers: 30,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      } as any);

      const result = await checkLimit('contractor-1', 'activeJobs');
      
      expect(result.isApproaching).toBe(true);
      expect(result.isAtLimit).toBe(false);
      expect(result.percentage).toBe(80);
    });

    it('should handle unlimited limits correctly', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-2',
        subscriptionTier: 'pro',
      } as any);

      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-2',
        activeJobsCount: 100,
        invoicesThisMonth: 500,
        totalCustomers: 300,
        teamMembersCount: 5,
        inventoryCount: 150,
        equipmentCount: 10,
        activeLeadsCount: 50,
      } as any);

      const result = await checkLimit('contractor-2', 'invoicesPerMonth');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(Infinity);
      expect(result.percentage).toBe(0);
      expect(result.isApproaching).toBe(false);
      expect(result.isAtLimit).toBe(false);
    });

    it('should handle missing usage tracking record', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(null);

      const result = await checkLimit('contractor-1', 'activeJobs');
      
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(15);
      expect(result.remaining).toBe(15);
    });

    it('should check different limit types correctly', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-1',
        activeJobsCount: 10,
        invoicesThisMonth: 18,
        totalCustomers: 45,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      } as any);

      const jobsResult = await checkLimit('contractor-1', 'activeJobs');
      const invoicesResult = await checkLimit('contractor-1', 'invoicesPerMonth');
      const customersResult = await checkLimit('contractor-1', 'customers');
      
      expect(jobsResult.current).toBe(10);
      expect(invoicesResult.current).toBe(18);
      expect(customersResult.current).toBe(45);
    });
  });

  describe('checkMultipleLimits', () => {
    beforeEach(() => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);

      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-1',
        activeJobsCount: 10,
        invoicesThisMonth: 18,
        totalCustomers: 45,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      } as any);
    });

    it('should check multiple limits efficiently', async () => {
      const results = await checkMultipleLimits('contractor-1', [
        'activeJobs',
        'invoicesPerMonth',
        'customers',
      ]);
      
      expect(results.size).toBe(3);
      expect(results.get('activeJobs')?.current).toBe(10);
      expect(results.get('invoicesPerMonth')?.current).toBe(18);
      expect(results.get('customers')?.current).toBe(45);
      
      // Should only call database once for tier and once for usage
      expect(mockPrisma.contractorProfile.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.contractorUsageTracking.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return correct limit status for each feature', async () => {
      const results = await checkMultipleLimits('contractor-1', [
        'activeJobs',
        'invoicesPerMonth',
      ]);
      
      const jobsResult = results.get('activeJobs');
      const invoicesResult = results.get('invoicesPerMonth');
      
      expect(jobsResult?.allowed).toBe(true);
      expect(jobsResult?.isApproaching).toBe(false);
      
      expect(invoicesResult?.allowed).toBe(true);
      expect(invoicesResult?.isApproaching).toBe(true); // 18/20 = 90%
    });
  });

  describe('getContractorUsageOverview', () => {
    it('should return complete usage overview', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);

      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-1',
        activeJobsCount: 10,
        invoicesThisMonth: 15,
        totalCustomers: 30,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      } as any);

      const overview = await getContractorUsageOverview('contractor-1');
      
      expect(overview.tier).toBe('starter');
      expect(overview.tierName).toBe('Starter');
      expect(overview.price).toBe(39);
      expect(overview.usage).toHaveProperty('activeJobs');
      expect(overview.usage).toHaveProperty('invoicesPerMonth');
      expect(overview.usage).toHaveProperty('customers');
      expect(overview.usage.activeJobs.current).toBe(10);
      expect(overview.usage.activeJobs.limit).toBe(15);
    });

    it('should include all tracked features in overview', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-2',
        subscriptionTier: 'pro',
      } as any);

      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-2',
        activeJobsCount: 30,
        invoicesThisMonth: 100,
        totalCustomers: 250,
        teamMembersCount: 4,
        inventoryCount: 150,
        equipmentCount: 15,
        activeLeadsCount: 75,
      } as any);

      const overview = await getContractorUsageOverview('contractor-2');
      
      expect(overview.usage.teamMembers.current).toBe(4);
      expect(overview.usage.teamMembers.limit).toBe(6);
      expect(overview.usage.inventoryItems.current).toBe(150);
      expect(overview.usage.equipmentItems.current).toBe(15);
      expect(overview.usage.activeLeads.current).toBe(75);
    });
  });

  describe('Cache Management', () => {
    it('should cache contractor tier', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);

      await canAccessFeature('contractor-1', 'basicJobManagement');
      await canAccessFeature('contractor-1', 'teamManagement');
      await canAccessFeature('contractor-1', 'crm');
      
      // Should only call database once
      expect(mockPrisma.contractorProfile.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache for specific contractor', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);

      await canAccessFeature('contractor-1', 'basicJobManagement');
      
      invalidateCache('contractor-1');
      
      await canAccessFeature('contractor-1', 'teamManagement');
      
      // Should call database twice (once before invalidation, once after)
      expect(mockPrisma.contractorProfile.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should clear entire cache', async () => {
      mockPrisma.contractorProfile.findUnique
        .mockResolvedValueOnce({
          id: 'contractor-1',
          subscriptionTier: 'starter',
        } as any)
        .mockResolvedValueOnce({
          id: 'contractor-2',
          subscriptionTier: 'pro',
        } as any);

      await canAccessFeature('contractor-1', 'basicJobManagement');
      await canAccessFeature('contractor-2', 'teamManagement');
      
      clearCache();
      
      await canAccessFeature('contractor-1', 'crm');
      await canAccessFeature('contractor-2', 'apiAccess');
      
      // Should call database 4 times (2 before clear, 2 after)
      expect(mockPrisma.contractorProfile.findUnique).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Classes', () => {
    it('should create SubscriptionLimitError with correct properties', () => {
      const error = new SubscriptionLimitError('activeJobs', 15, 15, 'starter');
      
      expect(error.name).toBe('SubscriptionLimitError');
      expect(error.feature).toBe('activeJobs');
      expect(error.limit).toBe(15);
      expect(error.current).toBe(15);
      expect(error.tier).toBe('starter');
      expect(error.message).toContain('activeJobs');
      expect(error.message).toContain('15');
    });

    it('should create FeatureLockedError with correct properties', () => {
      const error = new FeatureLockedError('teamManagement', 'Pro', 'starter');
      
      expect(error.name).toBe('FeatureLockedError');
      expect(error.feature).toBe('teamManagement');
      expect(error.requiredTier).toBe('Pro');
      expect(error.currentTier).toBe('starter');
      expect(error.message).toContain('teamManagement');
      expect(error.message).toContain('Pro');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero usage correctly', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'starter',
      } as any);

      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue({
        contractorId: 'contractor-1',
        activeJobsCount: 0,
        invoicesThisMonth: 0,
        totalCustomers: 0,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      } as any);

      const result = await checkLimit('contractor-1', 'activeJobs');
      
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.remaining).toBe(15);
    });

    it('should handle legacy tier names', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: 'basic', // legacy name
      } as any);

      const result = await canAccessFeature('contractor-1', 'basicJobManagement');
      
      expect(result.tier).toBe('starter'); // normalized
      expect(result.allowed).toBe(true);
    });

    it('should handle null subscription tier', async () => {
      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        subscriptionTier: null,
      } as any);

      const result = await canAccessFeature('contractor-1', 'basicJobManagement');
      
      expect(result.tier).toBe('starter'); // defaults to starter
    });
  });
});
