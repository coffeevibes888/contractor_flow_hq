/**
 * Tests for Limit Check API
 * 
 * Tests the POST /api/contractor/subscription/check-limit endpoint
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
  },
}));

jest.mock('@/lib/services/contractor-feature-gate', () => ({
  checkLimit: jest.fn(),
}));

jest.mock('@/lib/security/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
  getClientIdentifier: jest.fn(),
  createRateLimitHeaders: jest.fn(),
  RATE_LIMIT_CONFIGS: {
    api: { windowMs: 60000, maxRequests: 100 },
  },
}));

import { POST } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
} from '@/lib/security/rate-limiter';

describe('POST /api/contractor/subscription/check-limit', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockCheckLimit = checkLimit as jest.MockedFunction<typeof checkLimit>;
  const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
  const mockGetClientIdentifier = getClientIdentifier as jest.MockedFunction<typeof getClientIdentifier>;
  const mockCreateRateLimitHeaders = createRateLimitHeaders as jest.MockedFunction<typeof createRateLimitHeaders>;

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'contractor@example.com',
    },
  };

  const mockContractor = {
    id: 'contractor-123',
    subscriptionTier: 'starter',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockAuth.mockResolvedValue(mockSession as any);
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 99,
      resetIn: 60000,
    });
    mockGetClientIdentifier.mockReturnValue('127.0.0.1');
    mockCreateRateLimitHeaders.mockReturnValue(new Headers());
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 if rate limit is exceeded', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetIn: 30000,
      });

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Rate limit exceeded');
      expect(data.resetIn).toBe(30); // seconds
    });

    it('should use user ID for rate limit identifier when authenticated', async () => {
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 15,
        remaining: 10,
        percentage: 33,
        isApproaching: false,
        isAtLimit: false,
      });

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      await POST(request as any);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'check-limit:user-123',
        expect.objectContaining({ windowMs: 60000, maxRequests: 100 })
      );
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
    });

    it('should return 400 if feature parameter is missing', async () => {
      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Missing or invalid "feature" parameter');
    });

    it('should return 400 if feature is not a string', async () => {
      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 123 }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Missing or invalid "feature" parameter');
    });

    it('should return 400 if feature is not valid', async () => {
      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'invalidFeature' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid feature');
    });

    it('should accept all valid feature types', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 0,
        limit: 10,
        remaining: 10,
        percentage: 0,
        isApproaching: false,
        isAtLimit: false,
      });

      const validFeatures = [
        'activeJobs',
        'invoicesPerMonth',
        'customers',
        'teamMembers',
        'inventoryItems',
        'equipmentItems',
        'activeLeads',
        'storageGB',
      ];

      for (const feature of validFeatures) {
        const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
          method: 'POST',
          body: JSON.stringify({ feature }),
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.feature).toBe(feature);
      }
    });
  });

  describe('Contractor Profile', () => {
    it('should return 404 if contractor profile not found', async () => {
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Contractor profile not found');
    });
  });

  describe('Limit Checking', () => {
    beforeEach(() => {
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
    });

    it('should return limit check result when action is allowed', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 15,
        remaining: 10,
        percentage: 33,
        isApproaching: false,
        isAtLimit: false,
      });

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.allowed).toBe(true);
      expect(data.current).toBe(5);
      expect(data.limit).toBe(15);
      expect(data.remaining).toBe(10);
      expect(data.percentage).toBe(33);
      expect(data.isApproaching).toBe(false);
      expect(data.isAtLimit).toBe(false);
      expect(data.unlimited).toBe(false);
      expect(data.feature).toBe('activeJobs');
      expect(data.message).toBeDefined();
    });

    it('should return limit check result when limit is reached', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: false,
        current: 15,
        limit: 15,
        remaining: 0,
        percentage: 100,
        isApproaching: false,
        isAtLimit: true,
      });

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.allowed).toBe(false);
      expect(data.current).toBe(15);
      expect(data.limit).toBe(15);
      expect(data.remaining).toBe(0);
      expect(data.isAtLimit).toBe(true);
      expect(data.message).toContain('reached your limit');
    });

    it('should return limit check result when approaching limit', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 13,
        limit: 15,
        remaining: 2,
        percentage: 87,
        isApproaching: true,
        isAtLimit: false,
      });

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.allowed).toBe(true);
      expect(data.isApproaching).toBe(true);
      expect(data.message).toContain('approaching your limit');
    });

    it('should indicate unlimited when limit is -1', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 100,
        limit: -1,
        remaining: -1,
        percentage: 0,
        isApproaching: false,
        isAtLimit: false,
      });

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.unlimited).toBe(true);
      expect(data.message).toContain('unlimited');
    });

    it('should call checkLimit with correct parameters', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 15,
        remaining: 10,
        percentage: 33,
        isApproaching: false,
        isAtLimit: false,
      });

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'customers' }),
      });

      await POST(request as any);

      expect(mockCheckLimit).toHaveBeenCalledWith('contractor-123', 'customers');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
    });

    it('should return 500 if checkLimit throws an error', async () => {
      mockCheckLimit.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to check limit');
      expect(data.error).toBe('Database error');
    });
  });

  describe('Response Headers', () => {
    beforeEach(() => {
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 15,
        remaining: 10,
        percentage: 33,
        isApproaching: false,
        isAtLimit: false,
      });
    });

    it('should include rate limit headers in successful response', async () => {
      const mockHeaders = new Headers();
      mockHeaders.set('X-RateLimit-Limit', '100');
      mockHeaders.set('X-RateLimit-Remaining', '99');
      mockHeaders.set('X-RateLimit-Reset', '60');
      
      mockCreateRateLimitHeaders.mockReturnValue(mockHeaders);

      const request = new Request('http://localhost/api/contractor/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ feature: 'activeJobs' }),
      });

      const response = await POST(request as any);

      expect(mockCreateRateLimitHeaders).toHaveBeenCalledWith(
        99,
        60000,
        100
      );
      expect(response.status).toBe(200);
    });
  });
});
