/**
 * Database Triggers - Emit events when database changes occur
 * These replace the need for cron jobs to poll the database
 */

import { eventBus } from './event-bus';
import { prisma } from '@/db/prisma';

/**
 * Middleware to emit events on database changes
 * Add this to your Prisma client extensions
 */
export function createDatabaseTriggers() {
  return {
    /**
     * Emit event when lease is signed by tenant
     */
    async onLeaseUpdate(lease: any, previousLease: any) {
      // Tenant just signed
      if (lease.tenantSignedAt && !previousLease.tenantSignedAt) {
        const unit = await prisma.unit.findUnique({
          where: { id: lease.unitId },
          include: {
            property: {
              include: {
                landlord: {
                  include: { owner: true },
                },
              },
            },
          },
        });

        const tenant = await prisma.user.findUnique({
          where: { id: lease.tenantId },
        });

        await eventBus.emit('lease.tenant_signed', {
          leaseId: lease.id,
          tenantName: tenant?.name || 'Tenant',
          propertyId: unit?.propertyId,
          landlordId: unit?.property?.landlordId,
          landlordUserId: unit?.property?.landlord?.owner?.id,
        });
      }
    },

    /**
     * Emit event when lease is created
     */
    async onLeaseCreate(lease: any) {
      await eventBus.emit('lease.created', {
        leaseId: lease.id,
        rentDueDate: lease.rentDueDate,
        tenantId: lease.tenantId,
      });
    },

    /**
     * Emit event when payment is received
     */
    async onPaymentCreate(transaction: any) {
      if (transaction.type === 'credit' && transaction.status === 'pending') {
        await eventBus.emit('payment.pending', {
          transactionId: transaction.id,
          availableAt: transaction.availableAt,
          landlordId: transaction.landlordId,
          amount: transaction.amount,
        });
      }

      if (transaction.type === 'credit' && transaction.status === 'completed') {
        await eventBus.emit('payment.received', {
          transactionId: transaction.id,
          availableAt: transaction.availableAt,
          landlordId: transaction.landlordId,
          amount: transaction.amount,
        });
      }
    },

    /**
     * Emit event when appointment is created
     */
    async onAppointmentCreate(appointment: any) {
      await eventBus.emit('appointment.created', {
        appointmentId: appointment.id,
        contractorId: appointment.contractorId,
        startTime: appointment.startTime,
      });
    },

    /**
     * Emit event when appointment is updated
     */
    async onAppointmentUpdate(appointment: any, previousAppointment: any) {
      await eventBus.emit('appointment.updated', {
        appointmentId: appointment.id,
        contractorId: appointment.contractorId,
        startTime: appointment.startTime,
        previousStartTime: previousAppointment.startTime,
      });
    },

    /**
     * Emit event when verification is uploaded
     */
    async onVerificationCreate(verification: any) {
      await eventBus.emit('verification.uploaded', {
        verificationType: verification.type,
        contractorId: verification.contractorId,
        expiresAt: verification.expiresAt,
      });
    },

    /**
     * Emit event when property showing is scheduled
     */
    async onPropertyAppointmentCreate(appointment: any) {
      await eventBus.emit('property.showing_scheduled', {
        appointmentId: appointment.id,
        propertyId: appointment.propertyId,
        date: appointment.date,
        startTime: appointment.startTime,
        visitorName: appointment.name,
        visitorEmail: appointment.email,
      });
    },

    /**
     * Emit event when open house is scheduled
     */
    async onOpenHouseCreate(openHouse: any) {
      await eventBus.emit('open_house.scheduled', {
        openHouseId: openHouse.id,
        agentId: openHouse.agentId,
        listingId: openHouse.listingId,
        date: openHouse.date,
        startTime: openHouse.startTime,
        endTime: openHouse.endTime,
      });
    },

    /**
     * Emit event when work order is created (landlord/homeowner)
     */
    async onWorkOrderCreate(workOrder: any, posterType: 'landlord' | 'homeowner') {
      await eventBus.emit('work_order.created', {
        workOrderId: workOrder.id,
        posterType,
        posterId: posterType === 'landlord' ? workOrder.landlordId : workOrder.homeownerId,
        title: workOrder.title,
        category: workOrder.category,
        isOpenBid: workOrder.isOpenBid || workOrder.isOpenForBids,
        contractorId: workOrder.contractorId,
      });
    },

    /**
     * Emit event when bid is received on work order
     */
    async onWorkOrderBidCreate(bid: any, workOrder: any) {
      // Resolve the actual user ID that owns this work order. For landlord-backed
      // work orders the owner is stored on the Landlord record as `ownerUserId`.
      // For homeowner-created work orders the Homeowner record stores the `userId`.
      let ownerUserId: string | undefined;

      try {
        if (workOrder?.landlordId) {
          const landlord = await prisma.landlord.findUnique({
            where: { id: workOrder.landlordId },
            select: { ownerUserId: true },
          });
          ownerUserId = landlord?.ownerUserId || undefined;
        }

        if (!ownerUserId && workOrder?.homeownerId) {
          const homeowner = await prisma.homeowner.findUnique({
            where: { id: workOrder.homeownerId },
            select: { userId: true },
          });
          ownerUserId = homeowner?.userId || undefined;
        }
      } catch (err) {
        console.error('Failed to resolve work order owner user id for bid event:', err);
      }

      if (!ownerUserId) {
        console.warn('Skipping emit of work_order.bid_received: could not determine owner user id', {
          bidId: bid.id,
          workOrderId: bid.workOrderId,
        });
        return;
      }

      await eventBus.emit('work_order.bid_received', {
        bidId: bid.id,
        workOrderId: bid.workOrderId,
        contractorId: bid.contractorId,
        amount: bid.amount,
        workOrderOwnerId: ownerUserId,
      });
    },

    /**
     * Emit event when bid is accepted
     */
    async onWorkOrderBidAccept(bid: any, workOrder: any) {
      await eventBus.emit('work_order.bid_accepted', {
        bidId: bid.id,
        workOrderId: bid.workOrderId,
        contractorId: bid.contractorId,
        amount: bid.amount,
      });
    },

    /**
     * Emit event when contractor lead is matched
     */
    async onContractorLeadMatch(match: any, lead: any) {
      await eventBus.emit('contractor.lead_matched', {
        matchId: match.id,
        leadId: lead.id,
        contractorId: match.contractorId,
        serviceType: lead.serviceType,
        leadScore: lead.leadScore,
      });
    },

    /**
     * Emit event when invoice is created
     */
    async onInvoiceCreate(invoice: any) {
      await eventBus.emit('invoice.created', {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        dueDate: invoice.dueDate,
      });
    },

    /**
     * Emit event when contractor invoice is fully paid
     */
    async onContractorInvoicePaid(invoice: any) {
      await eventBus.emit('contractor.invoice.paid', {
        invoiceId: invoice.id,
        contractorId: invoice.contractorId,
        jobId: invoice.jobId,
        amountPaid: Number(invoice.total),
      });
    },

    /**
     * Emit event when contractor contract is signed
     */
    async onContractorContractSigned(contract: any) {
      await eventBus.emit('contractor.contract.signed', {
        contractId: contract.id,
        jobId: contract.jobId,
        contractorId: contract.contractorId,
        customerName: contract.customerName,
        customerEmail: contract.customerEmail,
      });
    },

    /**
     * Emit event when contractor contract is declined
     */
    async onContractorContractDeclined(contract: any) {
      await eventBus.emit('contractor.contract.declined', {
        contractId: contract.id,
        contractorId: contract.contractorId,
        customerName: contract.customerName,
        declineReason: contract.declineReason,
      });
    },

    /**
     * Emit event when contractor job status changes
     */
    async onContractorJobStatusChange(job: any, previousStatus: string) {
      await eventBus.emit('contractor.job.status_changed', {
        jobId: job.id,
        previousStatus,
        newStatus: job.status,
        contractorId: job.contractorId,
      });
    },
  };
}

/**
 * Helper function to integrate triggers with your existing code
 * Call these functions after database operations
 */
export const dbTriggers = createDatabaseTriggers();
