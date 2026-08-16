/**
 * Work orders — mobile-token equivalents of the website's /api/work-orders
 * GET (list) and POST (create). Supports both direct assignment to an
 * in-house Contractor and posting to the public marketplace via
 * `isOpenBid: true` (which the existing event system pings out to bidders).
 *
 * GET  /api/mobile/pm/work-orders?status=
 * POST /api/mobile/pm/work-orders
 *      Body: {
 *        title, description, propertyId,
 *        contractorId?, unitId?, maintenanceTicketId?,
 *        priority?, agreedPrice?, scheduledDate?, notes?,
 *        isOpenBid?, budgetMin?, budgetMax?, bidDeadline?,
 *        postingType?: 'bid' | 'estimate'
 *      }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

async function ctxFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: payload.userId },
    select: { id: true },
  });
  return landlord ? { landlordId: landlord.id, userId: payload.userId } : null;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const contractorId = searchParams.get('contractorId') ?? undefined;
    const propertyId = searchParams.get('propertyId') ?? undefined;
    const isOpenBid = searchParams.get('isOpenBid');

    const where: any = { landlordId: ctx.landlordId };
    if (status && status !== 'all') where.status = status;
    if (contractorId) where.contractorId = contractorId;
    if (propertyId) where.propertyId = propertyId;
    if (isOpenBid === 'true') where.isOpenBid = true;

    const workOrders = await prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contractor: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        bids: { select: { id: true, amount: true, status: true, contractorId: true } },
        media: {
          take: 4,
          orderBy: { createdAt: 'asc' },
          select: { id: true, url: true, type: true, thumbnailUrl: true },
        },
        _count: { select: { bids: true } },
      },
    });

    // Status counts for the tab strip in the UI.
    const counts = await prisma.workOrder.groupBy({
      by: ['status'],
      where: { landlordId: ctx.landlordId },
      _count: true,
    });

    return NextResponse.json({
      workOrders: workOrders.map((wo) => ({
        id: wo.id,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        agreedPrice: wo.agreedPrice ? Number(wo.agreedPrice) : null,
        actualCost: wo.actualCost ? Number(wo.actualCost) : null,
        budgetMin: wo.budgetMin ? Number(wo.budgetMin) : null,
        budgetMax: wo.budgetMax ? Number(wo.budgetMax) : null,
        isOpenBid: wo.isOpenBid,
        bidDeadline: wo.bidDeadline,
        scheduledDate: wo.scheduledDate,
        completedAt: wo.completedAt,
        contractor: wo.contractor,
        property: wo.property,
        unit: wo.unit,
        bidCount: wo._count.bids,
        media: (wo.media ?? []).map((m: any) => ({
          id: m.id,
          url: m.url,
          type: m.type,
          thumbnailUrl: m.thumbnailUrl ?? null,
        })),
        createdAt: wo.createdAt,
      })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    });
  } catch (e: any) {
    console.error('mobile pm/work-orders GET', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
      propertyId?: string;
      unitId?: string;
      contractorId?: string;
      maintenanceTicketId?: string;
      priority?: string;
      agreedPrice?: number;
      scheduledDate?: string;
      notes?: string;
      isOpenBid?: boolean;
      budgetMin?: number;
      budgetMax?: number;
      bidDeadline?: string;
      postingType?: 'bid' | 'estimate';
      /** Photos / videos uploaded to give contractors context. Each item
       *  must already be uploaded (Cloudinary / S3 URL); we only persist
       *  the metadata row in WorkOrderMedia. Mirrors the website's
       *  /api/work-orders contract. */
      media?: { url: string; type: 'image' | 'video'; thumbnailUrl?: string | null; caption?: string; phase?: 'before' | 'during' | 'after' }[];
    };

    if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!body.description?.trim()) return NextResponse.json({ error: 'description is required' }, { status: 400 });
    if (!body.propertyId) return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });

    // Confirm property belongs to this landlord.
    const property = await prisma.property.findFirst({
      where: { id: body.propertyId, landlordId: ctx.landlordId, status: { not: 'deleted' } },
      select: { id: true },
    });
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    // If assigning directly, confirm the contractor belongs to this landlord.
    if (body.contractorId) {
      const contractor = await prisma.contractor.findFirst({
        where: { id: body.contractorId, landlordId: ctx.landlordId },
        select: { id: true },
      });
      if (!contractor) return NextResponse.json({ error: 'Contractor not in your directory' }, { status: 404 });
    }

    const isOpenBid = !!body.isOpenBid;
    const initialStatus = isOpenBid ? 'open' : (body.contractorId ? 'assigned' : 'draft');

    const workOrder = await prisma.workOrder.create({
      data: {
        landlordId: ctx.landlordId,
        contractorId: body.contractorId || null,
        propertyId: property.id,
        unitId: body.unitId || null,
        maintenanceTicketId: body.maintenanceTicketId || null,
        title: body.title.trim(),
        description: body.description.trim(),
        status: initialStatus,
        priority: body.priority || 'medium',
        agreedPrice: typeof body.agreedPrice === 'number' ? body.agreedPrice : null,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        notes: body.notes?.trim() || null,
        isOpenBid,
        budgetMin: typeof body.budgetMin === 'number' ? body.budgetMin : null,
        budgetMax: typeof body.budgetMax === 'number' ? body.budgetMax : null,
        bidDeadline: body.bidDeadline ? new Date(body.bidDeadline) : null,
        postingType: body.postingType || 'bid',
      },
    });

    // Persist any uploaded photos/videos. We accept already-uploaded URLs
    // (Cloudinary / S3) and only write the WorkOrderMedia row here, just
    // like the website's createWorkOrder action.
    if (Array.isArray(body.media) && body.media.length > 0) {
      const rows = body.media
        .filter((m) => typeof m.url === 'string' && m.url.length > 0)
        .map((m) => ({
          workOrderId: workOrder.id,
          uploadedById: ctx.userId,
          uploaderRole: 'landlord',
          type: m.type === 'video' ? 'video' : 'image',
          url: m.url,
          thumbnailUrl: m.thumbnailUrl ?? null,
          caption: m.caption ?? null,
          phase: m.phase ?? 'before',
        }));
      if (rows.length > 0) {
        await prisma.workOrderMedia.createMany({ data: rows });
      }
    }

    // Initial history entry, mirroring the website action.
    await prisma.workOrderHistory.create({
      data: {
        workOrderId: workOrder.id,
        changedById: ctx.userId,
        previousStatus: 'none',
        newStatus: initialStatus,
        notes: 'Work order created from mobile',
      },
    });

    // Fire the same notification flow the website uses so contractors see new bid postings.
    try {
      const { dbTriggers } = await import('@/lib/event-system');
      await dbTriggers.onWorkOrderCreate(workOrder, 'landlord');
    } catch (err) {
      console.error('mobile pm/work-orders event emit failed', err);
    }

    return NextResponse.json({ success: true, workOrderId: workOrder.id });
  } catch (e: any) {
    console.error('mobile pm/work-orders POST', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
