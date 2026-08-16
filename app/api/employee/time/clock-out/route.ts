import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { timeEntryId, location, breakMinutes, notes } = body;

    // Find the time entry
    const entry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: { teamMember: true },
    });

    if (!entry) {
      return NextResponse.json({ success: false, message: 'Time entry not found' }, { status: 404 });
    }

    if (entry.teamMember.userId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    if (entry.clockOut) {
      return NextResponse.json({ success: false, message: 'Already clocked out' }, { status: 400 });
    }

    const clockOutTime = new Date();
    const totalBreakMinutes = breakMinutes || entry.breakMinutes || 0;
    const totalMinutes = Math.floor((clockOutTime.getTime() - entry.clockIn.getTime()) / 60000) - totalBreakMinutes;

    // Update time entry
    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        clockOut: clockOutTime,
        clockOutLat: location?.latitude,
        clockOutLng: location?.longitude,
        breakMinutes: totalBreakMinutes,
        totalMinutes: Math.max(0, totalMinutes),
        notes: notes || entry.notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Clocked out successfully',
      clockOut: updatedEntry.clockOut,
      totalMinutes: updatedEntry.totalMinutes,
    });
  } catch (error) {
    console.error('Clock out error:', error);
    return NextResponse.json({ success: false, message: 'Failed to clock out' }, { status: 500 });
  }
}
