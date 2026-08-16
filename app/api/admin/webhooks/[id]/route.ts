/**
 * Single Webhook Management Endpoint
 * 
 * GET /api/admin/webhooks/:id - Get webhook details
 * PATCH /api/admin/webhooks/:id - Update webhook
 * DELETE /api/admin/webhooks/:id - Delete webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  getWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  regenerateWebhookSecret,
  sendTestWebhook,
  getWebhookDeliveries,
  WEBHOOK_EVENTS,
  WebhookEventType,
} from '@/lib/services/webhook.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/webhooks/:id
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const webhook = await getWebhookEndpoint(landlord.id, id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Get recent deliveries
    const { deliveries, total } = await getWebhookDeliveries(landlord.id, {
      webhookId: id,
      limit: 20,
    });

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        description: webhook.description,
        events: webhook.events,
        isActive: webhook.isActive,
        failureCount: webhook.failureCount,
        lastSuccessAt: webhook.lastSuccessAt,
        lastFailureAt: webhook.lastFailureAt,
        lastFailureReason: webhook.lastFailureReason,
        createdAt: webhook.createdAt,
      },
      deliveries,
      totalDeliveries: total,
    });
  } catch (error) {
    console.error('Error getting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to get webhook' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/webhooks/:id
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const body = await req.json();

    // Validate events if provided
    if (body.events) {
      const validEvents = Object.keys(WEBHOOK_EVENTS);
      for (const event of body.events) {
        if (!validEvents.includes(event)) {
          return NextResponse.json(
            { error: `Invalid event: ${event}` },
            { status: 400 }
          );
        }
      }
    }

    const webhook = await updateWebhookEndpoint(landlord.id, id, {
      url: body.url,
      description: body.description,
      events: body.events as WebhookEventType[],
      isActive: body.isActive,
    });

    return NextResponse.json({
      message: 'Webhook updated successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        description: webhook.description,
        events: webhook.events,
        isActive: webhook.isActive,
      },
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    const message = error instanceof Error ? error.message : 'Failed to update webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/webhooks/:id
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    await deleteWebhookEndpoint(landlord.id, id);

    return NextResponse.json({
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
