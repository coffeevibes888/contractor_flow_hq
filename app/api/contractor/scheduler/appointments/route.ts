import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { contractorSchedulerService } from '@/lib/services/contractor-scheduler';
import { addDays, startOfDay, endOfDay } from 'date-fns';

/**
 * GET /api/contractor/scheduler/appointments
 * Get contractor's appointments
 * Query params: startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to current month if no dates provided
    const startDate = startDateParam
      ? new Date(startDateParam)
      : startOfDay(new Date());
    const endDate = endDateParam
      ? new Date(endDateParam)
      : endOfDay(addDays(new Date(), 30));

    const appointments = await contractorSchedulerService.getAppointments(
      session.user.id,
      { start: startDate, end: endDate }
    );

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contractor/scheduler/appointments
 * Create a new appointment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      serviceType,
      title,
      description,
      address,
      startTime,
      endTime,
      depositAmount,
      jobId,
    } = body;

    // Validate required fields
    if (
      !customerId ||
      !serviceType ||
      !title ||
      !address ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const appointment = await contractorSchedulerService.createAppointment({
      contractorId: session.user.id,
      customerId,
      serviceType,
      title,
      description,
      address,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      depositAmount,
      jobId,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating appointment:', error);

    if (error.message === 'Time slot is not available') {
      return NextResponse.json(
        { error: 'Time slot is not available' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contractor/scheduler/appointments/[id]
 * Update an appointment
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, updates } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Convert date strings to Date objects if present
    if (updates.startTime) {
      updates.startTime = new Date(updates.startTime);
    }
    if (updates.endTime) {
      updates.endTime = new Date(updates.endTime);
    }

    const appointment = await contractorSchedulerService.updateAppointment(
      appointmentId,
      updates
    );

    return NextResponse.json({ appointment });
  } catch (error: any) {
    console.error('Error updating appointment:', error);

    if (error.message === 'Appointment not found') {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Time slot is not available') {
      return NextResponse.json(
        { error: 'Time slot is not available' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contractor/scheduler/appointments/[id]
 * Cancel an appointment
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('id');
    const reason = searchParams.get('reason');

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    const appointment = await contractorSchedulerService.cancelAppointment(
      appointmentId,
      'contractor',
      reason || undefined
    );

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}
