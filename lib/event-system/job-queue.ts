/**
 * Database-backed Job Queue
 * Replaces cron jobs with reliable, scheduled job processing
 */

import { prisma } from '@/db/prisma';
import { addMinutes, addHours, addDays, isBefore } from 'date-fns';

export type JobType =
  | 'send_reminder'
  | 'release_balance'
  | 'process_late_fee'
  | 'check_expiration'
  | 'send_notification'
  | 'process_webhook'
  | 'cleanup_documents';

export interface JobData {
  type: JobType;
  payload: any;
  scheduledFor: Date;
  priority?: number;
  retryCount?: number;
  maxRetries?: number;
}

class JobQueue {
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Schedule a job to run at a specific time
   */
  async schedule(data: JobData): Promise<string> {
    try {
      const job = await (prisma as any).scheduledJob.create({
        data: {
          type: data.type,
          payload: data.payload,
          scheduledFor: data.scheduledFor,
          priority: data.priority || 0,
          status: 'pending',
          retryCount: 0,
          maxRetries: data.maxRetries || 3,
        },
      });

      return job.id;
    } catch (error) {
      console.error('Failed to schedule job:', error);
      throw error;
    }
  }

  /**
   * Schedule a reminder (common use case)
   */
  async scheduleReminder(
    type: 'rent' | 'appointment' | 'lease_signing' | 'verification' | 'invoice' | 'open_house' | 'property_showing',
    recipientId: string,
    scheduledFor: Date,
    data: any
  ) {
    return this.schedule({
      type: 'send_reminder',
      payload: {
        reminderType: type,
        recipientId,
        ...data,
      },
      scheduledFor,
      priority: 5,
    });
  }

  /**
   * Start processing jobs
   */
  startProcessing(intervalMs = 30000) {
    if (this.processing) return;

    this.processing = true;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Job queue processor started');
    }

    // Process immediately
    this.processJobs();

    // Then process every interval
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, intervalMs);
  }

  /**
   * Stop processing jobs
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.processing = false;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Job queue processor stopped');
    }
  }

  /**
   * Process due jobs
   */
  private async processJobs() {
    try {
      const now = new Date();

      // Get jobs that are due
      const dueJobs = await (prisma as any).scheduledJob.findMany({
        where: {
          status: 'pending',
          scheduledFor: { lte: now },
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledFor: 'asc' },
        ],
        take: 50,
      });

      if (dueJobs.length === 0) return;

      if (process.env.NODE_ENV !== 'production') {
        console.log(`Processing ${dueJobs.length} due jobs`);
      }

      for (const job of dueJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error('Error processing jobs:', error);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: any) {
    try {
      // Mark as processing
      await (prisma as any).scheduledJob.update({
        where: { id: job.id },
        data: { status: 'processing' },
      });

      // Execute the job based on type
      await this.executeJob(job);

      // Mark as completed
      await (prisma as any).scheduledJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);

      // Handle retry logic
      const retryCount = job.retryCount + 1;
      
      if (retryCount < job.maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, retryCount) * 60000; // 2^n minutes
        
        await (prisma as any).scheduledJob.update({
          where: { id: job.id },
          data: {
            status: 'pending',
            retryCount,
            scheduledFor: addMinutes(new Date(), retryDelay / 60000),
            lastError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } else {
        // Max retries reached, mark as failed
        await (prisma as any).scheduledJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            lastError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
  }

  /**
   * Execute job based on type
   */
  private async executeJob(job: any) {
    const { type, payload } = job;

    switch (type) {
      case 'send_reminder':
        await this.handleSendReminder(payload);
        break;
      case 'release_balance':
        await this.handleReleaseBalance(payload);
        break;
      case 'process_late_fee':
        await this.handleLateFee(payload);
        break;
      case 'check_expiration':
        await this.handleCheckExpiration(payload);
        break;
      case 'send_notification':
        await this.handleSendNotification(payload);
        break;
      case 'process_webhook':
        await this.handleProcessWebhook(payload);
        break;
      case 'cleanup_documents':
        await this.handleCleanupDocuments(payload);
        break;
      default:
        console.warn(`Unknown job type: ${type}`);
    }
  }

  private async handleSendReminder(payload: any) {
    const { reminderType, recipientId, ...data } = payload;
    
    try {
      // Import the appropriate service dynamically
      switch (reminderType) {
        case 'rent':
          const rentService = await import('@/lib/services/rent-reminder.service');
          if (rentService.runAllRentReminders) {
            await rentService.runAllRentReminders();
          }
          break;
        case 'appointment':
          // TODO: Implement appointment reminder service
          console.log('Appointment reminder:', recipientId, data);
          break;
        case 'lease_signing':
          // TODO: Implement lease signing reminder service
          console.log('Lease signing reminder:', recipientId, data);
          break;
        case 'verification':
          // TODO: Implement verification reminder service
          console.log('Verification reminder:', recipientId, data);
          break;
        case 'invoice':
          try {
            const { ContractorInvoicingService } = await import('@/lib/services/contractor-invoicing');
            await ContractorInvoicingService.sendReminder(data.invoiceId);
          } catch (err) {
            console.error('Invoice reminder failed:', err);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to send ${reminderType} reminder:`, error);
      throw error;
    }
  }

  private async handleReleaseBalance(payload: any) {
    const { releasePendingBalance } = await import('@/lib/services/wallet.service');
    await releasePendingBalance(payload.transactionId);
  }

  private async handleLateFee(payload: any) {
    // TODO: Implement late fee service
    console.log('Apply late fee:', payload.leaseId);
  }

  private async handleCheckExpiration(payload: any) {
    // TODO: Implement expiration checker service
    console.log('Check expiration:', payload.type, payload.id);
  }

  private async handleSendNotification(payload: any) {
    // Guard against malformed payloads so a bad caller doesn't crash the
    // queue with a Prisma validation error and retry forever.
    if (!payload?.userId || !payload?.title || !payload?.message) {
      console.warn(
        'Skipping malformed send_notification payload (requires userId, title, message):',
        payload
      );
      return;
    }
    const { NotificationService } = await import('@/lib/services/notification-service');
    await NotificationService.createNotification(payload);
  }

  private async handleProcessWebhook(payload: any) {
    const { processWebhookDeliveries } = await import('@/lib/webhook-delivery');
    await processWebhookDeliveries();
  }

  private async handleCleanupDocuments(payload: any) {
    // TODO: Implement document cleanup service
    console.log('Cleanup documents:', payload.documentId);
  }
}

export const jobQueue = new JobQueue();
