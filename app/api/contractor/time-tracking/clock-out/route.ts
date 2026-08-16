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

    const entry = await prisma.contractorTimeEntry.findFirst({
      where: {
        id: body.entryId,
        contractorId: contractorProfile.id,
        clockOut: null,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    const clockOut = new Date();
    const duration = Math.floor((clockOut.getTime() - entry.clockIn.getTime()) / 60000); // minutes

    const updateData: any = {
      clockOut,
      duration,
    };

    // Only add clockOutLocation if location data is provided
    if (body.location) {
      updateData.clockOutLocation = {
        lat: body.location.lat,
        lng: body.location.lng,
        timestamp: clockOut.toISOString(),
      };
    }

    const updatedEntry = await prisma.contractorTimeEntry.update({
      where: { id: entry.id },
      data: updateData,
    });

    await eventBus.emit('contractor.time.clock_out', {
      entryId: updatedEntry.id,
      contractorId: contractorProfile.id,
      jobId: updatedEntry.jobId,
      clockOut: updatedEntry.clockOut,
      duration: updatedEntry.duration,
    });

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    console.error('Error clocking out:', error);
    return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 });
  }
}
