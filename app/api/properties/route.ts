import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ error: 'Unable to determine landlord' }, { status: 400 });
    }

    // Check if we should include units
    const url = new URL(req.url);
    const includeUnits = url.searchParams.get('includeUnits') === 'true';

    const properties = await prisma.property.findMany({
      where: { 
        landlordId: landlordResult.landlord.id,
        status: { not: 'deleted' }, // Exclude soft-deleted properties
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        address: true,
        amenities: true,
        defaultLeaseDocumentId: true,
        defaultLeaseDocument: {
          select: {
            id: true,
            name: true,
            isFieldsConfigured: true,
          },
        },
        units: includeUnits ? {
          select: {
            id: true,
            name: true,
            type: true,
            rentAmount: true,
            isAvailable: true,
          },
          orderBy: { name: 'asc' },
        } : false,
        _count: {
          select: { units: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      properties: properties.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        address: p.address,
        amenities: p.amenities,
        defaultLeaseDocumentId: p.defaultLeaseDocumentId,
        defaultLeaseDocument: p.defaultLeaseDocument,
        unitCount: p._count.units,
        units: includeUnits ? p.units : undefined,
      })),
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}
