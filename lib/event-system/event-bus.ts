/**
 * Event-Driven System - Event Bus
 * Replaces cron jobs with real-time event processing
 */

import { EventEmitter } from 'events';
import { prisma } from '@/db/prisma';

// Event types that trigger actions
export type SystemEvent =
  | 'lease.tenant_signed'
  | 'lease.created'
  | 'payment.received'
  | 'payment.pending'
  | 'appointment.created'
  | 'appointment.updated'
  | 'verification.expiring_soon'
  | 'verification.uploaded'
  | 'rent.due_soon'
  | 'invoice.created'
  | 'invoice.overdue'
  | 'balance.pending_release'
  | 'document.expired'
  | 'webhook.failed'
  | 'property.showing_scheduled'
  | 'property.showing_cancelled'
  | 'open_house.scheduled'
  | 'open_house.rsvp_received'
  | 'open_house.starting_soon'
  | 'work_order.created'
  | 'work_order.bid_received'
  | 'work_order.bid_accepted'
  | 'work_order.assigned'
  | 'work_order.completed'
  | 'contractor.lead_matched'
  | 'contractor.lead_responded'
  | 'contractor.lead.matched'
  | 'contractor.lead.viewed'
  | 'contractor.lead.accepted'
  | 'contractor.lead.declined'
  | 'contractor.lead.rejected'
  | 'contractor.lead.responded'
  | 'contractor.lead.stage_changed'
  | 'contractor.estimate.created'
  | 'contractor.estimate.updated'
  | 'contractor.estimate.sent'
  | 'contractor.estimate.viewed'
  | 'contractor.estimate.accepted'
  | 'contractor.estimate.declined'
  | 'contractor.estimate.expired'
  | 'contractor.estimate.deleted'
  | 'contractor.invoice.created'
  | 'contractor.invoice.updated'
  | 'contractor.invoice.sent'
  | 'contractor.invoice.payment_received'
  | 'contractor.invoice.deleted'
  | 'contractor.job.created'
  | 'contractor.job.status_changed'
  | 'contractor.job.completed'
  | 'contractor.job.approved'
  | 'contractor.job.deleted'
  | 'contractor.customer.created'
  | 'contractor.employee.created'
  | 'contractor.time.clock_in'
  | 'contractor.time.clock_out'
  | 'contractor.campaign.created'
  | 'contractor.campaign.send'
  | 'contractor.referral.created'
  | 'contractor.referral.updated'
  | 'contractor.quote.accepted'
  | 'contractor.quote.rejected'
  | 'contractor.contract.signed'
  | 'contractor.contract.declined'
  | 'homeowner.job_posted'
  | 'homeowner.estimate_requested';

export interface EventPayload {
  type: SystemEvent;
  data: any;
  timestamp: Date;
  userId?: string;
  landlordId?: string;
}

class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emit an event and optionally persist it
   */
  async emit(event: SystemEvent, payload: any, persist = true): Promise<boolean> {
    const eventPayload: EventPayload = {
      type: event,
      data: payload,
      timestamp: new Date(),
      userId: payload.userId,
      landlordId: payload.landlordId,
    };

    // Persist event to database for audit trail and recovery
    if (persist) {
      try {
        await (prisma as any).systemEvent.create({
          data: {
            type: event,
            payload: eventPayload,
            processed: false,
          },
        });
      } catch (error) {
        console.error('Failed to persist event:', error);
      }
    }

    // Emit to all listeners
    return super.emit(event, eventPayload);
  }

  /**
   * Subscribe to an event
   */
  subscribe(event: SystemEvent, handler: (payload: EventPayload) => Promise<void> | void) {
    this.on(event, async (payload: EventPayload) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error handling event ${event}:`, error);
      }
    });
  }

  /**
   * Process unprocessed events (for recovery after restart)
   */
  async processBacklog() {
    try {
      const unprocessedEvents = await (prisma as any).systemEvent.findMany({
        where: { processed: false },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      for (const event of unprocessedEvents) {
        await this.emit(event.type as SystemEvent, event.payload, false);
        
        await (prisma as any).systemEvent.update({
          where: { id: event.id },
          data: { processed: true },
        });
      }
    } catch (error) {
      console.error('Error processing event backlog:', error);
    }
  }
}

export const eventBus = EventBus.getInstance();
