/**
 * POST /api/work-orders/[id]/dispute
 *
 * Either party can open a dispute. Funds freeze (no auto-release while
 * disputed). Resolution is handled by an admin via a separate endpoint.
 *
 * Body: { reason, description, evidenceUrls?: string[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { recordTransition } from '@/lib/services/work-order-lifecycle';

const VALID_REASONS = ['quality', 'incomplete', 'no_show', 'overcharge', 'other'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id: workOrderId } = await params;
    const body = (await req.json()) as {
      reason: string;
      description: string;
      evidenceUrls?: string[];
    };

    if (!body.reason || !VALID_REASONS.includes(body.reason)) {
      return NextResponse.json(
        { success: false, error: `reason must be one of ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      );
    }
    if (!body.description?.trim() || body.description.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: 'description must be at least 20 characters' },
        { status: 400 }
      );
    }

    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        landlord: { select: { ownerUserId: true } },
        contractor: { select: { userId: true } },
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const isOwner = wo.landlord.ownerUserId === session.user.id;
    const isContractor = !!wo.contractor && wo.contractor.userId === session.user.id;
    if (!isOwner && !isContractor) {
      return NextResponse.json({ success: false, error: 'Not a participant' }, { status: 403 });
    }

    // Cannot dispute terminal states
    if (['released', 'refunded', 'cancelled'].includes(wo.lifecycleStatus)) {
      return NextResponse.json(
        { success: false, error: `Cannot dispute a job that is ${wo.lifecycleStatus}` },
        { status: 400 }
      );
    }

    const role = isOwner ? 'landlord' : 'contractor';

    const dispute = await prisma.$transaction(async (tx) => {
      const created = await tx.workOrderDispute.create({
        data: {
          workOrderId,
          filedByUserId: session.user.id!,
          filedByRole: role,
          reason: body.reason,
          description: body.description.trim(),
          evidenceUrls: body.evidenceUrls ?? [],
        },
      });

      await recordTransition({
        tx,
        workOrderId,
        to: 'disputed',
        actorUserId: session.user.id,
        actorRole: role,
        note: `Dispute opened: ${body.reason}`,
        metadata: { disputeId: created.id, reason: body.reason },
        workOrderPatch: { escrowStatus: 'disputed' },
      });

      return created;
    });

    return NextResponse.json({ success: true, dispute });
  } catch (error) {
    console.error('dispute error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
