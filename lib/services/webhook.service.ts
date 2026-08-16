/**
 * Webhook Service
 * 
 * Handles webhook endpoint management and event delivery for Enterprise tier.
 * Implements reliable delivery with retries and HMAC signature verification.
 */

import { prisma } from '@/db/prisma';
import { createHmac, randomBytes } from 'crypto';
import { hasFeatureAccess, normalizeTier } from '@/lib/config/subscription-tiers';

// Webhook Event Types
export const WEBHOOK_EVENTS = {
  // Payment Events
  'payment.completed': 'Rent payment completed',
  'payment.failed': 'Rent payment failed',
  'payment.refunded': 'Payment refunded',
  
  // Lease Events
  'lease.created': 'New lease created',
  'lease.signed': 'Lease signed by tenant',
  'lease.renewed': 'Lease renewed',
  'lease.terminated': 'Lease terminated',
  'lease.expiring': 'Lease expiring soon',
  
  // Tenant Events
  'tenant.created': 'New tenant added',
  'tenant.updated': 'Tenant information updated',
  'tenant.moved_out': 'Tenant moved out',
  
  // Application Events
  'application.submitted': 'New rental application',
  'application.approved': 'Application approved',
  'application.rejected': 'Application rejected',
  
  // Maintenance Events
  'maintenance.created': 'New maintenance ticket',
  'maintenance.updated': 'Ticket status updated',
  'maintenance.resolved': 'Ticket resolved',
  
  // Work Order Events
  'work_order.created': 'New work order created',
  'work_order.assigned': 'Work order assigned',
  'work_order.completed': 'Work order completed',
  'work_order.paid': 'Contractor payment sent',
  
  // Property Events
  'property.created': 'New property added',
  'property.updated': 'Property updated',
  
  // Unit Events
  'unit.created': 'New unit added',
  'unit.available': 'Unit became available',
  'unit.occupied': 'Unit occupied',
} as const;

export type WebhookEventType = keyof typeof WEBHOOK_EVENTS;

interface CreateWebhookParams {
  landlordId: string;
  url: string;
  description?: string;
  events: WebhookEventType[];
}

interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created: number;
  data: Record<string, unknown>;
  landlordId: string;
}

// Retry delays in milliseconds (exponential backoff)
const RETRY_DELAYS = [
  60 * 1000,        // 1 minute
  5 * 60 * 1000,    // 5 minutes
  30 * 60 * 1000,   // 30 minutes
  2 * 60 * 60 * 1000, // 2 hours
  24 * 60 * 60 * 1000, // 24 hours
];

/**
 * Generate a secure webhook signing secret
 */
