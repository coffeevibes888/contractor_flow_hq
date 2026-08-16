import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// GET - Get single booking
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

    const booking = await prismaBase.sTRBooking.findFirst({
      where: {
        id: params.id,
        rental: { landlordId: landlord.id },
      },
      include: {
        rental: true,
        guest: true,
        cleanings: true,
        messages: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

// PUT - Update booking
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

    const booking = await prismaBase.sTRBooking.update({
      where: {
        id: params.id,
      },
      data: {
        status: data.status,
        notes: data.notes,
        specialRequests: data.specialRequests,
        checkedInAt: data.checkedInAt ? new Date(data.checkedInAt) : undefined,
        checkedOutAt: data.checkedOutAt ? new Date(data.checkedOutAt) : undefined,
      },
      include: {
        rental: true,
        guest: true,
      },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

// DELETE - Cancel booking
export async function DELETE(
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

    const { searchParams } = new URL(req.url);
    const reason = searchParams.get('reason') || 'Cancelled by host';
    const refundAmount = searchParams.get('refundAmount');

    const booking = await prismaBase.sTRBooking.update({
      where: {
        id: params.id,
      },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
        refundAmount: refundAmount ? parseFloat(refundAmount) : null,
      },
    });

    // Cancel associated cleaning
    await prismaBase.sTRCleaning.updateMany({
      where: {
        bookingId: params.id,
        status: 'scheduled',
      },
      data: {
        status: 'cancelled',
      },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
