import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'Landlord ID required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: {
        id: landlordId,
        ownerUserId: session.user.id,
      },
      select: { id: true },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const prismaAny = prisma as any;
    const expenses = await prismaAny.expense.findMany({
      where: { landlordId },
      orderBy: { incurredAt: 'desc' },
      take: 250,
    });

    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    console.error('Expenses API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }

    const {
      landlordId,
      amount,
      category,
      incurredAt,
      description,
      propertyId,
      unitId,
      isRecurring,
    } = body as {
      landlordId?: string;
      amount?: number | string;
      category?: string;
      incurredAt?: string;
      description?: string;
      propertyId?: string | null;
      unitId?: string | null;
      isRecurring?: boolean;
    };

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'Landlord ID required' }, { status: 400 });
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ success: false, message: 'Category required' }, { status: 400 });
    }

    const parsedAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (typeof parsedAmount !== 'number' || Number.isNaN(parsedAmount)) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const incurredAtDate = incurredAt ? new Date(incurredAt) : null;
    if (!incurredAtDate || Number.isNaN(incurredAtDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid incurredAt date' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: {
        id: landlordId,
        ownerUserId: session.user.id,
      },
      select: { id: true },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const prismaAny = prisma as any;

    const created = await prismaAny.expense.create({
      data: {
        landlordId,
        amount: parsedAmount,
        category: category.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        incurredAt: incurredAtDate,
        propertyId: propertyId || null,
        unitId: unitId || null,
        isRecurring: Boolean(isRecurring),
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