function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('base64url')}`;
}

/**
 * Sign a webhook payload using HMAC-SHA256
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify a webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): boolean {
  const parts = signature.split(',');
  const timestamp = parseInt(parts.find(p => p.startsWith('t='))?.slice(2) || '0');
  const sig = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !sig) return false;

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) return false;

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return sig === expectedSig;
}

/**
 * Check if a landlord has webhook access (Enterprise tier)
 */
export async function hasWebhookAccess(landlordId: string): Promise<boolean> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: { subscriptionTier: true },
  });

  if (!landlord) return false;

  const tier = normalizeTier(landlord.subscriptionTier);
  return hasFeatureAccess(tier, 'webhooks');
}

/**
 * Create a new webhook endpoint
 */
export async function createWebhookEndpoint(params: CreateWebhookParams) {
  const { landlordId, url, description, events } = params;

  // Verify Enterprise tier access
  const hasAccess = await hasWebhookAccess(landlordId);
  if (!hasAccess) {
    throw new Error('Webhooks require Enterprise subscription');
  }

  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Webhook URL must use HTTPS');
    }
  } catch {
    throw new Error('Invalid webhook URL');
  }

  const secret = generateWebhookSecret();

  const webhook = await prisma.webhookEndpoint.create({
    data: {
      landlordId,
      url,
      description,
      secret,
      events,
    },
  });

  return {
    ...webhook,
    secret, // Only returned on creation
  };
}

/**
 * List webhook endpoints for a landlord
 */
export async function listWebhookEndpoints(landlordId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { landlordId },
    select: {
      id: true,
      url: true,
      description: true,
      events: true,
      isActive: true,
      failureCount: true,
      lastSuccessAt: true,
      lastFailureAt: true,
      lastFailureReason: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get webhook endpoint with secret (for regeneration)
 */
export async function getWebhookEndpoint(landlordId: string, webhookId: string) {
  return prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, landlordId },
  });
}

/**
 * Update webhook endpoint
 */
export async function updateWebhookEndpoint(
  landlordId: string,
  webhookId: string,
  data: {
    url?: string;
    description?: string;
    events?: WebhookEventType[];
    isActive?: boolean;
  }
) {
  const webhook = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, landlordId },
  });

  if (!webhook) {
    throw new Error('Webhook endpoint not found');
  }

  if (data.url) {
    try {
      const parsedUrl = new URL(data.url);
      if (parsedUrl.protocol !== 'https:') {
        throw new Error('Webhook URL must use HTTPS');
      }
    } catch {
      throw new Error('Invalid webhook URL');
    }
  }

  return prisma.webhookEndpoint.update({
    where: { id: webhookId },
    data,
  });
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(landlordId: string, webhookId: string) {
  const webhook = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, landlordId },
  });

  if (!webhook) {
    throw new Error('Webhook endpoint not found');
  }

  const newSecret = generateWebhookSecret();

  await prisma.webhookEndpoint.update({
    where: { id: webhookId },
    data: { secret: newSecret },
  });

  return { secret: newSecret };
}

/**
 * Delete webhook endpoint
 */
export async function deleteWebhookEndpoint(landlordId: string, webhookId: string) {
  const webhook = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, landlordId },
  });

  if (!webhook) {
    throw new Error('Webhook endpoint not found');
  }

  return prisma.webhookEndpoint.delete({
    where: { id: webhookId },
  });
}

/**
 * Trigger a webhook event for a landlord
 * This queues the webhook for delivery
 */
export async function triggerWebhook(
  landlordId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
) {
  // Find all active webhooks subscribed to this event
  const webhooks = await prisma.webhookEndpoint.findMany({
    where: {
      landlordId,
      isActive: true,
      events: { has: eventType },
    },
  });

  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    id: `evt_${randomBytes(16).toString('hex')}`,
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    data,
    landlordId,
  };

  // Create delivery records for each webhook
  const deliveries = await Promise.all(
    webhooks.map(webhook =>
      prisma.webhookDelivery.create({
        data: {
          webhookEndpointId: webhook.id,
          eventType,
          payload: payload as any,
          status: 'pending',
        },
      })
    )
  );

  // Attempt immediate delivery (async, don't wait)
  deliveries.forEach(delivery => {
    deliverWebhook(delivery.id).catch(console.error);
  });

  return deliveries;
}

/**
 * Deliver a webhook (with retries)
 */
export async function deliverWebhook(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhookEndpoint: true },
  });

  if (!delivery || delivery.status === 'delivered') return;

  const { webhookEndpoint } = delivery;
  const payloadString = JSON.stringify(delivery.payload);
  const signature = signWebhookPayload(payloadString, webhookEndpoint.secret);

  const startTime = Date.now();
  let httpStatus: number | undefined;
  let responseBody: string | undefined;
  let success = false;

  try {
    const response = await fetch(webhookEndpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Id': delivery.id,
        'X-Webhook-Event': delivery.eventType,
        'User-Agent': 'PropertyManager-Webhooks/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    httpStatus = response.status;
    responseBody = await response.text().catch(() => '');
    success = response.ok;
  } catch (error) {
    responseBody = error instanceof Error ? error.message : 'Unknown error';
  }

  const responseTimeMs = Date.now() - startTime;
  const attempts = delivery.attempts + 1;

  if (success) {
    // Mark as delivered
    await prisma.$transaction([
      prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'delivered',
          httpStatus,
          responseBody: responseBody?.slice(0, 1000),
          responseTimeMs,
          attempts,
          deliveredAt: new Date(),
        },
      }),
      prisma.webhookEndpoint.update({
        where: { id: webhookEndpoint.id },
        data: {
          failureCount: 0,
          lastSuccessAt: new Date(),
        },
      }),
    ]);
  } else {
    // Handle failure
    const shouldRetry = attempts < delivery.maxAttempts;
    const nextRetryAt = shouldRetry
      ? new Date(Date.now() + RETRY_DELAYS[attempts - 1])
      : null;

    await prisma.$transaction([
      prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: shouldRetry ? 'retrying' : 'failed',
          httpStatus,
          responseBody: responseBody?.slice(0, 1000),
          responseTimeMs,
          attempts,
          nextRetryAt,
        },
      }),
      prisma.webhookEndpoint.update({
        where: { id: webhookEndpoint.id },
        data: {
          failureCount: { increment: 1 },
          lastFailureAt: new Date(),
          lastFailureReason: responseBody?.slice(0, 500),
          // Disable webhook after 10 consecutive failures
          isActive: webhookEndpoint.failureCount >= 9 ? false : undefined,
        },
      }),
    ]);
  }
}

/**
 * Get webhook delivery history
 */
export async function getWebhookDeliveries(
  landlordId: string,
  options: {
    webhookId?: string;
    eventType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { webhookId, eventType, status, limit = 50, offset = 0 } = options;

  // First verify the webhook belongs to this landlord
  const whereClause: any = {
    webhookEndpoint: { landlordId },
  };

  if (webhookId) whereClause.webhookEndpointId = webhookId;
  if (eventType) whereClause.eventType = eventType;
  if (status) whereClause.status = status;

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where: whereClause,
      select: {
        id: true,
        eventType: true,
        status: true,
        httpStatus: true,
        responseTimeMs: true,
        attempts: true,
        deliveredAt: true,
        createdAt: true,
        webhookEndpoint: {
          select: { url: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.webhookDelivery.count({ where: whereClause }),
  ]);

  return { deliveries, total };
}

/**
 * Retry a failed webhook delivery
 */
export async function retryWebhookDelivery(landlordId: string, deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findFirst({
    where: {
      id: deliveryId,
      webhookEndpoint: { landlordId },
    },
  });

  if (!delivery) {
    throw new Error('Webhook delivery not found');
  }

  if (delivery.status === 'delivered') {
    throw new Error('Webhook already delivered');
  }

  // Reset for retry
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'pending',
      attempts: 0,
      nextRetryAt: null,
    },
  });

  // Attempt delivery
  await deliverWebhook(deliveryId);
}

/**
 * Send a test webhook to verify endpoint
 */
export async function sendTestWebhook(landlordId: string, webhookId: string) {
  const webhook = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, landlordId },
  });

  if (!webhook) {
    throw new Error('Webhook endpoint not found');
  }

  const testPayload: WebhookPayload = {
    id: `evt_test_${randomBytes(8).toString('hex')}`,
    type: 'payment.completed' as WebhookEventType,
    created: Math.floor(Date.now() / 1000),
    data: {
      test: true,
      message: 'This is a test webhook delivery',
    },
    landlordId,
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = signWebhookPayload(payloadString, webhook.secret);

  const startTime = Date.now();

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Id': testPayload.id,
        'X-Webhook-Event': 'test',
        'User-Agent': 'PropertyManager-Webhooks/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000),
    });

    const responseBody = await response.text().catch(() => '');
    const responseTimeMs = Date.now() - startTime;

    return {
      success: response.ok,
      httpStatus: response.status,
      responseBody: responseBody.slice(0, 1000),
      responseTimeMs,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs: Date.now() - startTime,
    };
  }
}
