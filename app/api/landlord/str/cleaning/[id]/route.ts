import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// PUT - Update cleaning
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

    const cleaning = await prismaBase.sTRCleaning.update({
      where: {
        id: params.id,
      },
      data: {
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        scheduledTime: data.scheduledTime,
        assignedTo: data.assignedTo,
        assignedToEmail: data.assignedToEmail,
        assignedToPhone: data.assignedToPhone,
        status: data.status,
        notes: data.notes,
        cost: data.cost ? parseFloat(data.cost) : undefined,
        checklist: data.checklist,
        photos: data.photos,
      },
      include: {
        rental: true,
        booking: true,
      },
    });

    return NextResponse.json({ cleaning });
  } catch (error) {
    console.error('Error updating cleaning:', error);
    return NextResponse.json({ error: 'Failed to update cleaning' }, { status: 500 });
  }
}
