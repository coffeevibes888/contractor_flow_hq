import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// Get current clock status for employee
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    // Find team member
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, status: 'active' },
    });

    if (!teamMember) {
      return NextResponse.json({ success: false, message: 'Not a team member' }, { status: 403 });
    }

    // Find active time entry
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { teamMemberId: teamMember.id, clockOut: null },
      include: { property: { select: { name: true } } },
    });

    // Get today's entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEntries = await prisma.timeEntry.findMany({
      where: {
        teamMemberId: teamMember.id,
        clockIn: { gte: today, lt: tomorrow },
      },
      orderBy: { clockIn: 'asc' },
    });

    // Calculate hours worked today
    let hoursWorkedToday = 0;
    for (const entry of todayEntries) {
      const end = entry.clockOut || new Date();
      const minutes = Math.floor((end.getTime() - entry.clockIn.getTime()) / 60000) - (entry.breakMinutes || 0);
      hoursWorkedToday += Math.max(0, minutes) / 60;
    }

    // Get today's scheduled shift
    const todayShift = await prisma.shift.findFirst({
      where: {
        teamMemberId: teamMember.id,
        date: { gte: today, lt: tomorrow },
        status: 'scheduled',
      },
    });

    return NextResponse.json({
      success: true,
      isClockedIn: !!activeEntry,
      activeEntry: activeEntry ? {
        id: activeEntry.id,
        clockIn: activeEntry.clockIn,
        breakMinutes: activeEntry.breakMinutes,
        propertyName: activeEntry.property?.name || 'All Properties',
        minutesWorked: Math.floor((Date.now() - activeEntry.clockIn.getTime()) / 60000) - (activeEntry.breakMinutes || 0),
      } : null,
      hoursWorkedToday: Math.round(hoursWorkedToday * 100) / 100,
      todayShift: todayShift ? {
        id: todayShift.id,
        startTime: todayShift.startTime,
        endTime: todayShift.endTime,
      } : null,
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json({ success: false, message: 'Failed to get status' }, { status: 500 });
  }
}
