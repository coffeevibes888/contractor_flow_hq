/**
 * POST /api/contractor/estimates/[id]/send
 *
 * Marks an estimate as sent and emits `contractor.estimate.sent`. The event
 * powers the followup automation (48h nudge, 5d discount, 14d expire).
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

async function verifyOwnership(userId: string, estimate: any): Promise<boolean> {
  if (estimate.contractorProfileId) {
    const profile = await prisma.contractorProfile.findUnique({
      where: { id: estimate.contractorProfileId },
      select: { userId: true },
    });
    if (profile?.userId === userId) return true;
  }
  if (estimate.contractorId) {
    const contractor = await prisma.contractor.findUnique({
      where: { id: estimate.contractorId },
      select: { userId: true },
    });
    if (contractor?.userId === userId) return true;
  }
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const isOwner = await verifyOwnership(session.user.id, estimate);
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (estimate.isTemplate) {
      return NextResponse.json({ error: 'Templates cannot be sent' }, { status: 400 });
    }

    if (estimate.status === 'accepted' || estimate.status === 'converted') {
      return NextResponse.json({ error: 'This estimate has already been accepted' }, { status: 400 });
    }

    const sentAt = new Date();

    const updated = await prisma.contractorEstimate.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt,
      },
    });

    await eventBus.emit('contractor.estimate.sent', {
      estimateId: estimate.id,
      contractorId: estimate.contractorId,
      contractorProfileId: estimate.contractorProfileId,
      contractorUserId: session.user.id,
      title: estimate.title,
      totalAmount: Number(estimate.totalAmount),
      validUntil: estimate.validUntil ? estimate.validUntil.toISOString() : null,
      sentAt: sentAt.toISOString(),
      customer: estimate.customer,
    });

    return NextResponse.json({ estimate: updated });
  } catch (error) {
    console.error('Error sending estimate:', error);
    return NextResponse.json({ error: 'Failed to send estimate' }, { status: 500 });
  }
}
