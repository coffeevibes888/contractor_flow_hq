/**
 * POST /api/employee/expense
 *
 * Log an expense from the employee portal (fuel, materials, tools, etc.)
 * Creates a ContractorExpense record with status 'pending' for contractor approval.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, contractorId, category, description, amount, expenseDate, jobId } = body;

    if (!employeeId || !contractorId || !description?.trim() || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const employee = await prisma.contractorEmployee.findFirst({
      where: { id: employeeId, userId: session.user.id, status: 'active', contractorId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const db = prisma as any;

    const expense = await db.contractorExpense.create({
      data: {
        contractorId,
        jobId: jobId || null,
        category: category || 'Other',
        description: description.trim(),
        amount: Number(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paidBy: employee.id,
        billable: true,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, id: expense.id });
  } catch (error) {
    console.error('POST /api/employee/expense error:', error);
    return NextResponse.json({ error: 'Failed to log expense' }, { status: 500 });
  }
}
