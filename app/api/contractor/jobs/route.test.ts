/**
 * Tests for Contractor Jobs API
 * 
 * Tests subscription limit enforcement for job creation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findUnique: jest.fn(),
    },
    contractorJob: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/contractor-feature-gate', () => ({
  checkLimit: jest.fn(),
}));

jest.mock('@/lib/services/contractor-usage-tracker', () => ({
  incrementJobCount: jest.fn(),
}));

jest.mock('@/lib/event-system', () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

import { POST } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementJobCount } from '@/lib/services/contractor-usage-tracker';

describe('POST /api/contractor/jobs', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockCheckLimit = checkLimit as jest.MockedFunction<typeof checkLimit>;
  const mockIncrementJobCount = incrementJobCount as jest.MockedFunction<typeof incrementJobCount>;

  const mockSession = {
    user: {
      id: 'user-123',
      role: 'contractor',
    },
  };

  const mockContractorProfile = {
    id: 'contractor-123',
    userId: 'user-123',
    subscriptionTier: 'starter',
  };

  const mockJobData = {
    title: 'Kitchen Remodel',
    description: 'Complete kitchen renovation',
    jobType: 'Kitchen',
    customerId: 'customer-123',
    address: '123 Main St',
    city: 'Las Vegas',
    state: 'NV',
    zipCode: '89101',
    estimatedCost: 5000,
    status: 'quoted',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue(mockContractorProfile as any);
    mockPrisma.contractorJob.findFirst.mockResolvedValue(null);
  });

  it('should create job when within limit', async () => {
    // Mock limit check - within limit
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 10,
      limit: 15,
      remaining: 5,
      percentage: 66.67,
      isApproaching: false,
      isAtLimit: false,
    });

    const mockCreatedJob = {
      id: 'job-123',
      ...mockJobData,
      jobNumber: 'JOB-2024-0001',
      contractorId: 'contractor-123',
      createdAt: new Date(),
      customer: {
        id: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
      },
    };

    mockPrisma.contractorJob.create.mockResolvedValue(mockCreatedJob as any);

    const request = new Request('http://localhost/api/contractor/jobs', {
      method: 'POST',
      body: JSON.stringify(mockJobData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.job).toBeDefined();
    expect(data.job.id).toBe('job-123');
    expect(mockIncrementJobCount).toHaveBeenCalledWith('contractor-123');
  });

  it('should reject job creation when limit reached', async () => {
    // Mock limit check - at limit
    mockCheckLimit.mockResolvedValue({
      allowed: false,
      current: 15,
      limit: 15,
      remaining: 0,
      percentage: 100,
      isApproaching: false,
      isAtLimit: true,
    });

    const request = new Request('http://localhost/api/contractor/jobs', {
      method: 'POST',
      body: JSON.stringify(mockJobData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('SUBSCRIPTION_LIMIT_REACHED');
    expect(data.message).toContain('reached your limit of 15 active jobs');
    expect(data.feature).toBe('activeJobs');
    expect(data.upgradeUrl).toBe('/contractor/settings/subscription');
    expect(mockPrisma.contractorJob.create).not.toHaveBeenCalled();
    expect(mockIncrementJobCount).not.toHaveBeenCalled();
  });

  it('should return 401 for unauthorized users', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/jobs', {
      method: 'POST',
      body: JSON.stringify(mockJobData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when contractor profile not found', async () => {
    mockPrisma.contractorProfile.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/jobs', {
      method: 'POST',
      body: JSON.stringify(mockJobData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Contractor profile not found');
  });

  it('should increment job count after successful creation', async () => {
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 5,
      limit: 15,
      remaining: 10,
      percentage: 33.33,
      isApproaching: false,
      isAtLimit: false,
    });

    const mockCreatedJob = {
      id: 'job-456',
      ...mockJobData,
      jobNumber: 'JOB-2024-0002',
      contractorId: 'contractor-123',
      createdAt: new Date(),
      customer: {
        id: 'customer-123',
        name: 'Jane Smith',
        email: 'jane@example.com',
      },
    };

    mockPrisma.contractorJob.create.mockResolvedValue(mockCreatedJob as any);

    const request = new Request('http://localhost/api/contractor/jobs', {
      method: 'POST',
      body: JSON.stringify(mockJobData),
    });

    await POST(request);

    expect(mockIncrementJobCount).toHaveBeenCalledWith('contractor-123');
    expect(mockIncrementJobCount).toHaveBeenCalledTimes(1);
  });
});
