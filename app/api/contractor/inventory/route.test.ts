/**
 * Tests for Contractor Inventory API with Feature Gating
 * 
 * Tests Phase 6: Inventory Feature Gating
 * - Feature access control (Pro/Enterprise only)
 * - Inventory item limits (Pro: 200, Enterprise: unlimited)
 * - Usage tracking integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { canAccessFeature, checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementInventoryCount } from '@/lib/services/contractor-usage-tracker';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findUnique: vi.fn(),
    },
    contractorInventoryItem: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    contractorVendor: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock('@/lib/services/contractor-feature-gate');
vi.mock('@/lib/services/contractor-usage-tracker');

describe('Contractor Inventory API - Feature Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/contractor/inventory - Feature Gate', () => {
    it('should block inventory access for Starter tier', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: false,
        tier: 'starter',
        feature: 'inventory',
        reason: 'Inventory management requires Pro plan or higher',
      });

      const request = new Request('http://localhost/api/contractor/inventory');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Feature locked');
      expect(data.requiredTier).toBe('pro');
    });

    it('should allow inventory access for Pro tier', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
        feature: 'inventory',
      });

      vi.mocked(prisma.contractorInventoryItem.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/contractor/inventory');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
    });
  });

  describe('POST /api/contractor/inventory - Feature Gate & Limits', () => {
    it('should block item creation for Starter tier', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: false,
        tier: 'starter',
        feature: 'inventory',
        reason: 'Inventory management requires Pro plan or higher',
      });

      const request = new Request('http://localhost/api/contractor/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Lumber 2x4',
          quantity: 100,
          unit: 'pieces',
          unitCost: 5.99,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Feature locked');
    });

    it('should block item creation when Pro tier limit reached', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
        feature: 'inventory',
      });

      vi.mocked(checkLimit).mockResolvedValue({
        allowed: false,
        current: 200,
        limit: 200,
        remaining: 0,
        percentage: 100,
        isApproaching: false,
        isAtLimit: true,
      });

      const request = new Request('http://localhost/api/contractor/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Lumber 2x4',
          quantity: 100,
          unit: 'pieces',
          unitCost: 5.99,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Limit reached');
      expect(data.current).toBe(200);
      expect(data.limit).toBe(200);
    });

    it('should allow item creation for Pro tier within limits', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
        feature: 'inventory',
      });

      vi.mocked(checkLimit).mockResolvedValue({
        allowed: true,
        current: 100,
        limit: 200,
        remaining: 100,
        percentage: 50,
        isApproaching: false,
        isAtLimit: false,
      });

      vi.mocked(prisma.contractorInventoryItem.create).mockResolvedValue({
        id: 'item-1',
        name: 'Lumber 2x4',
        quantity: 100,
        unit: 'pieces',
        unitCost: 5.99,
      } as any);

      const request = new Request('http://localhost/api/contractor/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Lumber 2x4',
          quantity: 100,
          unit: 'pieces',
          unitCost: 5.99,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.item.id).toBe('item-1');
      expect(incrementInventoryCount).toHaveBeenCalledWith('contractor-1');
    });

    it('should allow unlimited items for Enterprise tier', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.contractorProfile.findUnique).mockResolvedValue({
        id: 'contractor-1',
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'enterprise',
        feature: 'inventory',
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

      vi.mocked(prisma.contractorInventoryItem.create).mockResolvedValue({
        id: 'item-1',
        name: 'Lumber 2x4',
        quantity: 100,
        unit: 'pieces',
        unitCost: 5.99,
      } as any);

      const request = new Request('http://localhost/api/contractor/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Lumber 2x4',
          quantity: 100,
          unit: 'pieces',
          unitCost: 5.99,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(incrementInventoryCount).toHaveBeenCalledWith('contractor-1');
    });
  });
});
