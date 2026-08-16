import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor profile
    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, jobId, employeeId, location } = body;

    if (!action || !['clock_in', 'clock_out'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be clock_in or clock_out' },
        { status: 400 }
      );
    }

    const contractorId = contractorProfile.id;

    if (action === 'clock_in') {
      // Check if already clocked in
      const existingEntry = await prisma.contractorTimeEntry.findFirst({
        where: {
          contractorId,
          employeeId: employeeId || null,
          clockOut: null,
        },
      });

      if (existingEntry) {
        return NextResponse.json(
          { error: 'Already clocked in. Please clock out first.' },
          { status: 400 }
        );
      }

      // Create new time entry
      const timeEntry = await prisma.contractorTimeEntry.create({
        data: {
          contractorId,
          employeeId: employeeId || null,
          jobId: jobId || null,
          clockIn: new Date(),
          clockInLocation: location || null,
          status: 'pending',
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              jobNumber: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        action: 'clock_in',
        timeEntry,
        message: 'Clocked in successfully',
      });
    } else {
      // Clock out
      const activeEntry = await prisma.contractorTimeEntry.findFirst({
        where: {
          contractorId,
          employeeId: employeeId || null,
          clockOut: null,
        },
        orderBy: { clockIn: 'desc' },
      });

      if (!activeEntry) {
        return NextResponse.json(
          { error: 'No active clock-in found' },
          { status: 400 }
        );
      }

      const clockOut = new Date();
      const duration = Math.floor((clockOut.getTime() - activeEntry.clockIn.getTime()) / 60000); // minutes

      // Update time entry
      const timeEntry = await prisma.contractorTimeEntry.update({
        where: { id: activeEntry.id },
        data: {
          clockOut,
          clockOutLocation: location || null,
          duration,
          billableHours: duration / 60, // Convert to hours
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              jobNumber: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        action: 'clock_out',
        timeEntry,
        duration,
        message: 'Clocked out successfully',
      });
    }
  } catch (error) {
    console.error('Error processing clock action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET current clock status
export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    // Get active time entry
    const activeEntry = await prisma.contractorTimeEntry.findFirst({
      where: {
        contractorId: contractorProfile.id,
        employeeId: employeeId || null,
        clockOut: null,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            jobNumber: true,
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { clockIn: 'desc' },
    });

    return NextResponse.json({
      isClockedIn: !!activeEntry,
      activeEntry: activeEntry || null,
    });
  } catch (error) {
    console.error('Error fetching clock status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
