import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { contractorSchedulerService } from '@/lib/services/contractor-scheduler';

/**
 * GET /api/contractor/scheduler/availability
 * Get contractor's availability settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const availability = await contractorSchedulerService.getAvailability(
      session.user.id
    );

    if (!availability) {
      return NextResponse.json(
        { error: 'Availability settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ availability });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contractor/scheduler/availability
 * Update contractor's availability settings
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { availability } = body;

    if (!availability) {
      return NextResponse.json(
        { error: 'Availability data is required' },
        { status: 400 }
      );
    }

    await contractorSchedulerService.setAvailability(
      session.user.id,
      availability
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}
