/**
 * Tests for CRM Feature Gating
 * 
 * Validates that CRM features are properly gated based on subscription tier
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@/auth');
jest.mock('next/navigation');
jest.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findUnique: jest.fn(),
    },
    contractorCustomer: {
      findMany: jest.fn(),
    },
  },
}));
jest.mock('@/lib/services/contractor-feature-gate');

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { checkLimit } from '@/lib/services/contractor-feature-gate';

describe('CRM Feature Gating', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockCheckLimit = checkLimit as jest.MockedFunction<typeof checkLimit>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Customers Page Access', () => {
    it('should redirect to sign-in if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      // Import and call the page component
      const CustomersPage = (await import('./page')).default;
      
      try {
        await CustomersPage();
      } catch (error) {
        // redirect throws an error in Next.js
      }

      expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
    });

    it('should redirect to profile if contractor profile not found', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'contractor' },
      } as any);

      mockPrisma.contractorProfile.findUnique.mockResolvedValue(null);

      const CustomersPage = (await import('./page')).default;
      
      try {
        await CustomersPage();
      } catch (error) {
        // redirect throws an error
      }

      expect(mockRedirect).toHaveBeenCalledWith('/contractor-dashboard/profile');
    });

    it('should show upgrade prompt for starter tier', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'contractor' },
      } as any);

      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        userId: 'user-1',
        subscriptionTier: 'starter',
      } as any);

      const CustomersPage = (await import('./page')).default;
      const result = await CustomersPage();

      // Check that the result contains the upgrade prompt
      expect(result).toBeDefined();
      // The component should render a locked feature page
      const resultString = JSON.stringify(result);
      expect(resultString).toContain('Customer CRM');
      expect(resultString).toContain('Upgrade to Pro');
    });

    it('should allow access for pro tier', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'contractor' },
      } as any);

      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        userId: 'user-1',
        subscriptionTier: 'pro',
      } as any);

      mockPrisma.contractorCustomer.findMany.mockResolvedValue([]);

      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 10,
        limit: 500,
        remaining: 490,
        percentage: 2,
        isApproaching: false,
        isAtLimit: false,
      });

      const CustomersPage = (await import('./page')).default;
      const result = await CustomersPage();

      // Should render the customers page, not the upgrade prompt
      expect(result).toBeDefined();
      expect(mockPrisma.contractorCustomer.findMany).toHaveBeenCalled();
    });

    it('should allow access for enterprise tier', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'contractor' },
      } as any);

      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        userId: 'user-1',
        subscriptionTier: 'enterprise',
      } as any);

      mockPrisma.contractorCustomer.findMany.mockResolvedValue([]);

      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 100,
        limit: -1,
        remaining: Infinity,
        percentage: 0,
        isApproaching: false,
        isAtLimit: false,
      });

      const CustomersPage = (await import('./page')).default;
      const result = await CustomersPage();

      // Should render the customers page
      expect(result).toBeDefined();
      expect(mockPrisma.contractorCustomer.findMany).toHaveBeenCalled();
    });

    it('should handle null subscription tier as starter', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'contractor' },
      } as any);

      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        userId: 'user-1',
        subscriptionTier: null,
      } as any);

      const CustomersPage = (await import('./page')).default;
      const result = await CustomersPage();

      // Should show upgrade prompt (null defaults to starter)
      const resultString = JSON.stringify(result);
      expect(resultString).toContain('Customer CRM');
      expect(resultString).toContain('Upgrade to Pro');
    });
  });

  describe('Feature Gate Integration', () => {
    it('should check customer limit for pro tier', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'contractor' },
      } as any);

      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        userId: 'user-1',
        subscriptionTier: 'pro',
      } as any);

      mockPrisma.contractorCustomer.findMany.mockResolvedValue([]);

      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 450,
        limit: 500,
        remaining: 50,
        percentage: 90,
        isApproaching: true,
        isAtLimit: false,
      });

      const CustomersPage = (await import('./page')).default;
      await CustomersPage();

      expect(mockCheckLimit).toHaveBeenCalledWith('contractor-1', 'customers');
    });

    it('should not check limit for starter tier (feature locked)', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', role: 'contractor' },
      } as any);

      mockPrisma.contractorProfile.findUnique.mockResolvedValue({
        id: 'contractor-1',
        userId: 'user-1',
        subscriptionTier: 'starter',
      } as any);

      const CustomersPage = (await import('./page')).default;
      await CustomersPage();

      // Should not check limit since feature is locked
      expect(mockCheckLimit).not.toHaveBeenCalled();
      expect(mockPrisma.contractorCustomer.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Badge', () => {
    it('should mark CRM navigation as requiring pro tier', () => {
      const { contractorNavLinks } = require('@/lib/constants/contractor-nav');
      
      const customersLink = contractorNavLinks.find(
        (link: any) => link.href === '/contractor-dashboard/customers'
      );

      expect(customersLink).toBeDefined();
      expect(customersLink.requiredTier).toBe('pro');
    });
  });
});
