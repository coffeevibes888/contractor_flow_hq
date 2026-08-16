import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const body = await request.json();
    const { propertyId, propertyAmenities, unitAmenities } = body;

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Update property amenities
    await prisma.property.update({
      where: { id: propertyId },
      data: { amenities: propertyAmenities || [] } as any,
    });

    // Update unit amenities
    if (unitAmenities && Array.isArray(unitAmenities)) {
      for (const { unitId, amenities } of unitAmenities) {
        await prisma.unit.update({
          where: { id: unitId },
          data: { amenities: amenities || [] } as any,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving amenities:', error);
    return NextResponse.json({ error: 'Failed to save amenities' }, { status: 500 });
  }
}
