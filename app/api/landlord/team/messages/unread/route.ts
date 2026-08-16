import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: {
        ownerUserId: session.user.id,
      },
    });

    if (!landlord) {
      // Check if user is a team member
      const teamMember = await (prisma as any).teamMember?.findFirst?.({
        where: {
          userId: session.user.id,
          status: 'active',
        },
      });

      if (!teamMember) {
        return NextResponse.json({ success: true, unreadCount: 0 });
      }
    }

    // For now, return 0 unread messages
    // TODO: Implement proper unread tracking with a separate table
    return NextResponse.json({
      success: true,
      unreadCount: 0,
    });
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}
