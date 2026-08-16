import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// POST - Block dates
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

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Check for overlapping bookings
    const overlapping = await prismaBase.sTRBooking.findFirst({
      where: {
        rentalId: data.rentalId,
        status: { in: ['confirmed', 'checked_in'] },
        OR: [
          {
            checkIn: { lte: startDate },
            checkOut: { gt: startDate },
          },
          {
            checkIn: { lt: endDate },
            checkOut: { gte: endDate },
          },
          {
            checkIn: { gte: startDate },
            checkOut: { lte: endDate },
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

    const blockedDate = await prismaBase.sTRBlockedDate.create({
      data: {
        rentalId: data.rentalId,
        startDate,
        endDate,
        reason: data.reason || 'other',
        notes: data.notes || null,
      },
      include: {
        rental: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ blockedDate }, { status: 201 });
  } catch (error) {
    console.error('Error blocking dates:', error);
    return NextResponse.json({ error: 'Failed to block dates' }, { status: 500 });
  }
}

// DELETE - Unblock dates
export async function DELETE(req: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await prismaBase.sTRBlockedDate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking dates:', error);
    return NextResponse.json({ error: 'Failed to unblock dates' }, { status: 500 });
  }
}
