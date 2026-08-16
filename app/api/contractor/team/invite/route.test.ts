/**
 * Team Invitation API Tests
 * 
 * Tests subscription tier gating for team member invitations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findFirst: jest.fn(),
    },
    contractorTeamMember: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/contractor-feature-gate', () => ({
  checkLimit: jest.fn(),
  canAccessFeature: jest.fn(),
}));

import { POST } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { checkLimit, canAccessFeature } from '@/lib/services/contractor-feature-gate';

describe('POST /api/contractor/team/invite', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockCheckLimit = checkLimit as jest.MockedFunction<typeof checkLimit>;
  const mockCanAccessFeature = canAccessFeature as jest.MockedFunction<typeof canAccessFeature>;

  const createRequest = (body: any) => ({
    json: async () => body,
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest({ email: 'test@example.com', role: 'employee' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Unauthorized');
  });

  it('should reject Starter tier contractors (feature locked)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'contractor@example.com' },
    } as any);

    mockPrisma.contractorProfile.findFirst.mockResolvedValue({
      id: 'contractor-1',
      userId: 'user-1',
      subscriptionTier: 'starter',
    } as any);

    mockCanAccessFeature.mockResolvedValue({
      allowed: false,
      tier: 'starter',
      feature: 'teamManagement',
      reason: 'Feature requires Pro plan or higher',
    });

    const request = createRequest({ email: 'test@example.com', role: 'employee' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.featureLocked).toBe(true);
    expect(data.requiredTier).toBe('pro');
    expect(data.currentTier).toBe('starter');
    expect(data.message).toContain('Pro or Enterprise');
  });

  it('should reject Pro tier contractors at limit (6 members)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'contractor@example.com' },
    } as any);

    mockPrisma.contractorProfile.findFirst.mockResolvedValue({
      id: 'contractor-1',
      userId: 'user-1',
      subscriptionTier: 'pro',
    } as any);

    mockCanAccessFeature.mockResolvedValue({
      allowed: true,
      tier: 'pro',
      feature: 'teamManagement',
    });

    mockCheckLimit.mockResolvedValue({
      allowed: false,
      current: 6,
      limit: 6,
      remaining: 0,
      percentage: 100,
      isApproaching: false,
      isAtLimit: true,
    });

    const request = createRequest({ email: 'test@example.com', role: 'employee' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.featureLocked).toBe(true);
    expect(data.limitReached).toBe(true);
    expect(data.current).toBe(6);
    expect(data.limit).toBe(6);
    expect(data.requiredTier).toBe('enterprise');
    expect(data.message).toContain('6 team members');
    expect(data.message).toContain('Enterprise');
  });

  it('should allow Pro tier contractors under limit', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'contractor@example.com' },
    } as any);

    mockPrisma.contractorProfile.findFirst.mockResolvedValue({
      id: 'contractor-1',
      userId: 'user-1',
      subscriptionTier: 'pro',
    } as any);

    mockCanAccessFeature.mockResolvedValue({
      allowed: true,
      tier: 'pro',
      feature: 'teamManagement',
    });

    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 3,
      limit: 6,
      remaining: 3,
      percentage: 50,
      isApproaching: false,
      isAtLimit: false,
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.contractorTeamMember.findFirst.mockResolvedValue(null);

    mockPrisma.contractorTeamMember.create.mockResolvedValue({
      id: 'member-1',
      contractorId: 'contractor-1',
      userId: '',
      invitedEmail: 'test@example.com',
      role: 'employee',
      status: 'pending',
      permissions: [],
      createdAt: new Date(),
      user: null,
    } as any);

    const request = createRequest({ email: 'test@example.com', role: 'employee' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Invitation sent successfully');
    expect(data.member).toBeDefined();
  });

  it('should allow Enterprise tier contractors unlimited invitations', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'contractor@example.com' },
    } as any);

    mockPrisma.contractorProfile.findFirst.mockResolvedValue({
      id: 'contractor-1',
      userId: 'user-1',
      subscriptionTier: 'enterprise',
    } as any);

    mockCanAccessFeature.mockResolvedValue({
      allowed: true,
      tier: 'enterprise',
      feature: 'teamManagement',
    });

    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 50,
      limit: -1,
      remaining: Infinity,
      percentage: 0,
      isApproaching: false,
      isAtLimit: false,
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.contractorTeamMember.findFirst.mockResolvedValue(null);

    mockPrisma.contractorTeamMember.create.mockResolvedValue({
      id: 'member-1',
      contractorId: 'contractor-1',
      userId: '',
      invitedEmail: 'test@example.com',
      role: 'employee',
      status: 'pending',
      permissions: [],
      createdAt: new Date(),
      user: null,
    } as any);

    const request = createRequest({ email: 'test@example.com', role: 'employee' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Invitation sent successfully');
  });
});
