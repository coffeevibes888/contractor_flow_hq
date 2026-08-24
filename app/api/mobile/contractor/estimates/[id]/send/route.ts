import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

/**
 * POST /api/mobile/contractor/estimates/[id]/send
 *
 * Marks an estimate as "sent" and triggers delivery.
 * Accepts optional body: { method: "email" | "sms" | "both", message?: string }
 *
 * The estimate must be in "draft" status (or re-sendable if previously sent).
 * Sets sentAt timestamp and transitions status to "sent".
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true, businessName: true, email: true, phone: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { id } = await params;

    const estimate = await prisma.contractorEstimate.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }
    if (estimate.contractorProfileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (estimate.isTemplate) {
      return NextResponse.json({ error: 'Templates cannot be sent' }, { status: 400 });
    }
    if (estimate.status === 'accepted' || estimate.status === 'converted') {
      return NextResponse.json({ error: 'This estimate has already been accepted' }, { status: 400 });
    }

    // Parse optional send options
    let sendMethod = 'email';
    let customMessage: string | null = null;
    try {
      const body = await req.json();
      sendMethod = body.method || 'email';
      customMessage = body.message || null;
    } catch {
      // No body is fine, defaults to email
    }

    // Validate we have the contact info for the chosen method
    if ((sendMethod === 'email' || sendMethod === 'both') && !estimate.customer?.email) {
      return NextResponse.json(
        { error: 'Customer email is required to send via email. Update the customer first.' },
        { status: 400 }
      );
    }
    if ((sendMethod === 'sms' || sendMethod === 'both') && !estimate.customer?.phone) {
      return NextResponse.json(
        { error: 'Customer phone is required to send via SMS. Update the customer first.' },
        { status: 400 }
      );
    }

    const sentAt = new Date();

    const updated = await prisma.contractorEstimate.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt,
      },
    });

    // TODO: Integrate with email service (SendGrid/Resend) and SMS (Twilio)
    // For now, we mark it as sent. The actual delivery will be handled by
    // an event handler or a separate service when those integrations are ready.
    //
    // Future: eventBus.emit('contractor.estimate.sent', { ... })

    return NextResponse.json({
      success: true,
      estimate: {
        id: updated.id,
        status: updated.status,
        sentAt: sentAt.toISOString(),
        sendMethod,
        customer: estimate.customer,
      },
    });
  } catch (error) {
    console.error('[mobile/contractor/estimates/[id]/send POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
