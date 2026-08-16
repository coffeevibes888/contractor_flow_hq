import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// GET - Get single property
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const property = await prismaBase.shortTermRental.findFirst({
      where: {
        id: params.id,
        landlordId: landlord.id,
      },
      include: {
        bookings: {
          where: {
            status: { in: ['confirmed', 'checked_in'] },
          },
          orderBy: { checkIn: 'asc' },
          take: 10,
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            expenses: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
  }
}

// PUT - Update property
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const data = await req.json();

    const property = await prismaBase.shortTermRental.update({
      where: {
        id: params.id,
        landlordId: landlord.id,
      },
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : undefined,
        bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : undefined,
        beds: data.beds ? parseInt(data.beds) : undefined,
        maxGuests: data.maxGuests ? parseInt(data.maxGuests) : undefined,
        sizeSqFt: data.sizeSqFt ? parseInt(data.sizeSqFt) : undefined,
        images: data.images,
        videoUrl: data.videoUrl,
        virtualTourUrl: data.virtualTourUrl,
        amenities: data.amenities,
        houseRules: data.houseRules,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        checkInInstructions: data.checkInInstructions,
        cancellationPolicy: data.cancellationPolicy,
        instantBooking: data.instantBooking,
        minStay: data.minStay ? parseInt(data.minStay) : undefined,
        maxStay: data.maxStay ? parseInt(data.maxStay) : undefined,
        advanceNotice: data.advanceNotice ? parseInt(data.advanceNotice) : undefined,
        preparationTime: data.preparationTime ? parseInt(data.preparationTime) : undefined,
        basePrice: data.basePrice ? parseFloat(data.basePrice) : undefined,
        weekendPrice: data.weekendPrice ? parseFloat(data.weekendPrice) : undefined,
        weeklyDiscount: data.weeklyDiscount ? parseFloat(data.weeklyDiscount) : undefined,
        monthlyDiscount: data.monthlyDiscount ? parseFloat(data.monthlyDiscount) : undefined,
        cleaningFee: data.cleaningFee ? parseFloat(data.cleaningFee) : undefined,
        securityDeposit: data.securityDeposit ? parseFloat(data.securityDeposit) : undefined,
        extraGuestFee: data.extraGuestFee ? parseFloat(data.extraGuestFee) : undefined,
        extraGuestThreshold: data.extraGuestThreshold ? parseInt(data.extraGuestThreshold) : undefined,
        isActive: data.isActive,
        isListed: data.isListed,
        listedOn: data.listedOn,
      },
    });

    return NextResponse.json({ property });
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json({ error: 'Failed to update property' }, { status: 500 });
  }
}

// DELETE - Delete property
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    // Check for active bookings
    const activeBookings = await prismaBase.sTRBooking.count({
      where: {
        rentalId: params.id,
        status: { in: ['confirmed', 'checked_in'] },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete property with active bookings' },
        { status: 400 }
      );
    }

    await prismaBase.shortTermRental.delete({
      where: {
        id: params.id,
        landlordId: landlord.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}
