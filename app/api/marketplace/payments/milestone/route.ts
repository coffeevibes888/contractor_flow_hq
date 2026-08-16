/**
 * POST /api/marketplace/payments/milestone
 *
 * The single converged endpoint for milestone + materials-advance
 * releases. Drives both:
 *   - WorkOrderMilestone (PM-initiated)
 *   - JobMilestone       (homeowner-initiated)
 *
 * Body:
 *   {
 *     milestoneId: string,
 *     milestoneKind: 'work_order_milestone' | 'job_milestone',
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { releaseMilestoneViaTreasury } from '@/lib/services/treasury-payments.service';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      milestoneId?: string;
      milestoneKind?: 'work_order_milestone' | 'job_milestone';
    };
    if (!body.milestoneId || !body.milestoneKind) {
      return NextResponse.json(
        { error: 'milestoneId and milestoneKind are required.' },
        { status: 400 }
      );
    }

    if (body.milestoneKind === 'work_order_milestone') {
      const milestone = await prisma.workOrderMilestone.findUnique({
        where: { id: body.milestoneId },
        select: {
          id: true,
          status: true,
          amount: true,
          title: true,
          releaseRule: true,
          receiptUrls: true,
          workOrderId: true,
          workOrder: {
            select: {
              landlordId: true,
              contractorId: true,
              landlord: { select: { ownerUserId: true } },
            },
          },
        },
      });
      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found.' },
          { status: 404 }
        );
      }
      if (milestone.workOrder.landlord.ownerUserId !== session.user.id) {
        return NextResponse.json(
          { error: 'Only the property manager can release milestones.' },
          { status: 403 }
        );
      }
      if (milestone.status === 'released') {
        return NextResponse.json(
          { error: 'Milestone already released.' },
          { status: 400 }
        );
      }
      if (
        milestone.releaseRule === 'on_receipts' &&
        milestone.receiptUrls.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              'Materials receipts must be uploaded before this milestone can be released.',
          },
          { status: 400 }
        );
      }

      const isMaterialsAdvance =
        milestone.releaseRule === 'on_receipts';

      const result = await releaseMilestoneViaTreasury({
        amountCents: Math.round(Number(milestone.amount) * 100),
        landlordId: milestone.workOrder.landlordId,
        contractorId: milestone.workOrder.contractorId ?? undefined,
        milestoneId: milestone.id,
        milestoneKind: 'work_order_milestone',
        isMaterialsAdvance,
        description: `Milestone: ${milestone.title}`,
        jobId: milestone.workOrderId,
        jobKind: 'work_order',
        callerUserId: session.user.id,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.message, reason: result.reason },
          { status: 400 }
        );
      }

      // Mark the milestone released in our DB. The Treasury transfer is
      // pending until the webhook fires `treasury.outbound_transfer.posted`,
      // but the spec wants the milestone "released" status set at click time.
      await prisma.workOrderMilestone.update({
        where: { id: milestone.id },
        data: {
          status: 'released',
          releasedAt: new Date(),
          stripeTransferId: result.treasuryTransferId,
        },
      });

      return NextResponse.json(result);
    }

    // job_milestone (homeowner direct flow)
    const milestone = await prisma.jobMilestone.findUnique({
      where: { id: body.milestoneId },
      select: {
        id: true,
        status: true,
        amount: true,
        title: true,
        escrow: {
          select: {
            id: true,
            contractorJobId: true,
            contractorJob: {
              select: {
                id: true,
                customerId: true,
                contractorId: true,
              },
            },
          },
        },
      },
    });
    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found.' },
        { status: 404 }
      );
    }
    if (milestone.escrow.contractorJob.customerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the customer can release this milestone.' },
        { status: 403 }
      );
    }
    if (milestone.status === 'released') {
      return NextResponse.json(
        { error: 'Milestone already released.' },
        { status: 400 }
      );
    }

    // Customer's Landlord row (their wallet is on this row).
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
      select: { id: true },
    });
    if (!landlord) {
      return NextResponse.json(
        {
          error:
            'Set up your wallet (verify identity) before releasing payments.',
        },
        { status: 400 }
      );
    }

    const result = await releaseMilestoneViaTreasury({
      amountCents: Math.round(Number(milestone.amount) * 100),
      landlordId: landlord.id,
      contractorProfileId: milestone.escrow.contractorJob.contractorId,
      milestoneId: milestone.id,
      milestoneKind: 'job_milestone',
      description: `Milestone: ${milestone.title}`,
      jobId: milestone.escrow.contractorJobId,
      jobKind: 'contractor_job',
      callerUserId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, reason: result.reason },
        { status: 400 }
      );
    }

    await prisma.jobMilestone.update({
      where: { id: milestone.id },
      data: {
        status: 'released',
        releasedAt: new Date(),
      },
    });
    await prisma.escrowRelease.create({
      data: {
        escrowId: milestone.escrow.id,
        milestoneId: milestone.id,
        amount: Number(milestone.amount),
        platformFee: 1,
        contractorAmount: Number(milestone.amount) - 1,
        releaseType: 'milestone',
        stripeTransferId: result.treasuryTransferId,
        status: 'processing',
        releasedBy: session.user.id,
        releasedAt: new Date(),
      },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[marketplace/payments/milestone] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not release milestone.' },
      { status: 500 }
    );
  }
}
