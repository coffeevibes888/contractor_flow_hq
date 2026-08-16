/**
 * POST /api/work-orders/[id]/milestones/[milestoneId]
 *
 * Body: { action: 'release' | 'upload_receipts', receiptUrls?: string[] }
 *
 * - action='release' (PM only): transfers the milestone amount to the
 *   contractor's connected account and marks the milestone released.
 *   For 'on_receipts' milestones, requires receipts to be uploaded first.
 *
 * - action='upload_receipts' (contractor): attaches receipt URLs to a
 *   milestone (typically a materials advance) so the PM can verify before
 *   releasing.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const { id: workOrderId, milestoneId } = await params;
    const body = (await req.json()) as {
      action: 'release' | 'upload_receipts';
      receiptUrls?: string[];
    };

    const milestone = await prisma.workOrderMilestone.findFirst({
      where: { id: milestoneId, workOrderId },
      include: {
        workOrder: {
          include: {
            landlord: { select: { ownerUserId: true } },
            contractor: { select: { id: true, userId: true } },
          },
        },
      },
    });
    if (!milestone) {
      return NextResponse.json({ success: false, error: 'Milestone not found' }, { status: 404 });
    }

    const isOwner = milestone.workOrder.landlord.ownerUserId === session.user.id;
    const isContractor =
      !!milestone.workOrder.contractor &&
      milestone.workOrder.contractor.userId === session.user.id;

    if (body.action === 'upload_receipts') {
      if (!isContractor) {
        return NextResponse.json(
          { success: false, error: 'Only the contractor can upload receipts' },
          { status: 403 }
        );
      }
      const urls = (body.receiptUrls ?? []).filter((u) => typeof u === 'string' && u.trim());
      if (urls.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Provide at least one receipt URL' },
          { status: 400 }
        );
      }
      const updated = await prisma.workOrderMilestone.update({
        where: { id: milestoneId },
        data: {
          receiptUrls: { set: [...milestone.receiptUrls, ...urls] },
          status: milestone.status === 'pending' ? 'ready' : milestone.status,
        },
      });
      return NextResponse.json({ success: true, milestone: updated });
    }

    if (body.action === 'release') {
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Only the PM can release milestones' },
          { status: 403 }
        );
      }
      if (milestone.status === 'released') {
        return NextResponse.json(
          { success: false, error: 'Milestone already released' },
          { status: 400 }
        );
      }
      if (milestone.releaseRule === 'on_receipts' && milestone.receiptUrls.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Materials receipts must be uploaded before this milestone can be released' },
          { status: 400 }
        );
      }

      // Resolve contractor connect account
      const profile = milestone.workOrder.contractor?.userId
        ? await prisma.contractorProfile.findFirst({
            where: { userId: milestone.workOrder.contractor.userId },
            select: { stripeConnectAccountId: true, isPaymentReady: true },
          })
        : null;

      let transferId: string | null = null;
      if (profile?.isPaymentReady && profile.stripeConnectAccountId) {
        const transfer = await stripe.transfers.create({
          amount: Math.round(Number(milestone.amount) * 100),
          currency: 'usd',
          destination: profile.stripeConnectAccountId,
          transfer_group: `wo_${workOrderId}`,
          metadata: {
            workOrderId,
            milestoneId,
            purpose: 'work_order_milestone_release',
          },
        });
        transferId = transfer.id;
      }
      // If not payment-ready, mark released anyway — manual reconcile later.

      const updated = await prisma.workOrderMilestone.update({
        where: { id: milestoneId },
        data: {
          status: 'released',
          releasedAt: new Date(),
          stripeTransferId: transferId,
        },
      });

      // Audit event on the work order
      await prisma.workOrderStatusEvent.create({
        data: {
          workOrderId,
          fromStatus: milestone.workOrder.lifecycleStatus,
          toStatus: milestone.workOrder.lifecycleStatus, // no lifecycle change
          actorUserId: session.user.id,
          actorRole: 'landlord',
          note: `Milestone "${milestone.title}" released ($${Number(milestone.amount).toLocaleString()})`,
          metadata: { milestoneId, transferId, amount: Number(milestone.amount) } as any,
        },
      });

      // Fire a notification to the contractor
      try {
        const { default: prismaClient } = await import('@/db/prisma');
        const contractorUserId = milestone.workOrder.contractor?.userId;
        if (contractorUserId) {
          await prismaClient.notification.create({
            data: {
              userId: contractorUserId,
              type: 'milestone_released',
              title: '💰 Milestone Released',
              message: `$${Number(milestone.amount).toLocaleString()} for "${milestone.title}" was released to your account.`,
              actionUrl: `/contractor/payouts`,
              metadata: { workOrderId, milestoneId } as any,
            },
          });
        }
      } catch (e) {
        console.error('milestone notification failed', e);
      }

      return NextResponse.json({ success: true, milestone: updated, transferId });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('milestone action error:', e);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
