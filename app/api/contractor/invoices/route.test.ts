/**
 * Tests for Contractor Invoices API
 * 
 * Tests subscription limit enforcement for invoice creation
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
    contractorInvoice: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/contractor-feature-gate', () => ({
  checkLimit: jest.fn(),
}));

jest.mock('@/lib/services/contractor-usage-tracker', () => ({
  incrementInvoiceCount: jest.fn(),
}));

import { POST } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementInvoiceCount } from '@/lib/services/contractor-usage-tracker';

describe('POST /api/contractor/invoices', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockCheckLimit = checkLimit as jest.MockedFunction<typeof checkLimit>;
  const mockIncrementInvoiceCount = incrementInvoiceCount as jest.MockedFunction<typeof incrementInvoiceCount>;

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

  const mockInvoiceData = {
    customerId: 'customer-123',
    lineItems: [
      {
        id: '1',
        description: 'Kitchen Remodel',
        quantity: 1,
        unitPrice: 5000,
        type: 'labor',
      },
    ],
    subtotal: 5000,
    taxRate: 8.5,
    taxAmount: 425,
    total: 5425,
    dueDate: '2024-12-31',
    notes: 'Payment due upon completion',
    terms: 'Net 30',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as any);
    mockPrisma.contractorProfile.findUnique.mockResolvedValue(mockContractorProfile as any);
    mockPrisma.contractorInvoice.findFirst.mockResolvedValue(null);
  });

  it('should create invoice when within limit', async () => {
    // Mock limit check - within limit
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 15,
      limit: 20,
      remaining: 5,
      percentage: 75,
      isApproaching: false,
      isAtLimit: false,
    });

    const mockCreatedInvoice = {
      id: 'invoice-123',
      invoiceNumber: 'INV-0001',
      contractorId: 'contractor-123',
      ...mockInvoiceData,
      status: 'draft',
      amountDue: 5425,
      createdAt: new Date(),
    };

    mockPrisma.contractorInvoice.create.mockResolvedValue(mockCreatedInvoice as any);

    const request = new Request('http://localhost/api/contractor/invoices', {
      method: 'POST',
      body: JSON.stringify(mockInvoiceData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.invoice).toBeDefined();
    expect(data.invoice.id).toBe('invoice-123');
    expect(data.invoice.invoiceNumber).toBe('INV-0001');
    expect(mockIncrementInvoiceCount).toHaveBeenCalledWith('contractor-123');
  });

  it('should reject invoice creation when limit reached', async () => {
    // Mock limit check - at limit
    mockCheckLimit.mockResolvedValue({
      allowed: false,
      current: 20,
      limit: 20,
      remaining: 0,
      percentage: 100,
      isApproaching: false,
      isAtLimit: true,
    });

    const request = new Request('http://localhost/api/contractor/invoices', {
      method: 'POST',
      body: JSON.stringify(mockInvoiceData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('SUBSCRIPTION_LIMIT_REACHED');
    expect(data.message).toContain('reached your limit of 20 invoices this month');
    expect(data.feature).toBe('invoicesPerMonth');
    expect(data.upgradeUrl).toBe('/contractor/settings/subscription');
    expect(mockPrisma.contractorInvoice.create).not.toHaveBeenCalled();
    expect(mockIncrementInvoiceCount).not.toHaveBeenCalled();
  });

  it('should return 401 for unauthorized users', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/invoices', {
      method: 'POST',
      body: JSON.stringify(mockInvoiceData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when contractor profile not found', async () => {
    mockPrisma.contractorProfile.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/contractor/invoices', {
      method: 'POST',
      body: JSON.stringify(mockInvoiceData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Contractor profile not found');
  });

  it('should increment invoice count after successful creation', async () => {
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 10,
      limit: 20,
      remaining: 10,
      percentage: 50,
      isApproaching: false,
      isAtLimit: false,
    });

    const mockCreatedInvoice = {
      id: 'invoice-456',
      invoiceNumber: 'INV-0002',
      contractorId: 'contractor-123',
      ...mockInvoiceData,
      status: 'draft',
      amountDue: 5425,
      createdAt: new Date(),
    };

    mockPrisma.contractorInvoice.create.mockResolvedValue(mockCreatedInvoice as any);

    const request = new Request('http://localhost/api/contractor/invoices', {
      method: 'POST',
      body: JSON.stringify(mockInvoiceData),
    });

    await POST(request);

    expect(mockIncrementInvoiceCount).toHaveBeenCalledWith('contractor-123');
    expect(mockIncrementInvoiceCount).toHaveBeenCalledTimes(1);
  });

  it('should return 400 for missing required fields', async () => {
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 5,
      limit: 20,
      remaining: 15,
      percentage: 25,
      isApproaching: false,
      isAtLimit: false,
    });

    const incompleteData = {
      customerId: 'customer-123',
      // Missing lineItems, total, and dueDate
    };

    const request = new Request('http://localhost/api/contractor/invoices', {
      method: 'POST',
      body: JSON.stringify(incompleteData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
    expect(mockPrisma.contractorInvoice.create).not.toHaveBeenCalled();
    expect(mockIncrementInvoiceCount).not.toHaveBeenCalled();
  });

  it('should handle Pro tier with unlimited invoices', async () => {
    // Mock Pro tier contractor
    mockPrisma.contractorProfile.findUnique.mockResolvedValue({
      id: 'contractor-123',
      userId: 'user-123',
      subscriptionTier: 'pro',
    } as any);

    // Mock limit check - unlimited (-1)
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      current: 50,
      limit: -1,
      remaining: -1,
      percentage: 0,
      isApproaching: false,
      isAtLimit: false,
    });

    const mockCreatedInvoice = {
      id: 'invoice-789',
      invoiceNumber: 'INV-0003',
      contractorId: 'contractor-123',
      ...mockInvoiceData,
      status: 'draft',
      amountDue: 5425,
      createdAt: new Date(),
    };

    mockPrisma.contractorInvoice.create.mockResolvedValue(mockCreatedInvoice as any);

    const request = new Request('http://localhost/api/contractor/invoices', {
      method: 'POST',
      body: JSON.stringify(mockInvoiceData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.invoice).toBeDefined();
    expect(mockIncrementInvoiceCount).toHaveBeenCalledWith('contractor-123');
  });
});
