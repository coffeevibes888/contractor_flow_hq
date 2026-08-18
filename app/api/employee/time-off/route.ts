/**
 * POST /api/employee/time-off
 *
 * Submit a time-off request (PTO, sick, personal, etc.)
 * Creates a ContractorTimeOff record with status 'pending'.
 * Notifies the contractor for approval.
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
    const { employeeId, contractorId, type, startDate, endDate, hours, reason } = body;

    if (!employeeId || !contractorId || !type || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const employee = await prisma.contractorEmployee.findFirst({
      where: { id: employeeId, userId: session.user.id, status: 'active' },
      select: { id: true, firstName: true, lastName: true, contractorId: true },
    });

    if (!employee || employee.contractorId !== contractorId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const db = prisma as any;

    // Create time-off request
    const request = await db.contractorTimeOff.create({
      data: {
        employeeId,
        contractorId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        hours: hours || null,
        reason: reason || null,
        status: 'pending',
      },
    });

    // Notify contractor
    try {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorId },
        select: { userId: true },
      });

      if (contractor?.userId) {
        await db.notification.create({
          data: {
            userId: contractor.userId,
            type: 'reminder',
            title: `Time-off request from ${employee.firstName} ${employee.lastName}`,
            message: `${employee.firstName} requested ${type} from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.${reason ? ` Reason: ${reason}` : ''}`,
            actionUrl: '/contractor-dashboard/team',
          },
        });
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, id: request.id });
  } catch (error) {
    console.error('POST /api/employee/time-off error:', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
