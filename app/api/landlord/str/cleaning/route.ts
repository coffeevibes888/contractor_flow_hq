import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// GET - List all cleaning schedules
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
    const rentalId = searchParams.get('rentalId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      rental: { landlordId: landlord.id },
    };

    if (rentalId) {
      where.rentalId = rentalId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const cleanings = await prismaBase.sTRCleaning.findMany({
      where,
      include: {
        rental: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        booking: {
          select: {
            id: true,
            confirmationCode: true,
            guestName: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json({ cleanings });
  } catch (error) {
    console.error('Error fetching cleanings:', error);
    return NextResponse.json({ error: 'Failed to fetch cleanings' }, { status: 500 });
  }
}

// POST - Create new cleaning schedule
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

    const cleaning = await prismaBase.sTRCleaning.create({
      data: {
        rentalId: data.rentalId,
        bookingId: data.bookingId || null,
        scheduledDate: new Date(data.scheduledDate),
        scheduledTime: data.scheduledTime || null,
        assignedTo: data.assignedTo || null,
        assignedToEmail: data.assignedToEmail || null,
        assignedToPhone: data.assignedToPhone || null,
        status: 'scheduled',
        notes: data.notes || null,
        cost: data.cost ? parseFloat(data.cost) : null,
      },
      include: {
        rental: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        booking: {
          select: {
            id: true,
            confirmationCode: true,
            guestName: true,
          },
        },
      },
    });

    return NextResponse.json({ cleaning }, { status: 201 });
  } catch (error) {
    console.error('Error creating cleaning:', error);
    return NextResponse.json({ error: 'Failed to create cleaning' }, { status: 500 });
  }
}
