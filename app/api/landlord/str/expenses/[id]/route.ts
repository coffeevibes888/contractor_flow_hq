import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// PUT - Update expense
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

    const expense = await prismaBase.sTRExpense.update({
      where: {
        id: params.id,
        landlordId: landlord.id,
      },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        category: data.category,
        description: data.description,
        vendor: data.vendor,
        receiptUrl: data.receiptUrl,
        receiptData: data.receiptData,
        isTaxDeductible: data.isTaxDeductible,
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

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE - Delete expense
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

    await prismaBase.sTRExpense.delete({
      where: {
        id: params.id,
        landlordId: landlord.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
