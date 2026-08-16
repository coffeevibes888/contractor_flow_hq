/**
 * GET    /api/mobile/marketplace/jobs/[id]/media   - list media for a job
 * POST   /api/mobile/marketplace/jobs/[id]/media   - attach a new image / video
 *   body: { url, thumbnailUrl?, type ('image'|'video'), phase ('before'|'during'|'after'), caption?, gps? }
 *
 * Auto-detects WorkOrder vs HomeownerWorkOrder. Both job kinds store media
 * via WorkOrderMedia with a workOrderId — for HomeownerWorkOrder we mirror
 * the column by using the same id space (since we now allow Media to be
 * keyed off either). To stay schema-safe we save the row only for
 * WorkOrder and store homeowner-job media as JSON on the job's images
 * array fallback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { emitMarketplaceCard } from '@/lib/services/marketplace-cards';

type Phase = 'before' | 'during' | 'after';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id: jobId } = await params;
    const db = prisma as any;

    const wo = await prisma.workOrder.findUnique({ where: { id: jobId }, select: { id: true } });
    if (wo) {
      const media = await prisma.workOrderMedia.findMany({
        where: { workOrderId: jobId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          type: true,
          url: true,
          thumbnailUrl: true,
          caption: true,
          phase: true,
          uploaderRole: true,
          createdAt: true,
        },
      });
      return NextResponse.json({
        media: media.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    }

    const hwo = await db.homeownerWorkOrder.findUnique({
      where: { id: jobId },
      select: { id: true, images: true },
    });
    if (hwo) {
      // Homeowner work orders use the simple `images: string[]` column.
      // Convert to the same shape so the mobile UI doesn't care which kind.
      return NextResponse.json({
        media: (hwo.images ?? []).map((url: string, i: number) => ({
          id: `hwo-${i}`,
          type: 'image' as const,
          url,
          thumbnailUrl: null,
          caption: null,
          phase: 'before' as Phase,
          uploaderRole: 'homeowner',
          createdAt: new Date().toISOString(),
        })),
      });
    }

    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[mobile/marketplace/jobs/[id]/media GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not load media' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id: jobId } = await params;
    const body = await req.json();
    const { url, thumbnailUrl, type, phase, caption, gps } = body ?? {};

    if (!url || !['image', 'video'].includes(type) || !['before', 'during', 'after'].includes(phase)) {
      return NextResponse.json(
        { error: 'url, type (image|video), phase (before|during|after) are required' },
        { status: 400 },
      );
    }

    const db = prisma as any;

    // Determine kind + actor role
    const wo = await prisma.workOrder.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        landlordId: true,
        contractorId: true,
        contractor: { select: { userId: true } },
      },
    });

    if (wo) {
      const landlord = await db.landlord.findUnique({
        where: { id: wo.landlordId },
        select: { ownerUserId: true },
      });
      const ownerUserId = landlord?.ownerUserId ?? null;
      const contractorUserId = wo.contractor?.userId ?? null;
      const isOwner = ownerUserId === auth.userId;
      const isContractor = contractorUserId === auth.userId;
      if (!isOwner && !isContractor) {
        return NextResponse.json({ error: 'Not a participant on this job' }, { status: 403 });
      }
      const uploaderRole = isOwner ? 'landlord' : 'contractor';

      const media = await prisma.workOrderMedia.create({
        data: {
          workOrderId: jobId,
          uploadedById: auth.userId,
          uploaderRole,
          type,
          url,
          thumbnailUrl: thumbnailUrl ?? null,
          caption: caption ?? null,
          phase,
        },
      });

      // Emit a card to the other party so the chat shows the new photo
      const counterpartyId = isOwner ? contractorUserId : ownerUserId;
      const sender = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
      await emitMarketplaceCard(auth.userId, counterpartyId, {
        kind: 'job_completed', // generic media event — reuse the trophy icon family
        title: `${phase.charAt(0).toUpperCase() + phase.slice(1)} photo added`,
        summary: `${sender?.name ?? 'Someone'} added a ${phase} ${type} to ${wo.title}`,
        refId: jobId,
        refType: 'job',
        details: {
          mediaUrl: url,
          phase,
          ...(gps ? { gpsLat: gps.lat, gpsLng: gps.lng } : {}),
        },
      }, { senderName: sender?.name ?? undefined });

      return NextResponse.json({ success: true, mediaId: media.id }, { status: 201 });
    }

    // Homeowner work order fallback — store on the images array
    const hwo = await db.homeownerWorkOrder.findUnique({
      where: { id: jobId },
      select: { id: true, images: true, homeownerId: true, contractorId: true },
    });
    if (hwo) {
      const homeowner = await db.homeowner.findUnique({
        where: { id: hwo.homeownerId },
        select: { userId: true },
      });
      const contractor = hwo.contractorId
        ? await db.contractorProfile.findUnique({
            where: { id: hwo.contractorId },
            select: { userId: true },
          })
        : null;

      const isOwner = homeowner?.userId === auth.userId;
      const isContractor = contractor?.userId === auth.userId;
      if (!isOwner && !isContractor) {
        return NextResponse.json({ error: 'Not a participant on this job' }, { status: 403 });
      }

      await db.homeownerWorkOrder.update({
        where: { id: jobId },
        data: { images: { push: url } },
      });

      const counterpartyId = isOwner ? contractor?.userId : homeowner?.userId;
      const sender = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
      await emitMarketplaceCard(auth.userId, counterpartyId ?? null, {
        kind: 'job_completed',
        title: `${phase.charAt(0).toUpperCase() + phase.slice(1)} photo added`,
        summary: `${sender?.name ?? 'Someone'} added a ${phase} ${type}`,
        refId: jobId,
        refType: 'job',
        details: { mediaUrl: url, phase },
      }, { senderName: sender?.name ?? undefined });

      return NextResponse.json({ success: true, mediaId: `hwo-${Date.now()}` }, { status: 201 });
    }

    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[mobile/marketplace/jobs/[id]/media POST]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not attach media' }, { status: 500 });
  }
}
