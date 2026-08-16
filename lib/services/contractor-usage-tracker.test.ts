/**
 * Unit Tests for Contractor Usage Tracker Service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Prisma before importing the service
jest.mock('@/db/prisma', () => ({
  prisma: {
    contractorUsageTracking: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import {
  incrementJobCount,
  incrementInvoiceCount,
  incrementCustomerCount,
  incrementTeamMemberCount,
  incrementInventoryCount,
  incrementEquipmentCount,
  incrementLeadCount,
  decrementJobCount,
  decrementCustomerCount,
  decrementTeamMemberCount,
  decrementInventoryCount,
  decrementEquipmentCount,
  decrementLeadCount,
  getCurrentUsage,
  resetMonthlyCounters,
  batchResetMonthlyCounters,
  setCounterValue,
} from './contractor-usage-tracker';
import { prisma } from '@/db/prisma';

describe('Contractor Usage Tracker Service', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const testContractorId = 'test-contractor-123';
  const mockDate = new Date('2024-01-15T10:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create mock usage tracking record
  const createMockUsageRecord = (overrides = {}) => ({
    id: 'usage-1',
    contractorId: testContractorId,
    activeJobsCount: 0,
    invoicesThisMonth: 0,
    totalCustomers: 0,
    teamMembersCount: 0,
    inventoryCount: 0,
    equipmentCount: 0,
    activeLeadsCount: 0,
    lastResetDate: mockDate,
    updatedAt: mockDate,
    ...overrides,
  });

  describe('ensureUsageTrackingExists (via increment functions)', () => {
    it('should create usage tracking record if it does not exist', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(null);
      mockPrisma.contractorUsageTracking.create.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 1 }) as any);

      await incrementJobCount(testContractorId);

      expect(mockPrisma.contractorUsageTracking.create).toHaveBeenCalledWith({
        data: {
          contractorId: testContractorId,
          activeJobsCount: 0,
          invoicesThisMonth: 0,
          totalCustomers: 0,
          teamMembersCount: 0,
          inventoryCount: 0,
          equipmentCount: 0,
          activeLeadsCount: 0,
        },
      });
      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalled();
    });

    it('should not create duplicate record if already exists', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 1 }) as any);

      await incrementJobCount(testContractorId);

      expect(mockPrisma.contractorUsageTracking.create).not.toHaveBeenCalled();
      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalled();
    });

    it('should handle race condition when creating record', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(null);
      const raceConditionError = new Error('Unique constraint failed') as any;
      raceConditionError.code = 'P2002';
      mockPrisma.contractorUsageTracking.create.mockRejectedValue(raceConditionError);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 1 }) as any);

      await incrementJobCount(testContractorId);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalled();
    });
  });

  describe('Increment Functions', () => {
    beforeEach(() => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
    });

    describe('incrementJobCount', () => {
      it('should increment active jobs count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 1 }) as any);

        await incrementJobCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            activeJobsCount: {
              increment: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(incrementJobCount(testContractorId)).rejects.toThrow('Failed to increment job count');
      });
    });

    describe('incrementInvoiceCount', () => {
      it('should increment invoices this month count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ invoicesThisMonth: 1 }) as any);

        await incrementInvoiceCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            invoicesThisMonth: {
              increment: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(incrementInvoiceCount(testContractorId)).rejects.toThrow('Failed to increment invoice count');
      });
    });

    describe('incrementCustomerCount', () => {
      it('should increment total customers count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ totalCustomers: 1 }) as any);

        await incrementCustomerCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            totalCustomers: {
              increment: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(incrementCustomerCount(testContractorId)).rejects.toThrow('Failed to increment customer count');
      });
    });

    describe('incrementTeamMemberCount', () => {
      it('should increment team members count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ teamMembersCount: 1 }) as any);

        await incrementTeamMemberCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            teamMembersCount: {
              increment: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(incrementTeamMemberCount(testContractorId)).rejects.toThrow('Failed to increment team member count');
      });
    });

    describe('incrementInventoryCount', () => {
      it('should increment inventory count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ inventoryCount: 1 }) as any);

        await incrementInventoryCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            inventoryCount: {
              increment: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(incrementInventoryCount(testContractorId)).rejects.toThrow('Failed to increment inventory count');
      });
    });

    describe('incrementEquipmentCount', () => {
      it('should increment equipment count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ equipmentCount: 1 }) as any);

        await incrementEquipmentCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            equipmentCount: {
              increment: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(incrementEquipmentCount(testContractorId)).rejects.toThrow('Failed to increment equipment count');
      });
    });

    describe('incrementLeadCount', () => {
      it('should increment active leads count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeLeadsCount: 1 }) as any);

        await incrementLeadCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            activeLeadsCount: {
              increment: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(incrementLeadCount(testContractorId)).rejects.toThrow('Failed to increment lead count');
      });
    });
  });

  describe('Decrement Functions', () => {
    beforeEach(() => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord({
        activeJobsCount: 5,
        totalCustomers: 10,
        teamMembersCount: 3,
        inventoryCount: 50,
        equipmentCount: 10,
        activeLeadsCount: 20,
      }) as any);
    });

    describe('decrementJobCount', () => {
      it('should decrement active jobs count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 4 }) as any);

        await decrementJobCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            activeJobsCount: {
              decrement: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(decrementJobCount(testContractorId)).rejects.toThrow('Failed to decrement job count');
      });
    });

    describe('decrementCustomerCount', () => {
      it('should decrement total customers count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ totalCustomers: 9 }) as any);

        await decrementCustomerCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            totalCustomers: {
              decrement: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(decrementCustomerCount(testContractorId)).rejects.toThrow('Failed to decrement customer count');
      });
    });

    describe('decrementTeamMemberCount', () => {
      it('should decrement team members count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ teamMembersCount: 2 }) as any);

        await decrementTeamMemberCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            teamMembersCount: {
              decrement: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(decrementTeamMemberCount(testContractorId)).rejects.toThrow('Failed to decrement team member count');
      });
    });

    describe('decrementInventoryCount', () => {
      it('should decrement inventory count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ inventoryCount: 49 }) as any);

        await decrementInventoryCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            inventoryCount: {
              decrement: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(decrementInventoryCount(testContractorId)).rejects.toThrow('Failed to decrement inventory count');
      });
    });

    describe('decrementEquipmentCount', () => {
      it('should decrement equipment count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ equipmentCount: 9 }) as any);

        await decrementEquipmentCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            equipmentCount: {
              decrement: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(decrementEquipmentCount(testContractorId)).rejects.toThrow('Failed to decrement equipment count');
      });
    });

    describe('decrementLeadCount', () => {
      it('should decrement active leads count', async () => {
        mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeLeadsCount: 19 }) as any);

        await decrementLeadCount(testContractorId);

        expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
          where: { contractorId: testContractorId },
          data: {
            activeLeadsCount: {
              decrement: 1,
            },
          },
        });
      });

      it('should throw error on database failure', async () => {
        mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

        await expect(decrementLeadCount(testContractorId)).rejects.toThrow('Failed to decrement lead count');
      });
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current usage data for a contractor', async () => {
      const mockUsage = createMockUsageRecord({
        activeJobsCount: 10,
        invoicesThisMonth: 15,
        totalCustomers: 30,
        teamMembersCount: 4,
        inventoryCount: 100,
        equipmentCount: 15,
        activeLeadsCount: 25,
      });

      mockPrisma.contractorUsageTracking.findUnique
        .mockResolvedValueOnce(null) // ensureUsageTrackingExists check
        .mockResolvedValueOnce(mockUsage as any); // actual query

      mockPrisma.contractorUsageTracking.create.mockResolvedValue(createMockUsageRecord() as any);

      const usage = await getCurrentUsage(testContractorId);

      expect(usage).toEqual({
        activeJobsCount: 10,
        invoicesThisMonth: 15,
        totalCustomers: 30,
        teamMembersCount: 4,
        inventoryCount: 100,
        equipmentCount: 15,
        activeLeadsCount: 25,
        lastResetDate: mockDate,
      });
    });

    it('should return zero values for new contractor', async () => {
      mockPrisma.contractorUsageTracking.findUnique
        .mockResolvedValueOnce(null) // ensureUsageTrackingExists check
        .mockResolvedValueOnce(createMockUsageRecord() as any); // actual query

      mockPrisma.contractorUsageTracking.create.mockResolvedValue(createMockUsageRecord() as any);

      const usage = await getCurrentUsage(testContractorId);

      expect(usage.activeJobsCount).toBe(0);
      expect(usage.invoicesThisMonth).toBe(0);
      expect(usage.totalCustomers).toBe(0);
      expect(usage.teamMembersCount).toBe(0);
    });

    it('should throw error if usage record not found after creation', async () => {
      mockPrisma.contractorUsageTracking.findUnique
        .mockResolvedValueOnce(null) // ensureUsageTrackingExists check
        .mockResolvedValueOnce(null); // actual query returns null

      mockPrisma.contractorUsageTracking.create.mockResolvedValue(createMockUsageRecord() as any);

      await expect(getCurrentUsage(testContractorId)).rejects.toThrow('Failed to get current usage');
    });

    it('should throw error on database failure', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(getCurrentUsage(testContractorId)).rejects.toThrow('Failed to get current usage');
    });
  });

  describe('resetMonthlyCounters', () => {
    it('should reset invoicesThisMonth to zero', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord({
        invoicesThisMonth: 50,
      }) as any);

      const newResetDate = new Date('2024-02-15T10:00:00Z');
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({
        invoicesThisMonth: 0,
        lastResetDate: newResetDate,
      }) as any);

      await resetMonthlyCounters(testContractorId);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          invoicesThisMonth: 0,
          lastResetDate: expect.any(Date),
        },
      });
    });

    it('should update lastResetDate', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord() as any);

      await resetMonthlyCounters(testContractorId);

      const updateCall = mockPrisma.contractorUsageTracking.update.mock.calls[0][0];
      expect(updateCall.data.lastResetDate).toBeInstanceOf(Date);
    });

    it('should create usage record if it does not exist before resetting', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(null);
      mockPrisma.contractorUsageTracking.create.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord() as any);

      await resetMonthlyCounters(testContractorId);

      expect(mockPrisma.contractorUsageTracking.create).toHaveBeenCalled();
      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

      await expect(resetMonthlyCounters(testContractorId)).rejects.toThrow('Failed to reset monthly counters');
    });
  });

  describe('batchResetMonthlyCounters', () => {
    it('should reset counters for multiple contractors', async () => {
      const contractorIds = ['contractor-1', 'contractor-2', 'contractor-3'];

      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord() as any);

      const successCount = await batchResetMonthlyCounters(contractorIds);

      expect(successCount).toBe(3);
      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledTimes(3);
    });

    it('should continue processing on individual failures', async () => {
      const contractorIds = ['contractor-1', 'contractor-2', 'contractor-3'];

      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update
        .mockResolvedValueOnce(createMockUsageRecord() as any) // contractor-1 succeeds
        .mockRejectedValueOnce(new Error('Database error')) // contractor-2 fails
        .mockResolvedValueOnce(createMockUsageRecord() as any); // contractor-3 succeeds

      const successCount = await batchResetMonthlyCounters(contractorIds);

      expect(successCount).toBe(2);
      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledTimes(3);
    });

    it('should return zero for empty array', async () => {
      const successCount = await batchResetMonthlyCounters([]);

      expect(successCount).toBe(0);
      expect(mockPrisma.contractorUsageTracking.update).not.toHaveBeenCalled();
    });

    it('should handle all failures gracefully', async () => {
      const contractorIds = ['contractor-1', 'contractor-2'];

      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

      const successCount = await batchResetMonthlyCounters(contractorIds);

      expect(successCount).toBe(0);
    });
  });

  describe('setCounterValue', () => {
    beforeEach(() => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
    });

    it('should set activeJobsCount to specific value', async () => {
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 25 }) as any);

      await setCounterValue(testContractorId, 'activeJobsCount', 25);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          activeJobsCount: 25,
        },
      });
    });

    it('should set invoicesThisMonth to specific value', async () => {
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ invoicesThisMonth: 100 }) as any);

      await setCounterValue(testContractorId, 'invoicesThisMonth', 100);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          invoicesThisMonth: 100,
        },
      });
    });

    it('should set totalCustomers to specific value', async () => {
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ totalCustomers: 500 }) as any);

      await setCounterValue(testContractorId, 'totalCustomers', 500);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          totalCustomers: 500,
        },
      });
    });

    it('should set teamMembersCount to specific value', async () => {
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ teamMembersCount: 6 }) as any);

      await setCounterValue(testContractorId, 'teamMembersCount', 6);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          teamMembersCount: 6,
        },
      });
    });

    it('should set inventoryCount to specific value', async () => {
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ inventoryCount: 200 }) as any);

      await setCounterValue(testContractorId, 'inventoryCount', 200);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          inventoryCount: 200,
        },
      });
    });

    it('should set equipmentCount to specific value', async () => {
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ equipmentCount: 20 }) as any);

      await setCounterValue(testContractorId, 'equipmentCount', 20);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          equipmentCount: 20,
        },
      });
    });

    it('should set activeLeadsCount to specific value', async () => {
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeLeadsCount: 100 }) as any);

      await setCounterValue(testContractorId, 'activeLeadsCount', 100);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          activeLeadsCount: 100,
        },
      });
    });

    it('should allow setting counter to zero', async () => {
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 0 }) as any);

      await setCounterValue(testContractorId, 'activeJobsCount', 0);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: {
          activeJobsCount: 0,
        },
      });
    });

    it('should create usage record if it does not exist', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(null);
      mockPrisma.contractorUsageTracking.create.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 10 }) as any);

      await setCounterValue(testContractorId, 'activeJobsCount', 10);

      expect(mockPrisma.contractorUsageTracking.create).toHaveBeenCalled();
      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Database error'));

      await expect(setCounterValue(testContractorId, 'activeJobsCount', 10)).rejects.toThrow('Failed to set counter value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid increments correctly', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord() as any);

      await Promise.all([
        incrementJobCount(testContractorId),
        incrementJobCount(testContractorId),
        incrementJobCount(testContractorId),
      ]);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed increment and decrement operations', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord({ activeJobsCount: 5 }) as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord() as any);

      await incrementJobCount(testContractorId);
      await decrementJobCount(testContractorId);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenNthCalledWith(1, {
        where: { contractorId: testContractorId },
        data: { activeJobsCount: { increment: 1 } },
      });
      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenNthCalledWith(2, {
        where: { contractorId: testContractorId },
        data: { activeJobsCount: { decrement: 1 } },
      });
    });

    it('should handle operations on different counters simultaneously', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord() as any);

      await Promise.all([
        incrementJobCount(testContractorId),
        incrementInvoiceCount(testContractorId),
        incrementCustomerCount(testContractorId),
        incrementTeamMemberCount(testContractorId),
      ]);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledTimes(4);
    });

    it('should handle very large counter values', async () => {
      const largeValue = 999999;
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ activeJobsCount: largeValue }) as any);

      await setCounterValue(testContractorId, 'activeJobsCount', largeValue);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: testContractorId },
        data: { activeJobsCount: largeValue },
      });
    });

    it('should handle contractor ID with special characters', async () => {
      const specialContractorId = 'contractor-123-abc_def';
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord({ contractorId: specialContractorId }) as any);
      mockPrisma.contractorUsageTracking.update.mockResolvedValue(createMockUsageRecord({ contractorId: specialContractorId }) as any);

      await incrementJobCount(specialContractorId);

      expect(mockPrisma.contractorUsageTracking.update).toHaveBeenCalledWith({
        where: { contractorId: specialContractorId },
        data: { activeJobsCount: { increment: 1 } },
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide descriptive error messages', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockRejectedValue(new Error('Connection timeout'));

      await expect(incrementJobCount(testContractorId)).rejects.toThrow('Failed to increment job count: Connection timeout');
    });

    it('should handle unknown errors gracefully', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockResolvedValue(createMockUsageRecord() as any);
      mockPrisma.contractorUsageTracking.update.mockRejectedValue('Unknown error');

      await expect(incrementJobCount(testContractorId)).rejects.toThrow('Failed to increment job count: Unknown error');
    });

    it('should handle null contractor ID gracefully', async () => {
      mockPrisma.contractorUsageTracking.findUnique.mockRejectedValue(new Error('Invalid contractor ID'));

      await expect(incrementJobCount('')).rejects.toThrow();
    });
  });
});
