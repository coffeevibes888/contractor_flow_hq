/**
 * Integration Tests for Usage API Endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/contractor-feature-gate', () => ({
  getContractorUsageOverview: jest.fn(),
}));

import { GET } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getContractorUsageOverview } from '@/lib/services/contractor-feature-gate';

describe('Usage API Endpoint', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGetUsageOverview = getContractorUsageOverview as jest.MockedFunction<typeof getContractorUsageOverview>;

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'contractor@example.com',
    },
  };

  const mockContractor = {
    id: 'contractor-123',
    subscriptionTier: 'starter',
    subscriptionStatus: 'active',
  };

  const mockUsageOverview = {
    tier: 'starter' as const,
    tierName: 'Starter',
    price: 39,
    usage: {
      activeJobs: {
        allowed: true,
        current: 12,
        limit: 15,
        remaining: 3,
        percentage: 80,
        isApproaching: true,
        isAtLimit: false,
      },
      invoicesPerMonth: {
        allowed: true,
        current: 18,
        limit: 20,
        remaining: 2,
        percentage: 90,
        isApproaching: true,
        isAtLimit: false,
      },
      customers: {
        allowed: true,
        current: 35,
        limit: 50,
        remaining: 15,
        percentage: 70,
        isApproaching: false,
        isAtLimit: false,
      },
      teamMembers: {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        percentage: 0,
        isApproaching: false,
        isAtLimit: true,
      },
      inventoryItems: {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        percentage: 0,
        isApproaching: false,
        isAtLimit: true,
      },
      equipmentItems: {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        percentage: 0,
        isApproaching: false,
        isAtLimit: true,
      },
      activeLeads: {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        percentage: 0,
        isApproaching: false,
        isAtLimit: true,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/contractor/subscription/usage', () => {
    it('should return usage data for authenticated contractor', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockGetUsageOverview.mockResolvedValue(mockUsageOverview);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tier).toBe('starter');
      expect(data.tierName).toBe('Starter');
      expect(data.price).toBe(39);
      expect(data.subscriptionStatus).toBe('active');
      expect(data.usage).toBeDefined();
      expect(data.warnings).toBeDefined();
    });

    it('should include warnings for features approaching limits', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockGetUsageOverview.mockResolvedValue(mockUsageOverview);

      const response = await GET();
      const data = await response.json();

      // Should include warnings for approaching limits and features at limit (including unavailable features)
      expect(data.warnings.length).toBeGreaterThanOrEqual(2);
      
      // Check for the approaching limit warnings
      const approachingWarnings = data.warnings.filter((w: any) => w.level === 'warning');
      expect(approachingWarnings).toHaveLength(2);
      expect(approachingWarnings[0].feature).toBe('activeJobs');
      expect(approachingWarnings[0].percentage).toBe(80);
      expect(approachingWarnings[1].feature).toBe('invoicesPerMonth');
      expect(approachingWarnings[1].percentage).toBe(90);
    });

    it('should include critical warnings for features at limits', async () => {
      const atLimitOverview = {
        ...mockUsageOverview,
        usage: {
          ...mockUsageOverview.usage,
          activeJobs: {
            ...mockUsageOverview.usage.activeJobs,
            current: 15,
            remaining: 0,
            percentage: 100,
            isApproaching: false,
            isAtLimit: true,
            allowed: false,
          },
        },
      };

      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockGetUsageOverview.mockResolvedValue(atLimitOverview);

      const response = await GET();
      const data = await response.json();

      const criticalWarning = data.warnings.find((w: any) => w.feature === 'activeJobs');
      expect(criticalWarning).toBeDefined();
      expect(criticalWarning.level).toBe('critical');
      expect(criticalWarning.percentage).toBe(100);
    });

    it('should format usage data with unlimited flag', async () => {
      const enterpriseOverview = {
        tier: 'enterprise' as const,
        tierName: 'Enterprise',
        price: 199,
        usage: {
          activeJobs: {
            allowed: true,
            current: 100,
            limit: -1,
            remaining: -1,
            percentage: 0,
            isApproaching: false,
            isAtLimit: false,
          },
        },
      };

      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue({
        ...mockContractor,
        subscriptionTier: 'enterprise',
      } as any);
      mockGetUsageOverview.mockResolvedValue(enterpriseOverview);

      const response = await GET();
      const data = await response.json();

      expect(data.usage.activeJobs.unlimited).toBe(true);
      expect(data.usage.activeJobs.limit).toBe(-1);
    });

    it('should indicate upgrade availability for non-enterprise tiers', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockGetUsageOverview.mockResolvedValue(mockUsageOverview);

      const response = await GET();
      const data = await response.json();

      expect(data.upgradeAvailable).toBe(true);
      expect(data.nextTier).toBe('pro');
    });

    it('should indicate no upgrade available for enterprise tier', async () => {
      const enterpriseOverview = {
        ...mockUsageOverview,
        tier: 'enterprise' as const,
        tierName: 'Enterprise',
        price: 199,
      };

      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue({
        ...mockContractor,
        subscriptionTier: 'enterprise',
      } as any);
      mockGetUsageOverview.mockResolvedValue(enterpriseOverview);

      const response = await GET();
      const data = await response.json();

      expect(data.upgradeAvailable).toBe(false);
      expect(data.nextTier).toBeNull();
    });

    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });

    it('should return 404 if contractor profile not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Contractor profile not found');
    });

    it('should return 500 on internal server error', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to fetch usage data');
    });

    it('should handle missing session user ID', async () => {
      mockAuth.mockResolvedValue({ user: {} } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });

    it('should include all usage metrics in response', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockGetUsageOverview.mockResolvedValue(mockUsageOverview);

      const response = await GET();
      const data = await response.json();

      expect(data.usage.activeJobs).toBeDefined();
      expect(data.usage.invoicesPerMonth).toBeDefined();
      expect(data.usage.customers).toBeDefined();
      expect(data.usage.teamMembers).toBeDefined();
      expect(data.usage.inventoryItems).toBeDefined();
      expect(data.usage.equipmentItems).toBeDefined();
      expect(data.usage.activeLeads).toBeDefined();
    });

    it('should include current, limit, remaining, and percentage for each metric', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockGetUsageOverview.mockResolvedValue(mockUsageOverview);

      const response = await GET();
      const data = await response.json();

      const activeJobsUsage = data.usage.activeJobs;
      expect(activeJobsUsage.current).toBe(12);
      expect(activeJobsUsage.limit).toBe(15);
      expect(activeJobsUsage.remaining).toBe(3);
      expect(activeJobsUsage.percentage).toBe(80);
      expect(activeJobsUsage.isApproaching).toBe(true);
      expect(activeJobsUsage.isAtLimit).toBe(false);
    });
  });
});
