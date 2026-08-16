import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';
import { differenceInDays } from 'date-fns';

// GET - List all bookings
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const rentalId = searchParams.get('rentalId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      rental: { landlordId: landlord.id },
    };

    if (status) {
      where.status = status;
    }

    if (rentalId) {
      where.rentalId = rentalId;
    }

    if (startDate && endDate) {
      where.checkIn = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const bookings = await prismaBase.sTRBooking.findMany({
      where,
      include: {
        rental: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST - Create new booking
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

    // Verify property belongs to landlord
    const rental = await prismaBase.shortTermRental.findFirst({
      where: {
        id: data.rentalId,
        landlordId: landlord.id,
      },
    });

    if (!rental) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check for overlapping bookings
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    
    const overlapping = await prismaBase.sTRBooking.findFirst({
      where: {
        rentalId: data.rentalId,
        status: { in: ['confirmed', 'checked_in'] },
        OR: [
          {
            checkIn: { lte: checkIn },
            checkOut: { gt: checkIn },
          },
          {
            checkIn: { lt: checkOut },
            checkOut: { gte: checkOut },
          },
          {
            checkIn: { gte: checkIn },
            checkOut: { lte: checkOut },
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'Dates overlap with existing booking' },
        { status: 400 }
      );
    }

    // Calculate nights and pricing
    const nights = differenceInDays(checkOut, checkIn);
    const basePrice = parseFloat(data.basePrice || rental.basePrice.toString());
    const cleaningFee = parseFloat(data.cleaningFee || rental.cleaningFee?.toString() || '0');
    const serviceFee = parseFloat(data.serviceFee || '0');
    const taxes = parseFloat(data.taxes || '0');
    const totalPrice = (basePrice * nights) + cleaningFee + serviceFee + taxes;

    // Generate confirmation code
    const confirmationCode = `STR${Date.now()}${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // Find or create guest
    let guest = null;
    if (data.guestEmail) {
      guest = await prismaBase.sTRGuest.upsert({
        where: {
          landlordId_email: {
            landlordId: landlord.id,
            email: data.guestEmail,
          },
        },
        create: {
          landlordId: landlord.id,
          name: data.guestName,
          email: data.guestEmail,
          phone: data.guestPhone || null,
        },
        update: {
          name: data.guestName,
          phone: data.guestPhone || null,
        },
      });
    }

    const booking = await prismaBase.sTRBooking.create({
      data: {
        rentalId: data.rentalId,
        guestId: guest?.id,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        numberOfGuests: parseInt(data.numberOfGuests),
        checkIn,
        checkOut,
        nights,
        basePrice,
        cleaningFee,
        serviceFee,
        taxes,
        totalPrice,
        source: data.source || 'direct',
        externalBookingId: data.externalBookingId,
        platformFee: data.platformFee ? parseFloat(data.platformFee) : null,
        status: data.status || 'confirmed',
        confirmationCode,
        specialRequests: data.specialRequests,
        notes: data.notes,
      },
      include: {
        rental: true,
        guest: true,
      },
    });

    // Auto-schedule cleaning
    await prismaBase.sTRCleaning.create({
      data: {
        rentalId: data.rentalId,
        bookingId: booking.id,
        scheduledDate: checkOut,
        status: 'scheduled',
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
