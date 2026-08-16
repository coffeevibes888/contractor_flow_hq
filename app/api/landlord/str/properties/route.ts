import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// GET - List all STR properties
export async function GET(req: NextRequest) {
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

    const properties = await prismaBase.shortTermRental.findMany({
      where: { landlordId: landlord.id },
      include: {
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Error fetching STR properties:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}

// POST - Create new STR property
export async function POST(req: NextRequest) {
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

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    // Generate unique iCal export URL
    const icalExportUrl = `/api/landlord/str/calendar/ical/${slug}`;

    const property = await prismaBase.shortTermRental.create({
      data: {
        landlordId: landlord.id,
        propertyId: data.propertyId || null,
        name: data.name,
        slug,
        description: data.description,
        address: data.address,
        propertyType: data.propertyType,
        bedrooms: parseInt(data.bedrooms),
        bathrooms: parseFloat(data.bathrooms),
        beds: parseInt(data.beds),
        maxGuests: parseInt(data.maxGuests),
        sizeSqFt: data.sizeSqFt ? parseInt(data.sizeSqFt) : null,
        images: data.images || [],
        videoUrl: data.videoUrl || null,
        virtualTourUrl: data.virtualTourUrl || null,
        amenities: data.amenities || [],
        houseRules: data.houseRules || null,
        checkInTime: data.checkInTime || '15:00',
        checkOutTime: data.checkOutTime || '11:00',
        checkInInstructions: data.checkInInstructions || null,
        cancellationPolicy: data.cancellationPolicy || 'moderate',
        instantBooking: data.instantBooking || false,
        minStay: parseInt(data.minStay) || 1,
        maxStay: data.maxStay ? parseInt(data.maxStay) : null,
        advanceNotice: parseInt(data.advanceNotice) || 1,
        preparationTime: parseInt(data.preparationTime) || 1,
        basePrice: parseFloat(data.basePrice),
        weekendPrice: data.weekendPrice ? parseFloat(data.weekendPrice) : null,
        weeklyDiscount: data.weeklyDiscount ? parseFloat(data.weeklyDiscount) : null,
        monthlyDiscount: data.monthlyDiscount ? parseFloat(data.monthlyDiscount) : null,
        cleaningFee: data.cleaningFee ? parseFloat(data.cleaningFee) : null,
        securityDeposit: data.securityDeposit ? parseFloat(data.securityDeposit) : null,
        extraGuestFee: data.extraGuestFee ? parseFloat(data.extraGuestFee) : null,
        extraGuestThreshold: parseInt(data.extraGuestThreshold) || 2,
        icalExportUrl,
        isActive: true,
        isListed: data.isListed || false,
        listedOn: data.listedOn || [],
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error('Error creating STR property:', error);
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
  }
}
