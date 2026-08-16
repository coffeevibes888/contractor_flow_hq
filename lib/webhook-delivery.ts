import { prisma } from '@/db/prisma';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
}

/**
 * Trigger webhook for an event
 * Usage: await triggerWebhook(landlordId, 'payment.completed', paymentData);
 */
export async function triggerWebhook(
  landlordId: string,
  eventType: string,
  data: any
) {
  try {
    // Find active webhooks for this landlord that subscribe to this event
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: {
        landlordId,
        isActive: true,
        events: {
          has: eventType,
        },
      },
    });

    if (webhooks.length === 0) {
      console.log(`No webhooks configured for event: ${eventType}`);
      return;
    }

    const payload: WebhookPayload = {
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    // Create delivery records for each webhook
    for (const webhook of webhooks) {
      await prisma.webhookDelivery.create({
        data: {
          webhookEndpointId: webhook.id,
          eventType,
          payload,
          status: 'pending',
        },
      });
    }

    // Process deliveries asynchronously
    processWebhookDeliveries();
  } catch (error) {
    console.error('Failed to trigger webhook:', error);
  }
}

/**
 * Process pending webhook deliveries
 * This should be called by a background job/cron
 */
export async function processWebhookDeliveries() {
  try {
    const pendingDeliveries = await prisma.webhookDelivery.findMany({
      where: {
        status: { in: ['pending', 'retrying'] },
        attempts: { lt: 5 }, // Max 5 attempts
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      include: {
        webhookEndpoint: true,
      },
      take: 10, // Process 10 at a time
    });

    for (const delivery of pendingDeliveries) {
      await deliverWebhook(delivery);
    }
  } catch (error) {
    console.error('Failed to process webhook deliveries:', error);
  }
}

/**
 * Deliver a single webhook
 */
async function deliverWebhook(delivery: any) {
  const startTime = Date.now();

  try {
    // Create HMAC signature
    const signature = crypto
      .createHmac('sha256', delivery.webhookEndpoint.secret)
      .update(JSON.stringify(delivery.payload))
      .digest('hex');

    // Send webhook
    const response = await fetch(delivery.webhookEndpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.eventType,
        'User-Agent': 'PropertyFlowHQ-Webhooks/1.0',
      },
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      // Success
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'delivered',
          httpStatus: response.status,
          responseBody: responseBody.substring(0, 1000), // Limit size
          responseTimeMs: responseTime,
          deliveredAt: new Date(),
          attempts: delivery.attempts + 1,
        },
      });

      await prisma.webhookEndpoint.update({
        where: { id: delivery.webhookEndpointId },
        data: {
          lastSuccessAt: new Date(),
          failureCount: 0,
        },
      });
    } else {
      // Failed
      throw new Error(`HTTP ${response.status}: ${responseBody}`);
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const attempts = delivery.attempts + 1;
    const maxAttempts = 5;

    // Calculate next retry time (exponential backoff)
    const nextRetryAt = new Date(Date.now() + Math.pow(2, attempts) * 60000); // 2^n minutes

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: attempts >= maxAttempts ? 'failed' : 'retrying',
        httpStatus: null,
        responseBody: error.message?.substring(0, 1000),
        responseTimeMs: responseTime,
        attempts,
        nextRetryAt: attempts >= maxAttempts ? null : nextRetryAt,
      },
    });

    await prisma.webhookEndpoint.update({
      where: { id: delivery.webhookEndpointId },
      data: {
        lastFailureAt: new Date(),
        lastFailureReason: error.message?.substring(0, 500),
        failureCount: { increment: 1 },
      },
    });
  }
}

/**
 * Example usage in your code:
 * 
 * // When a payment is completed
 * await triggerWebhook(landlordId, 'payment.completed', {
 *   paymentId: payment.id,
 *   amount: payment.amount,
 *   tenantId: payment.tenantId,
 * });
 * 
 * // When a lease is created
 * await triggerWebhook(landlordId, 'lease.created', {
 *   leaseId: lease.id,
 *   tenantId: lease.tenantId,
 *   propertyId: lease.propertyId,
 * });
 */
