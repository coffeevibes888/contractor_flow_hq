import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';

// GET - List all expenses
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
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      landlordId: landlord.id,
    };

    if (rentalId) {
      where.rentalId = rentalId;
    }

    if (category) {
      where.category = category;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const expenses = await prismaBase.sTRExpense.findMany({
      where,
      include: {
        rental: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate totals
    const total = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
    const byCategory = expenses.reduce((acc: Record<string, number>, exp: any) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ expenses, total, byCategory });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST - Create new expense
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

    const expense = await prismaBase.sTRExpense.create({
      data: {
        landlordId: landlord.id,
        rentalId: data.rentalId,
        date: new Date(data.date),
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        vendor: data.vendor || null,
        receiptUrl: data.receiptUrl || null,
        receiptData: data.receiptData || null,
        isTaxDeductible: data.isTaxDeductible !== false,
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

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
