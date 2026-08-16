/**
 * Tests for Contractor Customers API
 * 
 * Tests subscription limit enforcement for customer creation
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
    contractorCustomer: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/contractor-feature-gate', () => ({
  checkLimit: jest.fn(),
}));

jest.mock('@/lib/services/contractor-usage-tracker', () => ({
  incrementCustomerCount: jest.fn(),
}));

jest.mock('@/lib/event-system', () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

import { POST, GET } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementCustomerCount } from '@/lib/services/contractor-usage-tracker';

describe('Customers API - GET', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/customers');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if contractor profile not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/customers');
    const response = await GET(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Contractor profile not found');
  });

  it('should return customers list', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-1',
    } as any);
    mockPrisma.contractorCustomer.findMany.mockResolvedValue([
      {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        _count: { jobs: 2 },
      },
    ] as any);

    const request = new Request('http://localhost/api/contractor/customers');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0].name).toBe('John Doe');
  });
});

describe('Customers API - POST', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockCheckLimit = checkLimit as jest.MockedFunction<typeof checkLimit>;
  const mockIncrementCustomerCount = incrementCustomerCount as jest.MockedFunction<typeof incrementCustomerCount>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if subscription limit reached', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-1',
      subscriptionTier: 'starter',
    } as any);
    mockCheckLimit.mockResolvedValue({
      allowed: false,
      current: 50,
      limit: 50,
      remaining: 0,
    });

    const request = new Request('http://localhost/api/contractor/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('SUBSCRIPTION_LIMIT_REACHED');
    expect(data.feature).toBe('customers');
    expect(data.limit).toBe(50);
  });

  it('should return 400 if customer with email already exists', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-1',
      subscriptionTier: 'pro',
    } as any);
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 10,
      limit: 500,
      remaining: 490,
    });
    mockPrisma.contractorCustomer.findFirst.mockResolvedValue({
      id: 'existing-customer',
      email: 'test@example.com',
    } as any);

    const request = new Request('http://localhost/api/contractor/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Customer with this email already exists');
  });

  it('should create customer and increment counter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-1',
      subscriptionTier: 'pro',
    } as any);
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 10,
      limit: 500,
      remaining: 490,
    });
    mockPrisma.contractorCustomer.findFirst.mockResolvedValue(null);
    mockPrisma.contractorCustomer.create.mockResolvedValue({
      id: 'customer-1',
      name: 'Test Customer',
      email: 'test@example.com',
      contractorId: 'contractor-1',
    } as any);

    const request = new Request('http://localhost/api/contractor/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555-1234',
        address: '123 Main St',
        status: 'lead',
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.customer.name).toBe('Test Customer');
    expect(mockIncrementCustomerCount).toHaveBeenCalledWith('contractor-1');
  });

  it('should allow unlimited customers for enterprise tier', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-1',
      subscriptionTier: 'enterprise',
    } as any);
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 1000,
      limit: -1, // unlimited
      remaining: -1,
    });
    mockPrisma.contractorCustomer.findFirst.mockResolvedValue(null);
    mockPrisma.contractorCustomer.create.mockResolvedValue({
      id: 'customer-1',
      name: 'Test Customer',
      email: 'test@example.com',
      contractorId: 'contractor-1',
    } as any);

    const request = new Request('http://localhost/api/contractor/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Customer',
        email: 'test@example.com',
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockIncrementCustomerCount).toHaveBeenCalledWith('contractor-1');
  });
});
