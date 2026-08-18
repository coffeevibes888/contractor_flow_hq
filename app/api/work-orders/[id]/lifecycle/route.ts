/**
 * POST /api/work-orders/[id]/lifecycle
 *
 * Drives the Uber-style state machine. Body: { action: <action>, ... }
 *
 * Actions and who can call them:
 *   - 'schedule'       (contractor) -> funded -> scheduled, sets scheduledDate
 *   - 'start_work'     (contractor) -> funded|scheduled -> in_progress
 *   - 'mark_complete'  (contractor) -> in_progress -> awaiting_approval, sets pmApprovalDeadline
 *   - 'approve'        (landlord)   -> awaiting_approval -> released  (triggers Stripe Transfer)
 *   - 'cancel'         (landlord)   -> pending|funded -> cancelled    (refunds if funded)
 *
 * Releasing funds and refunds happen via the StripeEscrowService. If the
 * contractor isn't yet onboarded, the transition still succeeds and the
 * payout will retry from the cron once they finish onboarding.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import {
  computeApprovalDeadline,
  recordTransition,
  releaseFundsForWorkOrder,
} from '@/lib/services/work-order-lifecycle';

type Action = 'schedule' | 'start_work' | 'mark_complete' | 'approve' | 'cancel';

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
      action: Action;
      scheduledDate?: string;
      note?: string;
    };

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

    switch (body.action) {
      case 'schedule': {
        if (!isContractor) {
          return NextResponse.json(
            { success: false, error: 'Only the contractor can schedule' },
            { status: 403 }
          );
        }
        if (!body.scheduledDate) {
          return NextResponse.json(
            { success: false, error: 'scheduledDate is required' },
            { status: 400 }
          );
        }
        await recordTransition({
          workOrderId,
          to: 'scheduled',
          actorUserId: session.user.id,
          actorRole: 'contractor',
          note: body.note ?? `Scheduled for ${body.scheduledDate}`,
          workOrderPatch: { scheduledDate: new Date(body.scheduledDate) },
        });
        break;
      }

      case 'start_work': {
        if (!isContractor) {
          return NextResponse.json(
            { success: false, error: 'Only the contractor can start work' },
            { status: 403 }
          );
        }
        await recordTransition({
          workOrderId,
          to: 'in_progress',
          actorUserId: session.user.id,
          actorRole: 'contractor',
          note: body.note ?? 'Contractor started work',
          workOrderPatch: {
            status: 'in_progress',
            lifecycleStartedAt: new Date(),
          },
        });
        break;
      }

      case 'mark_complete': {
        if (!isContractor) {
          return NextResponse.json(
            { success: false, error: 'Only the contractor can mark complete' },
            { status: 403 }
          );
        }
        const completedAt = new Date();
        await recordTransition({
          workOrderId,
          to: 'awaiting_approval',
          actorUserId: session.user.id,
          actorRole: 'contractor',
          note: body.note ?? 'Contractor marked job complete',
          workOrderPatch: {
            status: 'completed',
            completedAt,
            lifecycleCompletedAt: completedAt,
            pmApprovalDeadline: computeApprovalDeadline(completedAt),
          },
        });
        break;
      }

      case 'approve': {
        if (!isOwner) {
          return NextResponse.json(
            { success: false, error: 'Only the property manager can approve' },
            { status: 403 }
          );
        }
        // Guarded by `isOwner` above, so the actor is always the landlord.
        // releaseFundsForWorkOrder only accepts 'landlord' | 'system'.
        await releaseFundsForWorkOrder({
          workOrderId,
          actorUserId: session.user.id,
          actorRole: 'landlord',
          note: body.note ?? 'PM approved work — funds released',
        });
        break;
      }

      case 'cancel': {
        if (!isOwner) {
          return NextResponse.json(
            { success: false, error: 'Only the property manager can cancel' },
            { status: 403 }
          );
        }
        // If funded, refund the PaymentIntent before transitioning
        if (wo.lifecycleStatus === 'funded' && wo.stripePaymentIntentId) {
          await stripe.refunds.create({
            payment_intent: wo.stripePaymentIntentId,
            reason: 'requested_by_customer',
            metadata: { workOrderId, reason: 'cancel_before_start' },
          });
          await recordTransition({
            workOrderId,
            to: 'refunded',
            actorUserId: session.user.id,
            actorRole: 'landlord',
            note: body.note ?? 'Cancelled before work began — funds refunded',
            workOrderPatch: {
              status: 'cancelled',
              escrowStatus: 'refunded',
              escrowRefundedAt: new Date(),
            },
          });
        } else {
          await recordTransition({
            workOrderId,
            to: 'cancelled',
            actorUserId: session.user.id,
            actorRole: 'landlord',
            note: body.note ?? 'Cancelled',
            workOrderPatch: { status: 'cancelled' },
          });
        }
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }

    const updated = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        lifecycleStatus: true,
        pmApprovalDeadline: true,
        escrowStatus: true,
        escrowReleasedAt: true,
      },
    });
    return NextResponse.json({ success: true, workOrder: updated });
  } catch (error) {
    console.error('lifecycle error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// releaseFundsForWorkOrder is now imported from '@/lib/services/work-order-lifecycle'
