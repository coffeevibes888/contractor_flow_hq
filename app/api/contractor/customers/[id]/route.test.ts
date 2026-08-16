/**
 * Tests for Contractor Customer DELETE API
 * 
 * Tests customer deletion and counter decrement
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
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/contractor-usage-tracker', () => ({
  decrementCustomerCount: jest.fn(),
}));

import { DELETE } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { decrementCustomerCount } from '@/lib/services/contractor-usage-tracker';

describe('Customer DELETE API', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockDecrementCustomerCount = decrementCustomerCount as jest.MockedFunction<typeof decrementCustomerCount>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/customers/customer-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: 'customer-1' } });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if contractor profile not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/customers/customer-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: 'customer-1' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Contractor profile not found');
  });

  it('should return 404 if customer not found or does not belong to contractor', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-1',
    } as any);
    mockPrisma.contractorCustomer.findFirst.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/customers/customer-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: 'customer-1' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Customer not found');
  });

  it('should delete customer and decrement counter', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-1',
    } as any);
    mockPrisma.contractorCustomer.findFirst.mockResolvedValue({
      id: 'customer-1',
      contractorId: 'contractor-1',
      name: 'Test Customer',
    } as any);
    mockPrisma.contractorCustomer.delete.mockResolvedValue({
      id: 'customer-1',
    } as any);

    const request = new Request('http://localhost/api/contractor/customers/customer-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: 'customer-1' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Customer deleted successfully');
    expect(mockDecrementCustomerCount).toHaveBeenCalledWith('contractor-1');
  });

  it('should handle deletion errors gracefully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'contractor' },
    } as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-1',
    } as any);
    mockPrisma.contractorCustomer.findFirst.mockResolvedValue({
      id: 'customer-1',
      contractorId: 'contractor-1',
    } as any);
    mockPrisma.contractorCustomer.delete.mockRejectedValue(
      new Error('Database error')
    );

    const request = new Request('http://localhost/api/contractor/customers/customer-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: 'customer-1' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete customer');
  });
});
