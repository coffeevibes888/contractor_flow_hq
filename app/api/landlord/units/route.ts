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

    // Check subscription limits
    const subscriptionCheck = await canAddUnits(1);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json({ 
        error: subscriptionCheck.reason,
        subscriptionError: true,
        currentUnitCount: subscriptionCheck.currentUnitCount,
        unitLimit: subscriptionCheck.unitLimit,
      }, { status: 403 });
    }

    const body = await request.json();
    const { 
      propertyId, 
      name, 
      building, 
      floor, 
      type, 
      bedrooms, 
      bathrooms, 
      rentAmount, 
      sizeSqFt,
      amenities 
    } = body;

    if (!propertyId || !name) {
      return NextResponse.json({ error: 'Property ID and unit name are required' }, { status: 400 });
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

    // Create the unit
    const unit = await prisma.unit.create({
      data: {
        propertyId,
        name,
        building: building || null,
        floor: floor || null,
        type: type || 'apartment',
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        rentAmount: rentAmount || 0,
        sizeSqFt: sizeSqFt || null,
        amenities: amenities || [],
        isAvailable: true,
      } as any,
    });

    return NextResponse.json({ success: true, unit });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 });
  }
}
