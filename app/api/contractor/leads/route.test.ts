/**
 * Tests for Contractor Leads API with Feature Gating
 * 
 * Tests Phase 6: Lead Management Feature Gating
 * - Feature access control (Pro/Enterprise only)
 * - Lead count limits (Pro: 100, Enterprise: unlimited)
 * - Usage tracking integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { canAccessFeature, checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementLeadCount } from '@/lib/services/contractor-usage-tracker';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findUnique: vi.fn(),
    },
    contractorLead: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    contractorLeadMatch: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));
vi.mock('@/lib/services/contractor-feature-gate');
vi.mock('@/lib/services/contractor-usage-tracker');
vi.mock('@/lib/services/marketplace-email', () => ({
  sendContractorLeadNotification: vi.fn(),
  sendCustomerLeadConfirmation: vi.fn(),
}));
vi.mock('@/lib/event-system', () => ({
  dbTriggers: {
    onContractorLeadMatch: vi.fn(),
  },
}));

describe('Contractor Leads API - Feature Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/contractor/leads - Feature Gate', () => {
    it('should block lead creation for Starter tier', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
        email: 'contractor@example.com',
        businessName: 'Test Contractor',
        displayName: 'Test',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: false,
        tier: 'starter',
        feature: 'leadManagement',
        reason: 'Lead management requires Pro plan or higher',
      });

      const request = new Request('http://localhost/api/contractor/leads', {
        method: 'POST',
        body: JSON.stringify({
          projectType: 'plumbing',
          projectDescription: 'Fix leaky faucet',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          preselectedContractorId: 'contractor-1',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Feature locked');
      expect(data.requiredTier).toBe('pro');
    });

    it('should block lead creation when Pro tier limit reached', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
        email: 'contractor@example.com',
        businessName: 'Test Contractor',
        displayName: 'Test',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
        feature: 'leadManagement',
      });

      vi.mocked(checkLimit).mockResolvedValue({
        allowed: false,
        current: 100,
        limit: 100,
        remaining: 0,
        percentage: 100,
        isApproaching: false,
        isAtLimit: true,
      });

      const request = new Request('http://localhost/api/contractor/leads', {
        method: 'POST',
        body: JSON.stringify({
          projectType: 'plumbing',
          projectDescription: 'Fix leaky faucet',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          preselectedContractorId: 'contractor-1',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Limit reached');
      expect(data.current).toBe(100);
      expect(data.limit).toBe(100);
    });

    it('should allow lead creation for Pro tier within limits', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
        email: 'contractor@example.com',
        businessName: 'Test Contractor',
        displayName: 'Test',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
        feature: 'leadManagement',
      });

      vi.mocked(checkLimit).mockResolvedValue({
        allowed: true,
        current: 50,
        limit: 100,
        remaining: 50,
        percentage: 50,
        isApproaching: false,
        isAtLimit: false,
      });

      vi.mocked(prisma.contractorLead.create).mockResolvedValue({
        id: 'lead-1',
        projectType: 'plumbing',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        projectDescription: 'Fix leaky faucet',
        status: 'new',
      } as any);

      const request = new Request('http://localhost/api/contractor/leads', {
        method: 'POST',
        body: JSON.stringify({
          projectType: 'plumbing',
          projectDescription: 'Fix leaky faucet',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          preselectedContractorId: 'contractor-1',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.leadId).toBe('lead-1');
      expect(incrementLeadCount).toHaveBeenCalledWith('contractor-1');
    });

    it('should allow unlimited leads for Enterprise tier', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
        email: 'contractor@example.com',
        businessName: 'Test Contractor',
        displayName: 'Test',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'enterprise',
        feature: 'leadManagement',
      });

      vi.mocked(checkLimit).mockResolvedValue({
        allowed: true,
        current: 500,
        limit: -1, // unlimited
        remaining: Infinity,
        percentage: 0,
        isApproaching: false,
        isAtLimit: false,
      });

      vi.mocked(prisma.contractorLead.create).mockResolvedValue({
        id: 'lead-1',
        projectType: 'plumbing',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        projectDescription: 'Fix leaky faucet',
        status: 'new',
      } as any);

      const request = new Request('http://localhost/api/contractor/leads', {
        method: 'POST',
        body: JSON.stringify({
          projectType: 'plumbing',
          projectDescription: 'Fix leaky faucet',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          preselectedContractorId: 'contractor-1',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(incrementLeadCount).toHaveBeenCalledWith('contractor-1');
    });
  });
});
