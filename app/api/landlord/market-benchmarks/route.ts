import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'Landlord ID required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: {
        id: landlordId,
        ownerUserId: session.user.id,
      },
      select: { id: true },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const prismaAny = prisma as any;
    const benchmarks = await prismaAny.marketBenchmark.findMany({
      where: { landlordId },
      orderBy: { effectiveDate: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: benchmarks });
  } catch (error) {
    console.error('Market benchmarks API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }

    const {
      landlordId,
      propertyId,
      zip,
      propertyType,
      bedrooms,
      averageRent,
      source,
      effectiveDate,
    } = body as {
      landlordId?: string;
      propertyId?: string | null;
      zip?: string | null;
      propertyType?: string | null;
      bedrooms?: number | string | null;
      averageRent?: number | string;
      source?: string | null;
      effectiveDate?: string;
    };

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'Landlord ID required' }, { status: 400 });
    }

    const parsedAverageRent = typeof averageRent === 'string' ? Number(averageRent) : averageRent;
    if (typeof parsedAverageRent !== 'number' || Number.isNaN(parsedAverageRent)) {
      return NextResponse.json({ success: false, message: 'Invalid averageRent' }, { status: 400 });
    }

    const effectiveAt = effectiveDate ? new Date(effectiveDate) : null;
    if (!effectiveAt || Number.isNaN(effectiveAt.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid effectiveDate' }, { status: 400 });
    }

    const parsedBedrooms =
      bedrooms == null
        ? null
        : typeof bedrooms === 'string'
          ? Number(bedrooms)
          : bedrooms;

    if (parsedBedrooms != null && (typeof parsedBedrooms !== 'number' || Number.isNaN(parsedBedrooms))) {
      return NextResponse.json({ success: false, message: 'Invalid bedrooms' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: {
        id: landlordId,
        ownerUserId: session.user.id,
      },
      select: { id: true },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const prismaAny = prisma as any;
    const created = await prismaAny.marketBenchmark.create({
      data: {
        landlordId,
        propertyId: propertyId || null,
        zip: zip || null,
        propertyType: propertyType || null,
        bedrooms: parsedBedrooms,
        averageRent: parsedAverageRent,
        source: source || 'manual',
        effectiveDate: effectiveAt,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create market benchmark error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
