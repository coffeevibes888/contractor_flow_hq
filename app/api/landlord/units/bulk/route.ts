import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { canAddUnits } from '@/lib/actions/subscription.actions';

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
    const { 
      propertyId, 
      building, 
      startUnit, 
      count, 
      floorStart, 
      unitsPerFloor,
      type, 
      bedrooms, 
      bathrooms, 
      rentAmount, 
      sizeSqFt,
      amenities 
    } = body;

    if (!propertyId || !count || count < 1) {
      return NextResponse.json({ error: 'Property ID and count are required' }, { status: 400 });
    }

    if (count > 100) {
      return NextResponse.json({ error: 'Cannot add more than 100 units at once' }, { status: 400 });
    }

    // Check subscription limits
    const subscriptionCheck = await canAddUnits(count);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json({ 
        error: subscriptionCheck.reason,
        subscriptionError: true,
        currentUnitCount: subscriptionCheck.currentUnitCount,
        unitLimit: subscriptionCheck.unitLimit,
      }, { status: 403 });
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

    // Generate unit data
    const unitsToCreate = [];
    let currentFloor = floorStart || 1;
    let unitsOnCurrentFloor = 0;
    const perFloor = unitsPerFloor || 4;

    for (let i = 0; i < count; i++) {
      const unitNumber = (startUnit || 101) + i;
      
      // Calculate floor based on units per floor
      if (unitsOnCurrentFloor >= perFloor) {
        currentFloor++;
        unitsOnCurrentFloor = 0;
      }
      unitsOnCurrentFloor++;

      unitsToCreate.push({
        propertyId,
        name: String(unitNumber),
        building: building || null,
        floor: currentFloor,
        type: type || 'apartment',
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        rentAmount: rentAmount || 0,
        sizeSqFt: sizeSqFt || null,
        amenities: amenities || [],
        isAvailable: true,
      });
    }

    // Bulk create units
    const result = await prisma.unit.createMany({
      data: unitsToCreate,
    });

    return NextResponse.json({ 
      success: true, 
      count: result.count,
      message: `Successfully created ${result.count} units`
    });
  } catch (error) {
    console.error('Error bulk creating units:', error);
    return NextResponse.json({ error: 'Failed to create units' }, { status: 500 });
  }
}
