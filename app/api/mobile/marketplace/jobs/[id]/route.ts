/**
 * GET /api/mobile/marketplace/jobs/[id]
 *
 * Full state of a marketplace job for the mobile tracking screen.
 * Auto-detects WorkOrder vs HomeownerWorkOrder.
 *
 * Response: {
 *   job: { id, kind, title, description, status, lifecycleStatus, ... },
 *   me:  { isOwner, isContractor },
 *   counterparty: { id?, name, image?, role: 'contractor'|'customer' },
 *   media: [...],
 *   timeline: [...],   // status events with timestamps
 *   threadId: string | null,
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const db = prisma as any;

    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        contractor: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        media: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, type: true, url: true, thumbnailUrl: true,
            caption: true, phase: true, uploaderRole: true, createdAt: true,
          },
        },
        statusEvents: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (wo) {
      const landlord = await db.landlord.findUnique({
        where: { id: wo.landlordId },
        select: { ownerUserId: true, companyName: true, logoUrl: true, name: true },
      });
      const ownerUser = landlord?.ownerUserId
        ? await prisma.user.findUnique({
            where: { id: landlord.ownerUserId },
            select: { id: true, name: true, image: true },
          })
        : null;
      const ownerUserId = landlord?.ownerUserId ?? null;
      const contractorUserId = wo.contractor?.user?.id ?? null;
      const isOwner = ownerUserId === auth.userId;
      const isContractor = contractorUserId === auth.userId;
      if (!isOwner && !isContractor) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
      }

      // Find existing DM thread between the two parties
      const otherUserId = isOwner ? contractorUserId : ownerUserId;
      const thread = otherUserId
        ? await prisma.thread.findFirst({
            where: {
              type: 'dm',
              AND: [
                { participants: { some: { userId: auth.userId } } },
                { participants: { some: { userId: otherUserId } } },
              ],
            },
            select: { id: true },
          })
        : null;

      return NextResponse.json({
        job: {
          id: wo.id,
          kind: 'workorder' as const,
          title: wo.title,
          description: wo.description,
          status: wo.status,
          lifecycleStatus: wo.lifecycleStatus,
          priority: wo.priority,
          agreedPrice: wo.agreedPrice ? Number(wo.agreedPrice) : null,
          escrowAmount: wo.escrowAmount ? Number(wo.escrowAmount) : null,
          escrowStatus: wo.escrowStatus,
          scheduledDate: wo.scheduledDate?.toISOString() ?? null,
          completedAt: wo.completedAt?.toISOString() ?? null,
          pmApprovalDeadline: wo.pmApprovalDeadline?.toISOString() ?? null,
          createdAt: wo.createdAt.toISOString(),
        },
        me: { isOwner, isContractor },
        counterparty: isOwner
          ? {
              id: wo.contractor?.user?.id ?? null,
              name: wo.contractor?.user?.name ?? wo.contractor?.name ?? 'Contractor',
              image: wo.contractor?.user?.image ?? null,
              role: 'contractor' as const,
            }
          : {
              id: ownerUser?.id ?? null,
              name: landlord?.companyName ?? landlord?.name ?? ownerUser?.name ?? 'Customer',
              image: landlord?.logoUrl ?? ownerUser?.image ?? null,
              role: 'customer' as const,
            },
        media: wo.media.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
        timeline: wo.statusEvents.map((e) => ({
          id: e.id,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          actorRole: e.actorRole,
          note: e.note,
          metadata: e.metadata,
          createdAt: e.createdAt.toISOString(),
        })),
        threadId: thread?.id ?? null,
      });
    }

    // Homeowner job
    const hwo = await db.homeownerWorkOrder.findUnique({
      where: { id },
      include: {
        homeowner: { include: { user: { select: { id: true, name: true, image: true } } } },
        bids: { include: {} },
      },
    });
    if (!hwo) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const ownerUserId = hwo.homeowner?.userId ?? null;
    const cp = hwo.contractorId
      ? await db.contractorProfile.findUnique({
          where: { id: hwo.contractorId },
          include: { user: { select: { id: true, name: true, image: true } } },
        })
      : null;
    const contractorUserId = cp?.userId ?? null;
    const isOwner = ownerUserId === auth.userId;
    const isContractor = contractorUserId === auth.userId;
    if (!isOwner && !isContractor) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const otherUserId = isOwner ? contractorUserId : ownerUserId;
    const thread = otherUserId
      ? await prisma.thread.findFirst({
          where: {
            type: 'dm',
            AND: [
              { participants: { some: { userId: auth.userId } } },
              { participants: { some: { userId: otherUserId } } },
            ],
          },
          select: { id: true },
        })
      : null;

    return NextResponse.json({
      job: {
        id: hwo.id,
        kind: 'homeowner' as const,
        title: hwo.title,
        description: hwo.description,
        status: hwo.status,
        lifecycleStatus: hwo.status, // homeowner orders use a single column
        priority: hwo.priority,
        agreedPrice: hwo.agreedPrice ? Number(hwo.agreedPrice) : null,
        escrowAmount: null,
        escrowStatus: 'none',
        scheduledDate: hwo.scheduledDate?.toISOString() ?? null,
        completedAt: hwo.completedAt?.toISOString() ?? null,
        pmApprovalDeadline: null,
        createdAt: hwo.createdAt.toISOString(),
      },
      me: { isOwner, isContractor },
      counterparty: isOwner
        ? {
            id: cp?.user?.id ?? null,
            name: cp?.businessName ?? cp?.user?.name ?? 'Contractor',
            image: cp?.profilePhoto ?? cp?.user?.image ?? null,
            role: 'contractor' as const,
          }
        : {
            id: hwo.homeowner?.user?.id ?? null,
            name: hwo.homeowner?.user?.name ?? 'Homeowner',
            image: hwo.homeowner?.user?.image ?? null,
            role: 'customer' as const,
          },
      media: (hwo.images ?? []).map((url: string, i: number) => ({
        id: `hwo-${i}`,
        type: 'image' as const,
        url,
        thumbnailUrl: null,
        caption: null,
        phase: 'before' as const,
        uploaderRole: 'homeowner',
        createdAt: hwo.createdAt.toISOString(),
      })),
      timeline: [],
      threadId: thread?.id ?? null,
    });
  } catch (error: any) {
    console.error('[mobile/marketplace/jobs/[id] GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not load job' }, { status: 500 });
  }
}
