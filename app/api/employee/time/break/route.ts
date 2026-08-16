import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// Start or end a break
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action, breakMinutes } = body; // action: 'start' | 'end'

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
    });

    if (!activeEntry) {
      return NextResponse.json({ success: false, message: 'Not clocked in' }, { status: 400 });
    }

    if (action === 'add' && breakMinutes) {
      // Add break minutes to the current entry
      const updatedEntry = await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          breakMinutes: activeEntry.breakMinutes + breakMinutes,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Added ${breakMinutes} minute break`,
        totalBreakMinutes: updatedEntry.breakMinutes,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Break error:', error);
    return NextResponse.json({ success: false, message: 'Failed to process break' }, { status: 500 });
  }
}
