import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST - Create or get a DM channel with a team member
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { success: false, message: 'Member ID required' },
        { status: 400 }
      );
    }

    // Get landlord (either as owner or team member)
    let landlordId: string | null = null;
    
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (landlord) {
      landlordId = landlord.id;
    } else {
      // Check if user is a team member
      try {
        const teamMember = await (prisma as any).teamMember?.findFirst?.({
          where: {
            userId: session.user.id,
            status: 'active',
          },
        });
        if (teamMember) {
          landlordId = teamMember.landlordId;
        }
      } catch (error) {
        console.error('TeamMember check failed:', error);
      }
    }

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    // Get the target member's user info
    const targetMember = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!targetMember) {
      return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });
    }

    // Create a unique DM channel name based on both user IDs (sorted for consistency)
    const sortedIds = [session.user.id, memberId].sort();
    const dmChannelName = `dm-${sortedIds[0]}-${sortedIds[1]}`;

    // Check if DM channel already exists
    let channel = await prisma.teamChannel.findFirst({
      where: {
        landlordId,
        name: dmChannelName,
        type: 'direct',
      },
    });

    if (!channel) {
      // Create new DM channel
      channel = await prisma.teamChannel.create({
        data: {
          landlordId,
          name: dmChannelName,
          type: 'direct',
          createdById: session.user.id,
        },
      });
    }

    // Return channel with member info for display
    return NextResponse.json({
      success: true,
      channel: {
        ...channel,
        name: targetMember.name || targetMember.email || 'Direct Message',
        members: [{
          id: targetMember.id,
          name: targetMember.name || 'Team Member',
          email: targetMember.email,
          image: targetMember.image,
          status: 'online',
        }],
      },
    });
  } catch (error) {
    console.error('Failed to create DM channel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create DM channel' },
      { status: 500 }
    );
  }
}
