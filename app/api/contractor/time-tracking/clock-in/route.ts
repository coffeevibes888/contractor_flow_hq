import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const body = await request.json();

    // Check if already clocked in
    const existingEntry = await prisma.contractorTimeEntry.findFirst({
      where: {
        contractorId: contractorProfile.id,
        clockOut: null,
      },
    });

    if (existingEntry) {
      return NextResponse.json({ error: 'Already clocked in' }, { status: 400 });
    }

    // Create time entry
    const timeEntryData: any = {
      contractorId: contractorProfile.id,
      jobId: body.jobId,
      clockIn: new Date(),
      status: 'pending',
    };

    // Only add clockInLocation if location data is provided
    if (body.location) {
      timeEntryData.clockInLocation = {
        lat: body.location.lat,
        lng: body.location.lng,
        timestamp: new Date().toISOString(),
      };
    }

    const entry = await prisma.contractorTimeEntry.create({
      data: timeEntryData,
    });

    await eventBus.emit('contractor.time.clock_in', {
      entryId: entry.id,
      contractorId: contractorProfile.id,
      jobId: body.jobId,
      clockIn: entry.clockIn,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error clocking in:', error);
    return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 });
  }
}
