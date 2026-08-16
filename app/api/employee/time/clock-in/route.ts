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
    const { location, propertyId, shiftId, notes } = body;

    // Find team member for current user
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, status: 'active' },
      include: { landlord: { select: { subscriptionTier: true } } },
    });

    if (!teamMember) {
      return NextResponse.json({ success: false, message: 'You are not a team member' }, { status: 403 });
    }

    // Check if already clocked in
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { teamMemberId: teamMember.id, clockOut: null },
    });

    if (activeEntry) {
      return NextResponse.json({ success: false, message: 'You are already clocked in' }, { status: 400 });
    }

    // Create time entry
    const entry = await prisma.timeEntry.create({
      data: {
        landlordId: teamMember.landlordId,
        teamMemberId: teamMember.id,
        shiftId: shiftId || null,
        propertyId: propertyId || null,
        clockIn: new Date(),
        clockInLat: location?.latitude,
        clockInLng: location?.longitude,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Clocked in successfully',
      timeEntryId: entry.id,
      clockIn: entry.clockIn,
    });
  } catch (error) {
    console.error('Clock in error:', error);
    return NextResponse.json({ success: false, message: 'Failed to clock in' }, { status: 500 });
  }
}
