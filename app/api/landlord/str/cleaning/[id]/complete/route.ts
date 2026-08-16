import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// POST - Mark cleaning as complete
export async function POST(
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
        status: 'completed',
        completedAt: new Date(),
        checklist: data.checklist,
        photos: data.photos || [],
        notes: data.notes,
        cost: data.cost ? parseFloat(data.cost) : undefined,
      },
      include: {
        rental: true,
        booking: true,
      },
    });

    // Create expense if cost is provided
    if (data.cost && parseFloat(data.cost) > 0) {
      await prismaBase.sTRExpense.create({
        data: {
          landlordId: landlord.id,
          rentalId: cleaning.rentalId,
          date: new Date(),
          amount: parseFloat(data.cost),
          category: 'cleaning',
          description: `Cleaning for ${cleaning.rental.name}${cleaning.booking ? ` - Booking ${cleaning.booking.confirmationCode}` : ''}`,
          vendor: cleaning.assignedTo || 'Cleaning Service',
          isTaxDeductible: true,
        },
      });
    }

    return NextResponse.json({ cleaning });
  } catch (error) {
    console.error('Error completing cleaning:', error);
    return NextResponse.json({ error: 'Failed to complete cleaning' }, { status: 500 });
  }
}
