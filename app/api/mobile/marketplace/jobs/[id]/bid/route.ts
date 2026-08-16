/**
 * POST /api/mobile/marketplace/jobs/[id]/bid
 *
 * Submit a bid on an open job. Auto-detects whether the job is a
 * WorkOrder (landlord-posted) or HomeownerWorkOrder.
 *
 * Caller must be a contractor (have a ContractorProfile).
 *
 * Body:
 *   {
 *     amount: number,                // required
 *     message?: string,
 *     estimatedHours?: number,
 *     proposedStartDate?: ISO,
 *     estimatedCompletionDate?: ISO,
 *     inclusions?: string[],
 *     exclusions?: string[],
 *     warrantyDays?: number,
 *     paymentTerms?: string,
 *     validUntil?: ISO,
 *     willPullPermits?: boolean
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { emitMarketplaceCard } from '@/lib/services/marketplace-cards';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id: jobId } = await params;
    const body = await req.json();
    const {
      amount,
      message,
      estimatedHours,
      proposedStartDate,
      estimatedCompletionDate,
      inclusions,
      exclusions,
      warrantyDays,
      paymentTerms,
      validUntil,
      willPullPermits,
    } = body ?? {};

    if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'amount is required and must be positive' }, { status: 400 });
    }

    const db = prisma as any;

    // Caller must be a contractor (have a profile or legacy Contractor record)
    const contractorProfile = await db.contractorProfile.findUnique({
      where: { userId: auth.userId },
      select: { id: true },
    });
    const contractorRecord = await db.contractor.findFirst({
      where: { userId: auth.userId },
      select: { id: true },
    });

    if (!contractorProfile && !contractorRecord) {
      return NextResponse.json({ error: 'Only contractors can place bids' }, { status: 403 });
    }

    // Determine job kind: WorkOrder (landlord) or HomeownerWorkOrder (homeowner)
    const wo = await prisma.workOrder.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, isOpenBid: true, bidDeadline: true },
    });

    if (wo) {
      if (!wo.isOpenBid || wo.status !== 'open') {
        return NextResponse.json({ error: 'Job is not open for bidding' }, { status: 400 });
      }
      if (wo.bidDeadline && new Date(wo.bidDeadline) < new Date()) {
        return NextResponse.json({ error: 'Bidding closed' }, { status: 400 });
      }
      if (!contractorRecord) {
        return NextResponse.json(
          { error: 'You need a Contractor business profile to bid on PM jobs' },
          { status: 403 },
        );
      }

      // Block duplicate
      const existing = await prisma.workOrderBid.findFirst({
        where: { workOrderId: jobId, contractorId: contractorRecord.id },
        select: { id: true, status: true },
      });
      if (existing && existing.status === 'pending') {
        return NextResponse.json({ error: 'You already have a pending bid' }, { status: 409 });
      }

      const bid = await prisma.workOrderBid.create({
        data: {
          workOrderId: jobId,
          contractorId: contractorRecord.id,
          amount: Number(amount),
          message: message ?? null,
          estimatedHours: estimatedHours != null ? Number(estimatedHours) : null,
          proposedStartDate: proposedStartDate ? new Date(proposedStartDate) : null,
          estimatedCompletionDate: estimatedCompletionDate ? new Date(estimatedCompletionDate) : null,
          inclusions: Array.isArray(inclusions) ? inclusions : [],
          exclusions: Array.isArray(exclusions) ? exclusions : [],
          warrantyDays: warrantyDays != null ? Number(warrantyDays) : null,
          paymentTerms: paymentTerms ?? null,
          validUntil: validUntil ? new Date(validUntil) : null,
          willPullPermits: willPullPermits ?? null,
          status: 'pending',
        },
      });

      // Drop a "New bid" card into the DM with the landlord that owns this job
      const owner = await db.workOrder.findUnique({
        where: { id: jobId },
        select: { title: true, landlord: { select: { user: { select: { id: true, name: true } } } } },
      });
      const sender = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      });
      await emitMarketplaceCard(auth.userId, owner?.landlord?.user?.id, {
        kind: 'bid_sent',
        title: 'New bid',
        summary: `${sender?.name ?? 'A contractor'} bid $${Number(amount).toFixed(0)} on ${owner?.title ?? 'your job'}`,
        amount: Number(amount),
        refId: bid.id,
        refType: 'bid',
        details: {
          ...(message ? { note: message } : {}),
          ...(estimatedHours ? { hours: Number(estimatedHours) } : {}),
        },
      }, { senderName: sender?.name ?? undefined });

      return NextResponse.json({ success: true, bidId: bid.id, kind: 'workorder' }, { status: 201 });
    }

    // Try homeowner work order
    const hwo = await db.homeownerWorkOrder.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, isOpenBid: true, bidDeadline: true },
    });

    if (hwo) {
      if (!hwo.isOpenBid || hwo.status !== 'open') {
        return NextResponse.json({ error: 'Job is not open for bidding' }, { status: 400 });
      }
      if (hwo.bidDeadline && new Date(hwo.bidDeadline) < new Date()) {
        return NextResponse.json({ error: 'Bidding closed' }, { status: 400 });
      }
      if (!contractorProfile) {
        return NextResponse.json(
          { error: 'You need a marketplace ContractorProfile to bid on homeowner jobs' },
          { status: 403 },
        );
      }

      const existing = await db.homeownerWorkOrderBid.findFirst({
        where: { workOrderId: jobId, contractorId: contractorProfile.id },
        select: { id: true, status: true },
      });
      if (existing && existing.status === 'pending') {
        return NextResponse.json({ error: 'You already have a pending bid' }, { status: 409 });
      }

      const bid = await db.homeownerWorkOrderBid.create({
        data: {
          workOrderId: jobId,
          contractorId: contractorProfile.id,
          amount: Number(amount),
          estimatedHours: estimatedHours != null ? Number(estimatedHours) : null,
          proposedStartDate: proposedStartDate ? new Date(proposedStartDate) : null,
          message: message ?? null,
          status: 'pending',
        },
      });

      const owner = await db.homeownerWorkOrder.findUnique({
        where: { id: jobId },
        select: { title: true, homeowner: { select: { userId: true } } },
      });
      const sender = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      });
      await emitMarketplaceCard(auth.userId, owner?.homeowner?.userId, {
        kind: 'bid_sent',
        title: 'New bid',
        summary: `${sender?.name ?? 'A contractor'} bid $${Number(amount).toFixed(0)} on ${owner?.title ?? 'your job'}`,
        amount: Number(amount),
        refId: bid.id,
        refType: 'bid',
        details: {
          ...(message ? { note: message } : {}),
          ...(estimatedHours ? { hours: Number(estimatedHours) } : {}),
        },
      }, { senderName: sender?.name ?? undefined });

      return NextResponse.json({ success: true, bidId: bid.id, kind: 'homeowner' }, { status: 201 });
    }

    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[mobile/marketplace/bid]', error);
    return NextResponse.json({ error: error?.message || 'Could not submit bid' }, { status: 500 });
  }
}
