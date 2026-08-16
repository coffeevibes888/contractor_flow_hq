import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// GET - Get single guest
export async function GET(
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

    const guest = await prismaBase.sTRGuest.findFirst({
      where: {
        id: params.id,
        landlordId: landlord.id,
      },
      include: {
        bookings: {
          include: {
            rental: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
          orderBy: { checkIn: 'desc' },
        },
        reviews: {
          include: {
            rental: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    return NextResponse.json({ guest });
  } catch (error) {
    console.error('Error fetching guest:', error);
    return NextResponse.json({ error: 'Failed to fetch guest' }, { status: 500 });
  }
}

// PUT - Update guest
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

    const guest = await prismaBase.sTRGuest.update({
      where: {
        id: params.id,
        landlordId: landlord.id,
      },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        preferences: data.preferences,
        notes: data.notes,
        isBlocked: data.isBlocked,
        blockedReason: data.blockedReason,
      },
    });

    return NextResponse.json({ guest });
  } catch (error) {
    console.error('Error updating guest:', error);
    return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
  }
}
