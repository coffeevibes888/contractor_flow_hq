import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET - Get expense by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const expense = await prisma.contractorExpense.findFirst({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

// PUT - Update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      category,
      description,
      amount,
      vendor,
      expenseDate,
      receiptUrl,
      billable,
      taxDeductible,
      paymentMethod,
      status,
    } = body;

    const expense = await prisma.contractorExpense.update({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
      data: {
        category: category || undefined,
        description: description || undefined,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        vendor: vendor !== undefined ? vendor : undefined,
        expenseDate: expenseDate ? new Date(expenseDate) : undefined,
        receiptUrl: receiptUrl !== undefined ? receiptUrl : undefined,
        billable: billable !== undefined ? billable : undefined,
        taxDeductible: taxDeductible !== undefined ? taxDeductible : undefined,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined,
        status: status || undefined,
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    await prisma.contractorExpense.delete({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
