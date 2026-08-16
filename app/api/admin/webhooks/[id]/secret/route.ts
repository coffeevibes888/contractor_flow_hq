/**
 * Webhook Secret Regeneration Endpoint
 * 
 * POST /api/admin/webhooks/:id/secret - Regenerate webhook secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { regenerateWebhookSecret } from '@/lib/services/webhook.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/webhooks/:id/secret
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

    const result = await regenerateWebhookSecret(landlord.id, id);

    return NextResponse.json({
      message: 'Webhook secret regenerated successfully',
      secret: result.secret,
      warning: 'Save this secret now. It will not be shown again. Update your webhook handler with the new secret.',
    });
  } catch (error) {
    console.error('Error regenerating webhook secret:', error);
    const message = error instanceof Error ? error.message : 'Failed to regenerate webhook secret';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
