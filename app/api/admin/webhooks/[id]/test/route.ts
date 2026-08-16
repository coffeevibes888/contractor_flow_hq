/**
 * Webhook Test Endpoint
 * 
 * POST /api/admin/webhooks/:id/test - Send a test webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { sendTestWebhook } from '@/lib/services/webhook.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/webhooks/:id/test
export async function POST(req: NextRequest, { params }: RouteParams) {
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

    const result = await sendTestWebhook(landlord.id, id);

    return NextResponse.json({
      message: result.success ? 'Test webhook sent successfully' : 'Test webhook failed',
      result,
    });
  } catch (error) {
    console.error('Error sending test webhook:', error);
    const message = error instanceof Error ? error.message : 'Failed to send test webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
