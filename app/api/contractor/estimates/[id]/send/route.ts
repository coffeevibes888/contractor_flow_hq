/**
 * POST /api/contractor/estimates/[id]/send
 *
 * Marks an estimate as sent and emits `contractor.estimate.sent`. The event
 * is what powers the followup automation (48h nudge, 5d discount, 14d expire).
 *
 * The route was previously an empty file — it existed in the routing tree
 * but did nothing. Implementing it here turns the "Send Estimate" button
 * into the trigger for the entire downstream pipeline.
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';
import { errorResponse, serverError } from '@/lib/contractor-route-helpers';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;

    const estimate = await prisma.contractorEstimate.findUnique({
      where: { id },
      include: {
        contractor: { select: { id: true, userId: true } },
        landlord: { select: { id: true, companyEmail: true, companyName: true } },
      },
    });

    if (!estimate) {
      return errorResponse('Estimate not found', 404);
    }

    if (estimate.contractor.userId !== session.user.id) {
      return errorResponse('Unauthorized', 403);
    }

    if (estimate.isTemplate) {
      return errorResponse('Templates cannot be sent', 400, { code: 'IS_TEMPLATE' });
    }

    if (estimate.status === 'sent' || estimate.status === 'viewed') {
      return errorResponse('Estimate has already been sent', 400, { code: 'ALREADY_SENT' });
    }

    const sentAt = new Date();

    const updated = await prisma.contractorEstimate.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt,
      },
    });

    // The event handler is responsible for the actual delivery (email, SMS,
    // notification) plus scheduling the followup reminder cascade. Emitting
    // here keeps the route handler thin and the side effects testable.
    await eventBus.emit('contractor.estimate.sent', {
      estimateId: estimate.id,
      contractorId: estimate.contractorId,
      contractorUserId: estimate.contractor.userId,
      landlordId: estimate.landlordId,
      title: estimate.title,
      totalAmount: Number(estimate.totalAmount),
      validUntil: estimate.validUntil ? estimate.validUntil.toISOString() : null,
      sentAt: sentAt.toISOString(),
    });

    return NextResponse.json({ estimate: updated });
  } catch (error) {
    return serverError('Failed to send estimate', error);
  }
}
