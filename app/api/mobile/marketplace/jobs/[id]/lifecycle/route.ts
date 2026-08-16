/**
 * POST /api/mobile/marketplace/jobs/[id]/lifecycle
 *
 * Drives the Uber/Airbnb-style state machine for a job. Auto-detects
 * WorkOrder vs HomeownerWorkOrder.
 *
 * Body:
 *   {
 *     action: 'schedule'|'start_work'|'mark_complete'|'approve'|'cancel'|'check_in',
 *     scheduledDate?: ISO,            // schedule only
 *     gps?: { lat, lng, address? },   // check_in / start_work / mark_complete (optional)
 *     note?: string
 *   }
 *
 * Permissions:
 *   - schedule, start_work, check_in, mark_complete  → contractor only
 *   - approve, cancel                                → job owner only
 *
 * On approve: WorkOrder uses the existing `recordTransition` which triggers
 * Stripe escrow release. HomeownerWorkOrder is simpler — flips status and
 * records a job_completed event card.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { recordTransition } from '@/lib/services/work-order-lifecycle';
import { emitMarketplaceCard } from '@/lib/services/marketplace-cards';

type Action = 'schedule' | 'start_work' | 'mark_complete' | 'approve' | 'cancel' | 'check_in';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id: jobId } = await params;
    const body = await req.json();
    const action = body?.action as Action;
    const scheduledDate = body?.scheduledDate;
    const gps = body?.gps as { lat?: number; lng?: number; address?: string } | undefined;
    const note = body?.note as string | undefined;

    if (!['schedule', 'start_work', 'mark_complete', 'approve', 'cancel', 'check_in'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const db = prisma as any;

    // Try WorkOrder first
    const wo = await prisma.workOrder.findUnique({
      where: { id: jobId },
      include: {
        contractor: { select: { userId: true } },
      },
    });

    if (wo) {
      // Resolve owner user id via landlordId (Landlord.ownerUserId is the link)
      const landlord = await db.landlord.findUnique({
        where: { id: wo.landlordId },
        select: { ownerUserId: true },
      });
      const ownerUserId = landlord?.ownerUserId ?? null;
      const contractorUserId = wo.contractor?.userId ?? null;
      const isOwner = ownerUserId === auth.userId;
      const isContractor = contractorUserId === auth.userId;
      if (!isOwner && !isContractor) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
      }

      const sender = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      });

      switch (action) {
        case 'schedule': {
          if (!isContractor) return NextResponse.json({ error: 'Only contractor can schedule' }, { status: 403 });
          if (!scheduledDate) return NextResponse.json({ error: 'scheduledDate required' }, { status: 400 });
          await recordTransition({
            workOrderId: jobId,
            to: 'scheduled',
            actorUserId: auth.userId,
            actorRole: 'contractor',
            note: note ?? `Scheduled for ${scheduledDate}`,
            workOrderPatch: { scheduledDate: new Date(scheduledDate) },
          });
          await emitMarketplaceCard(auth.userId, ownerUserId, {
            kind: 'job_completed',
            title: 'Scheduled',
            summary: `${sender?.name ?? 'Contractor'} scheduled the job for ${new Date(scheduledDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
            refId: jobId,
            refType: 'job',
            details: { when: new Date(scheduledDate).toISOString() },
          });
          return NextResponse.json({ success: true, status: 'scheduled' });
        }

        case 'check_in':
        case 'start_work': {
          if (!isContractor) return NextResponse.json({ error: 'Only contractor can start' }, { status: 403 });
          await recordTransition({
            workOrderId: jobId,
            to: 'in_progress',
            actorUserId: auth.userId,
            actorRole: 'contractor',
            note: note ?? (gps?.address ? `On site at ${gps.address}` : 'Started work'),
            workOrderPatch: {
              status: 'in_progress',
              lifecycleStartedAt: new Date(),
            },
            metadata: gps ? { gps } : undefined,
          });
          await emitMarketplaceCard(auth.userId, ownerUserId, {
            kind: 'job_completed',
            title: action === 'check_in' ? 'On site' : 'Work started',
            summary: gps?.address
              ? `${sender?.name ?? 'Contractor'} arrived at ${gps.address}`
              : `${sender?.name ?? 'Contractor'} started work on this job`,
            refId: jobId,
            refType: 'job',
            details: gps?.lat ? { gpsLat: gps.lat, gpsLng: gps.lng ?? null, gpsAddress: gps.address ?? null } : undefined,
          });
          return NextResponse.json({ success: true, status: 'in_progress' });
        }

        case 'mark_complete': {
          if (!isContractor) return NextResponse.json({ error: 'Only contractor can mark complete' }, { status: 403 });
          const completedAt = new Date();
          // Approval window — 5 days default
          const deadline = new Date(completedAt.getTime() + 5 * 24 * 60 * 60 * 1000);
          await recordTransition({
            workOrderId: jobId,
            to: 'awaiting_approval',
            actorUserId: auth.userId,
            actorRole: 'contractor',
            note: note ?? 'Marked complete by contractor',
            workOrderPatch: {
              completedAt,
              lifecycleCompletedAt: completedAt,
              pmApprovalDeadline: deadline,
            },
          });
          await emitMarketplaceCard(auth.userId, ownerUserId, {
            kind: 'job_completed',
            title: 'Job marked complete',
            summary: `${sender?.name ?? 'Contractor'} marked ${wo.title} complete. Approve to release escrow.`,
            refId: jobId,
            refType: 'job',
            details: { approvalDeadline: deadline.toISOString() },
          });
          return NextResponse.json({ success: true, status: 'awaiting_approval' });
        }

        case 'approve': {
          if (!isOwner) return NextResponse.json({ error: 'Only owner can approve' }, { status: 403 });
          await recordTransition({
            workOrderId: jobId,
            to: 'released',
            actorUserId: auth.userId,
            actorRole: 'landlord',
            note: note ?? 'Approved by landlord',
            workOrderPatch: { lifecycleApprovedAt: new Date(), status: 'completed' },
          });
          // The escrow Stripe transfer is handled inside recordTransition's
          // existing handlers and the cron job. The card just communicates
          // the decision to the contractor.
          await emitMarketplaceCard(auth.userId, contractorUserId, {
            kind: 'job_completed',
            title: 'Approved & released',
            summary: 'Customer approved the job. Funds released from escrow.',
            refId: jobId,
            refType: 'job',
            details: { paid: true },
          });
          // Then prompt the customer to leave a review
          await emitMarketplaceCard(auth.userId, contractorUserId, {
            kind: 'review_request',
            title: 'Leave a review',
            summary: 'How did the job go? A 5-star review boosts your ranking.',
            refId: jobId,
            refType: 'job',
          });
          return NextResponse.json({ success: true, status: 'released' });
        }

        case 'cancel': {
          if (!isOwner) return NextResponse.json({ error: 'Only owner can cancel' }, { status: 403 });
          await recordTransition({
            workOrderId: jobId,
            to: 'cancelled',
            actorUserId: auth.userId,
            actorRole: 'landlord',
            note: note ?? 'Cancelled by landlord',
            workOrderPatch: { status: 'cancelled' },
          });
          await emitMarketplaceCard(auth.userId, contractorUserId, {
            kind: 'bid_declined',
            title: 'Job cancelled',
            summary: note ? `Customer cancelled: "${note}"` : 'Customer cancelled the job',
            refId: jobId,
            refType: 'job',
          });
          return NextResponse.json({ success: true, status: 'cancelled' });
        }
      }
    }

    // Homeowner job — simpler state machine
    const hwo = await db.homeownerWorkOrder.findUnique({
      where: { id: jobId },
      include: {
        homeowner: { select: { userId: true, user: { select: { id: true, name: true } } } },
      },
    });

    if (hwo) {
      const ownerUserId = hwo.homeowner?.userId ?? null;
      const contractor = hwo.contractorId
        ? await db.contractorProfile.findUnique({
            where: { id: hwo.contractorId },
            select: { userId: true },
          })
        : null;
      const contractorUserId = contractor?.userId ?? null;

      const isOwner = ownerUserId === auth.userId;
      const isContractor = contractorUserId === auth.userId;
      if (!isOwner && !isContractor) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
      }

      const sender = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      });

      const cardForCounterparty = (
        kind: Parameters<typeof emitMarketplaceCard>[2]['kind'],
        title: string,
        summary: string,
        details?: Record<string, any>,
      ) =>
        emitMarketplaceCard(
          auth.userId,
          isOwner ? contractorUserId : ownerUserId,
          { kind, title, summary, refId: jobId, refType: 'job', details },
          { senderName: sender?.name ?? undefined },
        );

      switch (action) {
        case 'schedule': {
          if (!isContractor) return NextResponse.json({ error: 'Only contractor can schedule' }, { status: 403 });
          if (!scheduledDate) return NextResponse.json({ error: 'scheduledDate required' }, { status: 400 });
          await db.homeownerWorkOrder.update({
            where: { id: jobId },
            data: { scheduledDate: new Date(scheduledDate), status: 'scheduled' },
          });
          await cardForCounterparty(
            'job_completed',
            'Scheduled',
            `${sender?.name ?? 'Contractor'} scheduled the job for ${new Date(scheduledDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
            { when: new Date(scheduledDate).toISOString() },
          );
          return NextResponse.json({ success: true, status: 'scheduled' });
        }

        case 'check_in':
        case 'start_work': {
          if (!isContractor) return NextResponse.json({ error: 'Only contractor can start' }, { status: 403 });
          await db.homeownerWorkOrder.update({
            where: { id: jobId },
            data: { status: 'in_progress' },
          });
          await cardForCounterparty(
            'job_completed',
            action === 'check_in' ? 'On site' : 'Work started',
            gps?.address
              ? `${sender?.name ?? 'Contractor'} arrived at ${gps.address}`
              : `${sender?.name ?? 'Contractor'} started work`,
            gps?.lat ? { gpsLat: gps.lat, gpsLng: gps.lng ?? null, gpsAddress: gps.address ?? null } : undefined,
          );
          return NextResponse.json({ success: true, status: 'in_progress' });
        }

        case 'mark_complete': {
          if (!isContractor) return NextResponse.json({ error: 'Only contractor can mark complete' }, { status: 403 });
          await db.homeownerWorkOrder.update({
            where: { id: jobId },
            data: { status: 'awaiting_approval', completedAt: new Date() },
          });
          await cardForCounterparty(
            'job_completed',
            'Job marked complete',
            `${sender?.name ?? 'Contractor'} marked the job complete. Approve to confirm.`,
          );
          return NextResponse.json({ success: true, status: 'awaiting_approval' });
        }

        case 'approve': {
          if (!isOwner) return NextResponse.json({ error: 'Only owner can approve' }, { status: 403 });
          await db.homeownerWorkOrder.update({
            where: { id: jobId },
            data: { status: 'completed' },
          });
          await cardForCounterparty(
            'job_completed',
            'Approved',
            'Customer approved the job.',
            { paid: true },
          );
          await cardForCounterparty(
            'review_request',
            'Leave a review',
            'How did the job go?',
          );
          return NextResponse.json({ success: true, status: 'completed' });
        }

        case 'cancel': {
          if (!isOwner) return NextResponse.json({ error: 'Only owner can cancel' }, { status: 403 });
          await db.homeownerWorkOrder.update({
            where: { id: jobId },
            data: { status: 'cancelled' },
          });
          await cardForCounterparty(
            'bid_declined',
            'Job cancelled',
            note ? `Customer cancelled: "${note}"` : 'Customer cancelled the job',
          );
          return NextResponse.json({ success: true, status: 'cancelled' });
        }
      }
    }

    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[mobile/marketplace/jobs/[id]/lifecycle]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not perform action' }, { status: 500 });
  }
}
