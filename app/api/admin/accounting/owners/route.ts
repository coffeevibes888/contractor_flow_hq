import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });
    }
    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    await assertAccountingLedger(landlordId);

    const owners = await prisma.owner.findMany({
      where: { landlordId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        properties: {
          include: { property: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, data: owners });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    let body: {
      landlordId?: string;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      payoutMethod?: 'ach' | 'check' | 'hold';
      payoutSplit?: number;
      propertyIds?: string[];
      ownershipPct?: number;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }
    const { landlordId, name, email, phone, address, payoutMethod, payoutSplit, propertyIds, ownershipPct } = body;
    if (!landlordId || !name) {
      return NextResponse.json({ success: false, message: 'landlordId and name are required' }, { status: 400 });
    }
    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    await assertAccountingLedger(landlordId);

    if (propertyIds && propertyIds.length > 0) {
      const count = await prisma.property.count({ where: { id: { in: propertyIds }, landlordId } });
      if (count !== propertyIds.length) {
        return NextResponse.json({ success: false, message: 'One or more properties not found' }, { status: 404 });
      }
    }

    const owner = await prisma.owner.create({
      data: {
        landlordId,
        name,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        payoutMethod: payoutMethod ?? 'ach',
        payoutSplit: payoutSplit ?? 100,
        properties: propertyIds && propertyIds.length > 0
          ? {
              create: propertyIds.map((pid) => ({
                propertyId: pid,
                ownershipPct: ownershipPct ?? 100,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json({ success: true, data: owner });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
