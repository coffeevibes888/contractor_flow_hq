import { prisma } from '@/db/prisma';
import type { EvictionNotice, Lease } from '@prisma/client';
import type {
  NoticeType,
  EvictionNoticeStatus,
  CreateEvictionNoticeRequest,
  UpdateEvictionStatusRequest,
} from '@/types/tenant-lifecycle';
import {
  NOTICE_DAYS,
  isValidStatusTransition,
  calculateDeadlineDate,
} from '@/types/tenant-lifecycle';

export class EvictionService {
  /**
   * Creates an eviction notice and calculates deadline based on notice type
   */
  async createNotice(params: CreateEvictionNoticeRequest): Promise<EvictionNotice> {
    const { leaseId, noticeType, reason, amountOwed, additionalNotes } = params;

    // Fetch the lease with tenant and unit info
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: true,
        unit: {
          include: {
            property: {
              include: {
                landlord: true,
              },
            },
          },
        },
      },
    });

    if (!lease) {
      throw new Error('Lease not found');
    }

    if (lease.status === 'terminated' || lease.status === 'ended') {
      throw new Error('Cannot create eviction notice for terminated or ended lease');
    }

    const landlordId = lease.unit.property.landlordId;
    if (!landlordId) {
      throw new Error('Property has no associated landlord');
    }

    // Calculate deadline date
    const serveDate = new Date();
    const deadlineDate = calculateDeadlineDate(serveDate, noticeType);

    // Create the eviction notice
    const evictionNotice = await prisma.evictionNotice.create({
      data: {
        leaseId,
        tenantId: lease.tenantId,
        landlordId,
        unitId: lease.unitId,
        noticeType,
        status: 'served',
        reason,
        amountOwed: amountOwed ? amountOwed : null,
        additionalNotes,
        servedAt: serveDate,
        deadlineDate,
      },
    });

    // TODO: Send notification to tenant
    // await this.sendTenantNotification(evictionNotice, lease);

    return evictionNotice;
  }

  /**
   * Updates eviction notice status with state machine validation
   */
  async updateStatus(
    noticeId: string,
    params: UpdateEvictionStatusRequest
  ): Promise<EvictionNotice> {
    const { status: newStatus, notes } = params;

    const notice = await prisma.evictionNotice.findUnique({
      where: { id: noticeId },
    });

    if (!notice) {
      throw new Error('Eviction notice not found');
    }

    const currentStatus = notice.status as EvictionNoticeStatus;

    // Validate state transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`
      );
    }

    // Prepare update data based on new status
    const updateData: Partial<EvictionNotice> & { status: string; additionalNotes?: string } = {
      status: newStatus,
    };

    if (notes) {
      updateData.additionalNotes = notice.additionalNotes
        ? `${notice.additionalNotes}\n\n[${new Date().toISOString()}] ${notes}`
        : `[${new Date().toISOString()}] ${notes}`;
    }

    // Set timestamp based on status
    switch (newStatus) {
      case 'cured':
        updateData.curedAt = new Date();
        break;
      case 'filed_with_court':
        updateData.filedAt = new Date();
        break;
      case 'completed':
        updateData.completedAt = new Date();
        break;
    }

    const updatedNotice = await prisma.evictionNotice.update({
      where: { id: noticeId },
      data: updateData as any,
    });

    return updatedNotice;
  }

  /**
   * Completes eviction and initiates offboarding
   * Returns the eviction notice ID for the offboarding service to use
   */
  async completeEviction(noticeId: string): Promise<EvictionNotice> {
    const notice = await this.updateStatus(noticeId, { status: 'completed' });
    
    // The offboarding will be triggered by the API endpoint
    // which will call OffboardingService.executeOffboarding()
    
    return notice;
  }

  /**
   * Gets all eviction notices for a lease
   */
  async getNoticesForLease(leaseId: string): Promise<EvictionNotice[]> {
    return prisma.evictionNotice.findMany({
      where: { leaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gets a single eviction notice by ID
   */
  async getNoticeById(noticeId: string): Promise<EvictionNotice | null> {
    return prisma.evictionNotice.findUnique({
      where: { id: noticeId },
    });
  }

  /**
   * Gets all active (non-completed, non-cured) eviction notices for a landlord
   */
  async getActiveNoticesForLandlord(landlordId: string): Promise<EvictionNotice[]> {
    return prisma.evictionNotice.findMany({
      where: {
        landlordId,
        status: {
          notIn: ['completed', 'cured'],
        },
      },
      orderBy: { deadlineDate: 'asc' },
    });
  }

  /**
   * Gets notices that have passed their deadline without being cured
   */
  async getExpiredNotices(): Promise<EvictionNotice[]> {
    const now = new Date();
    return prisma.evictionNotice.findMany({
      where: {
        status: {
          in: ['served', 'cure_period'],
        },
        deadlineDate: {
          lt: now,
        },
      },
    });
  }

  /**
   * Marks expired notices as expired (for scheduled job)
   */
  async processExpiredNotices(): Promise<number> {
    const expiredNotices = await this.getExpiredNotices();
    let processedCount = 0;

    for (const notice of expiredNotices) {
      try {
        await this.updateStatus(notice.id, { 
          status: 'expired',
          notes: 'Automatically marked as expired - deadline passed without cure'
        });
        processedCount++;
        // TODO: Send notification to landlord
      } catch (error) {
        console.error(`Failed to process expired notice ${notice.id}:`, error);
      }
    }

    return processedCount;
  }
}

// Export singleton instance
export const evictionService = new EvictionService();
