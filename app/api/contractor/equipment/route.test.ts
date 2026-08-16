/**
 * Tests for Contractor Equipment API with Feature Gating
 * 
 * Tests Phase 6: Equipment Feature Gating
 * - Feature access control (Pro/Enterprise only)
 * - Equipment item limits (Pro: 20, Enterprise: unlimited)
 * - Usage tracking integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { canAccessFeature, checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementEquipmentCount } from '@/lib/services/contractor-usage-tracker';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findUnique: vi.fn(),
    },
    contractorEquipment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    contractorEmployee: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock('@/lib/services/contractor-feature-gate');
vi.mock('@/lib/services/contractor-usage-tracker');

describe('Contractor Equipment API - Feature Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/contractor/equipment - Feature Gate', () => {
    it('should block equipment access for Starter tier', async () => {
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
        feature: 'equipment',
        reason: 'Equipment management requires Pro plan or higher',
      });

      const request = new Request('http://localhost/api/contractor/equipment');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Feature locked');
      expect(data.requiredTier).toBe('pro');
    });

    it('should allow equipment access for Pro tier', async () => {
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
        feature: 'equipment',
      });

      vi.mocked(prisma.contractorEquipment.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/contractor/equipment');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.equipment).toEqual([]);
    });
  });

  describe('POST /api/contractor/equipment - Feature Gate & Limits', () => {
    it('should block equipment creation for Starter tier', async () => {
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
        feature: 'equipment',
        reason: 'Equipment management requires Pro plan or higher',
      });

      const request = new Request('http://localhost/api/contractor/equipment', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Drill Press',
          type: 'power_tool',
          status: 'available',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Feature locked');
    });

    it('should block equipment creation when Pro tier limit reached', async () => {
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
        feature: 'equipment',
      });

      vi.mocked(checkLimit).mockResolvedValue({
        allowed: false,
        current: 20,
        limit: 20,
        remaining: 0,
        percentage: 100,
        isApproaching: false,
        isAtLimit: true,
      });

      const request = new Request('http://localhost/api/contractor/equipment', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Drill Press',
          type: 'power_tool',
          status: 'available',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Limit reached');
      expect(data.current).toBe(20);
      expect(data.limit).toBe(20);
    });

    it('should allow equipment creation for Pro tier within limits', async () => {
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
        feature: 'equipment',
      });

      vi.mocked(checkLimit).mockResolvedValue({
        allowed: true,
        current: 10,
        limit: 20,
        remaining: 10,
        percentage: 50,
        isApproaching: false,
        isAtLimit: false,
      });

      vi.mocked(prisma.contractorEquipment.create).mockResolvedValue({
        id: 'equipment-1',
        name: 'Drill Press',
        type: 'power_tool',
        status: 'available',
      } as any);

      const request = new Request('http://localhost/api/contractor/equipment', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Drill Press',
          type: 'power_tool',
          status: 'available',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.equipment.id).toBe('equipment-1');
      expect(incrementEquipmentCount).toHaveBeenCalledWith('contractor-1');
    });

    it('should allow unlimited equipment for Enterprise tier', async () => {
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
        feature: 'equipment',
      });

      vi.mocked(checkLimit).mockResolvedValue({
        allowed: true,
        current: 50,
        limit: -1, // unlimited
        remaining: Infinity,
        percentage: 0,
        isApproaching: false,
        isAtLimit: false,
      });

      vi.mocked(prisma.contractorEquipment.create).mockResolvedValue({
        id: 'equipment-1',
        name: 'Drill Press',
        type: 'power_tool',
        status: 'available',
      } as any);

      const request = new Request('http://localhost/api/contractor/equipment', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Drill Press',
          type: 'power_tool',
          status: 'available',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(incrementEquipmentCount).toHaveBeenCalledWith('contractor-1');
    });
  });
});
