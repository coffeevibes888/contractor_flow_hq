/**
 * Webhooks Management Endpoint
 * 
 * GET /api/admin/webhooks - List all webhook endpoints
 * POST /api/admin/webhooks - Create a new webhook endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  hasWebhookAccess,
  WEBHOOK_EVENTS,
  WebhookEventType,
} from '@/lib/services/webhook.service';

// GET /api/admin/webhooks
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    // Check Enterprise access
    const hasAccess = await hasWebhookAccess(landlord.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Webhooks require Enterprise subscription' },
        { status: 403 }
      );
    }

    const webhooks = await listWebhookEndpoints(landlord.id);

    return NextResponse.json({
      webhooks,
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}

// POST /api/admin/webhooks
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event is required' },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = Object.keys(WEBHOOK_EVENTS);
    for (const event of body.events) {
      if (!validEvents.includes(event)) {
        return NextResponse.json(
          { error: `Invalid event: ${event}` },
          { status: 400 }
        );
      }
    }

    const webhook = await createWebhookEndpoint({
      landlordId: landlord.id,
      url: body.url,
      description: body.description,
      events: body.events as WebhookEventType[],
    });

    return NextResponse.json({
      message: 'Webhook endpoint created successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        description: webhook.description,
        events: webhook.events,
        secret: webhook.secret, // Only returned on creation!
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
      warning: 'Save the webhook secret now. It will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    const message = error instanceof Error ? error.message : 'Failed to create webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
