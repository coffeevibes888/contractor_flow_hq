/**
 * GET /api/mobile/marketplace/jobs
 *
 * Public open jobs / work orders that contractors can bid on.
 *
 * Query params:
 *   priority   filter by 'urgent' | 'high' | 'medium' | 'low'
 *   page       1-indexed
 *
 * POST /api/mobile/marketplace/jobs
 *
 * Post a new open job. Routes to:
 *   - HomeownerWorkOrder when caller has a Homeowner profile
 *   - WorkOrder         when caller has a Landlord profile (PM)
 *
 * Body:
 *   {
 *     title, description, category,
 *     priority?, budgetMin?, budgetMax?,
 *     propertyId?, unitId?,         // PM only — the rental
 *     address?,                     // homeowner only — service address json
 *     bidDeadline?: ISO,
 *     images?: string[]
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const priority = searchParams.get('priority')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    const where: any = {
      isOpenBid: true,
      status: 'open',
    };
    if (priority) where.priority = priority;

    const [jobs, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          budgetMin: true,
          budgetMax: true,
          bidDeadline: true,
          scheduledDate: true,
          createdAt: true,
          media: {
            take: 4,
            orderBy: { createdAt: 'asc' },
            select: { url: true, type: true, thumbnailUrl: true },
          },
          property: {
            select: {
              name: true,
              address: true,
              landlord: { select: { id: true, companyName: true, logoUrl: true } },
            },
          },
          unit: {
            select: {
              name: true,
              property: {
                select: {
                  name: true,
                  address: true,
                  landlord: { select: { id: true, companyName: true, logoUrl: true } },
                },
              },
            },
          },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    return NextResponse.json({
      jobs: jobs.map((j: any) => {
        const propertyAddr = (j.property?.address ?? j.unit?.property?.address ?? null) as
          | { city?: string; state?: string }
          | null;
        const propertyName = j.property?.name ?? j.unit?.property?.name ?? 'Property';
        const landlord = j.property?.landlord ?? j.unit?.property?.landlord;
        return {
          id: j.id,
          title: j.title,
          description: j.description ?? '',
          priority: j.priority,
          budgetMin: j.budgetMin ? Number(j.budgetMin) : null,
          budgetMax: j.budgetMax ? Number(j.budgetMax) : null,
          bidDeadline: j.bidDeadline?.toISOString() ?? null,
          scheduledDate: j.scheduledDate?.toISOString() ?? null,
          createdAt: j.createdAt.toISOString(),
          propertyName,
          unitName: j.unit?.name ?? null,
          city: propertyAddr?.city ?? null,
          state: propertyAddr?.state ?? null,
          landlordName: landlord?.companyName ?? 'Landlord',
          landlordLogo: landlord?.logoUrl ?? null,
          media: (j.media ?? []).map((m: any) => ({
            url: m.url,
            type: m.type === 'video' ? 'video' : 'image',
            thumbnailUrl: m.thumbnailUrl ?? null,
          })),
        };
      }),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    console.error('[mobile/marketplace/jobs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const {
      title,
      description,
      category,
      priority,
      budgetMin,
      budgetMax,
      propertyId,
      unitId,
      address,
      bidDeadline,
      images,
    } = body ?? {};

    if (!title || !description) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 });
    }

    const db = prisma as any;

    // Try homeowner first
    const homeowner = await db.homeowner.findUnique({ where: { userId: auth.userId } });

    if (homeowner) {
      const job = await db.homeownerWorkOrder.create({
        data: {
          homeownerId: homeowner.id,
          title,
          description,
          category: category ?? 'general',
          priority: priority ?? 'medium',
          budgetMin: budgetMin != null ? Number(budgetMin) : null,
          budgetMax: budgetMax != null ? Number(budgetMax) : null,
          status: 'open',
          isOpenBid: true,
          bidDeadline: bidDeadline ? new Date(bidDeadline) : null,
          address: address ?? null,
          images: Array.isArray(images) ? images : [],
        },
      });
      return NextResponse.json({ success: true, jobId: job.id, kind: 'homeowner' }, { status: 201 });
    }

    // Otherwise PM/Landlord posting
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: auth.userId },
      select: { id: true },
    });
    if (!landlord) {
      return NextResponse.json(
        { error: 'Only homeowners and landlords/PMs can post jobs' },
        { status: 403 },
      );
    }
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required for landlord postings' }, { status: 400 });
    }

    // Verify ownership
    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId: landlord.id },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: 'Property not found in your portfolio' }, { status: 404 });
    }

    const wo = await prisma.workOrder.create({
      data: {
        landlordId: landlord.id,
        propertyId,
        unitId: unitId ?? null,
        title,
        description,
        priority: priority ?? 'medium',
        budgetMin: budgetMin != null ? Number(budgetMin) : null,
        budgetMax: budgetMax != null ? Number(budgetMax) : null,
        bidDeadline: bidDeadline ? new Date(bidDeadline) : null,
        isOpenBid: true,
        status: 'open',
        postingType: 'bid',
      },
    });

    return NextResponse.json({ success: true, jobId: wo.id, kind: 'landlord' }, { status: 201 });
  } catch (error: any) {
    console.error('[mobile/marketplace/jobs POST]', error);
    return NextResponse.json({ error: error?.message || 'Could not post job' }, { status: 500 });
  }
}
