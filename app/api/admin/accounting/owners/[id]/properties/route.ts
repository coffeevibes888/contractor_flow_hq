import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

interface PropertyLink {
  propertyId: string;
  ownershipPct: number;
  effectiveFrom?: string;
}

interface Body {
  landlordId: string;
  links: PropertyLink[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { id: ownerId } = await params;
    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      include: {
        properties: {
          orderBy: { effectiveFrom: 'desc' },
          include: { property: { select: { id: true, name: true } } },
        },
      },
    });
    if (!owner) return NextResponse.json({ success: false, message: 'Owner not found' }, { status: 404 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: owner.landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    return NextResponse.json({
      success: true,
      data: {
        owner: { id: owner.id, name: owner.name, email: owner.email, payoutSplit: owner.payoutSplit },
        links: owner.properties.map((p) => ({
          propertyId: p.propertyId,
          propertyName: p.property.name,
          ownershipPct: Number(p.ownershipPct),
          effectiveFrom: p.effectiveFrom,
        })),
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { id: ownerId } = await params;
    let body: Body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }
    const { landlordId, links } = body;
    if (!landlordId || !Array.isArray(links)) {
      return NextResponse.json({ success: false, message: 'landlordId and links[] required' }, { status: 400 });
    }

    const owner = await prisma.owner.findFirst({ where: { id: ownerId, landlordId } });
    if (!owner) return NextResponse.json({ success: false, message: 'Owner not found' }, { status: 404 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    await assertAccountingLedger(landlordId);

    if (links.length > 0) {
      const count = await prisma.property.count({
        where: { id: { in: links.map((l) => l.propertyId) }, landlordId },
      });
      if (count !== links.length) {
        return NextResponse.json({ success: false, message: 'One or more properties not found' }, { status: 404 });
      }
    }

    for (const l of links) {
      if (typeof l.ownershipPct !== 'number' || l.ownershipPct <= 0 || l.ownershipPct > 100) {
        return NextResponse.json({
          success: false,
          message: `Invalid ownershipPct for property ${l.propertyId}: must be between 0 and 100`,
        }, { status: 400 });
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.propertyOwner.deleteMany({
        where: { ownerId, effectiveFrom: { lte: now } },
      });
      if (links.length > 0) {
        await tx.propertyOwner.createMany({
          data: links.map((l) => ({
            propertyId: l.propertyId,
            ownerId,
            ownershipPct: l.ownershipPct,
            effectiveFrom: l.effectiveFrom ? new Date(l.effectiveFrom) : now,
          })),
        });
      }
    });

    const updated = await prisma.owner.findUnique({
      where: { id: ownerId },
      include: {
        properties: {
          orderBy: { effectiveFrom: 'desc' },
          include: { property: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        links: updated?.properties.map((p) => ({
          propertyId: p.propertyId,
          propertyName: p.property.name,
          ownershipPct: Number(p.ownershipPct),
          effectiveFrom: p.effectiveFrom,
        })) ?? [],
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
