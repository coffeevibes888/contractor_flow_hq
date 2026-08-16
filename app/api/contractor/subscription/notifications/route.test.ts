/**
 * Integration Tests for Notifications API Endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/db/prisma', () => ({
  prisma: {
    contractorProfile: {
      findFirst: jest.fn(),
    },
    contractorNotification: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { GET, PATCH, DELETE } from './route';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

describe('Notifications API Endpoint', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'contractor@example.com',
    },
  };

  const mockContractor = {
    id: 'contractor-123',
  };

  const mockNotifications = [
    {
      id: 'notif-1',
      type: 'limit_warning',
      feature: 'activeJobs',
      message: 'You are approaching your active jobs limit',
      actionUrl: '/contractor/settings/subscription',
      read: false,
      createdAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'notif-2',
      type: 'limit_reached',
      feature: 'invoicesPerMonth',
      message: 'You have reached your invoice limit',
      actionUrl: '/contractor/settings/subscription',
      read: false,
      createdAt: new Date('2024-01-14T09:00:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/contractor/subscription/notifications', () => {
    it('should return unread notifications for authenticated contractor', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.findMany.mockResolvedValue(mockNotifications as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notifications).toHaveLength(2);
      expect(data.unreadCount).toBe(2);
      expect(data.notifications[0].id).toBe('notif-1');
      expect(data.notifications[1].id).toBe('notif-2');
    });

    it('should return notifications sorted by creation date (newest first)', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.findMany.mockResolvedValue(mockNotifications as any);

      const response = await GET();
      const data = await response.json();

      expect(data.notifications[0].createdAt).toBe('2024-01-15T10:00:00.000Z');
      expect(data.notifications[1].createdAt).toBe('2024-01-14T09:00:00.000Z');
      
      // Verify findMany was called with correct orderBy
      expect(mockPrisma.contractorNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should only return unread notifications', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.findMany.mockResolvedValue(mockNotifications as any);

      await GET();

      // Verify findMany was called with read: false filter
      expect(mockPrisma.contractorNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            contractorId: mockContractor.id,
            read: false,
          },
        })
      );
    });

    it('should return empty array when no unread notifications', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.findMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notifications).toHaveLength(0);
      expect(data.unreadCount).toBe(0);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });

    it('should return 404 if contractor profile not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Contractor profile not found');
    });

    it('should return 500 on internal server error', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to fetch notifications');
    });

    it('should include all notification fields in response', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.findMany.mockResolvedValue(mockNotifications as any);

      const response = await GET();
      const data = await response.json();

      const notification = data.notifications[0];
      expect(notification.id).toBeDefined();
      expect(notification.type).toBeDefined();
      expect(notification.feature).toBeDefined();
      expect(notification.message).toBeDefined();
      expect(notification.actionUrl).toBeDefined();
      expect(notification.read).toBeDefined();
      expect(notification.createdAt).toBeDefined();
    });
  });

  describe('PATCH /api/contractor/subscription/notifications', () => {
    const createMockRequest = (body: any) => {
      return {
        json: async () => body,
      } as NextRequest;
    };

    it('should mark notifications as read', async () => {
      const notificationIds = ['notif-1', 'notif-2'];
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.updateMany.mockResolvedValue({ count: 2 } as any);

      const request = createMockRequest({ notificationIds });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(2);
      expect(data.message).toContain('2 notification(s) as read');
    });

    it('should only update notifications belonging to the contractor', async () => {
      const notificationIds = ['notif-1', 'notif-2'];
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.updateMany.mockResolvedValue({ count: 2 } as any);

      const request = createMockRequest({ notificationIds });
      await PATCH(request);

      // Verify updateMany was called with contractor ID filter
      expect(mockPrisma.contractorNotification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: notificationIds },
          contractorId: mockContractor.id,
        },
        data: {
          read: true,
        },
      });
    });

    it('should return 400 if notificationIds is missing', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = createMockRequest({});
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('notificationIds');
    });

    it('should return 400 if notificationIds is not an array', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = createMockRequest({ notificationIds: 'notif-1' });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('array');
    });

    it('should return 400 if notificationIds array is empty', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = createMockRequest({ notificationIds: [] });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('cannot be empty');
    });

    it('should return 400 if notificationIds contains non-string values', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = createMockRequest({ notificationIds: ['notif-1', 123, 'notif-2'] });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('must be strings');
    });

    it('should return 400 if request body is invalid JSON', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as NextRequest;

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid JSON');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = createMockRequest({ notificationIds: ['notif-1'] });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });

    it('should return 404 if contractor profile not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(null);

      const request = createMockRequest({ notificationIds: ['notif-1'] });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Contractor profile not found');
    });

    it('should handle case where no notifications were updated', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.updateMany.mockResolvedValue({ count: 0 } as any);

      const request = createMockRequest({ notificationIds: ['invalid-id'] });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(0);
    });
  });

  describe('DELETE /api/contractor/subscription/notifications', () => {
    const createMockRequest = (body: any) => {
      return {
        json: async () => body,
      } as NextRequest;
    };

    it('should delete notifications', async () => {
      const notificationIds = ['notif-1', 'notif-2'];
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.deleteMany.mockResolvedValue({ count: 2 } as any);

      const request = createMockRequest({ notificationIds });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(2);
      expect(data.message).toContain('2 notification(s)');
    });

    it('should only delete notifications belonging to the contractor', async () => {
      const notificationIds = ['notif-1', 'notif-2'];
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.deleteMany.mockResolvedValue({ count: 2 } as any);

      const request = createMockRequest({ notificationIds });
      await DELETE(request);

      // Verify deleteMany was called with contractor ID filter
      expect(mockPrisma.contractorNotification.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: notificationIds },
          contractorId: mockContractor.id,
        },
      });
    });

    it('should return 400 if notificationIds is missing', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = createMockRequest({});
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('notificationIds');
    });

    it('should return 400 if notificationIds is not an array', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = createMockRequest({ notificationIds: 'notif-1' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('array');
    });

    it('should return 400 if notificationIds array is empty', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = createMockRequest({ notificationIds: [] });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('cannot be empty');
    });

    it('should return 400 if notificationIds contains non-string values', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = createMockRequest({ notificationIds: ['notif-1', 123, 'notif-2'] });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('must be strings');
    });

    it('should return 400 if request body is invalid JSON', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);

      const request = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as NextRequest;

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid JSON');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = createMockRequest({ notificationIds: ['notif-1'] });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });

    it('should return 404 if contractor profile not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(null);

      const request = createMockRequest({ notificationIds: ['notif-1'] });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Contractor profile not found');
    });

    it('should handle case where no notifications were deleted', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.deleteMany.mockResolvedValue({ count: 0 } as any);

      const request = createMockRequest({ notificationIds: ['invalid-id'] });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(0);
    });

    it('should return 500 on internal server error', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      mockPrisma.contractorProfile.findFirst.mockResolvedValue(mockContractor as any);
      mockPrisma.contractorNotification.deleteMany.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ notificationIds: ['notif-1'] });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to dismiss notifications');
    });
  });
});
