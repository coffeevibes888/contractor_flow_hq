import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST - Approve time entries
export async function POST(request: NextRequest) {
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
    const { entryIds } = body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { error: 'Entry IDs array is required' },
        { status: 400 }
      );
    }

    // Verify all entries belong to contractor's employees
    const entries = await prisma.contractorTimeEntry.findMany({
      where: {
        id: { in: entryIds },
        employee: {
          contractorId: contractorProfile.id,
        },
      },
    });

    if (entries.length !== entryIds.length) {
      return NextResponse.json(
        { error: 'Some entries not found or unauthorized' },
        { status: 404 }
      );
    }

    // Approve all entries
    await prisma.contractorTimeEntry.updateMany({
      where: {
        id: { in: entryIds },
      },
      data: {
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // Check if all time entries for the current pay period are now approved
    // If so, auto-queue a payroll run for contractor confirmation
    try {
      const { autoQueuePayrollOnAllApproved } = await import('@/lib/services/contractor-automation');
      // Determine the pay period from the approved entries' dates
      const firstEntry = entries[0];
      if (firstEntry?.clockIn) {
        const entryDate = new Date(firstEntry.clockIn);
        // Get the employee's pay schedule to determine period boundaries
        const employee = await prisma.contractorEmployee.findFirst({
          where: { id: firstEntry.employeeId || undefined, contractorId: contractorProfile.id },
          select: { paySchedule: true },
        });
        const paySchedule = employee?.paySchedule || 'biweekly';

        // Use a generous period window (current month) to check completeness
        const periodStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
        const periodEnd = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 0, 23, 59, 59);

        await autoQueuePayrollOnAllApproved({
          contractorId: contractorProfile.id,
          periodStart,
          periodEnd,
          paySchedule,
        });
      }
    } catch (err) {
      // Non-blocking — don't fail the approval if payroll queueing fails
      console.error('[time/approve] auto-queue payroll check failed:', err);
    }

    return NextResponse.json({
      success: true,
      approvedCount: entryIds.length,
    });
  } catch (error) {
    console.error('Error approving time entries:', error);
    return NextResponse.json(
      { error: 'Failed to approve time entries' },
      { status: 500 }
    );
  }
}
