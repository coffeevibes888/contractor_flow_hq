import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET - Fetch channels for the landlord
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get landlord
    const landlord = await prisma.landlord.findFirst({
      where: {
        ownerUserId: session.user.id,
      },
    });

    if (!landlord) {
      // Check if user is a team member
      let teamMember: any = null;
      try {
        teamMember = await (prisma as any).teamMember?.findFirst?.({
          where: {
            userId: session.user.id,
            status: 'active',
          },
        });
      } catch (error) {
        console.error('TeamMember check failed:', error);
      }

      if (!teamMember) {
        return NextResponse.json({ success: false, message: 'Not a team member' }, { status: 403 });
      }

      // Get channels for team member's landlord
      let channels = await prisma.teamChannel.findMany({
        where: { landlordId: teamMember.landlordId },
        orderBy: { createdAt: 'asc' },
      });

      if (channels.length === 0) {
        const defaultChannels = [
          { name: 'general', description: 'General team discussions', type: 'public' },
          { name: 'random', description: 'Random conversations', type: 'public' },
          { name: 'announcements', description: 'Important announcements', type: 'public' },
        ];

        for (const channelData of defaultChannels) {
          await prisma.teamChannel.create({
            data: {
              landlordId: teamMember.landlordId,
              name: channelData.name,
              description: channelData.description,
              type: channelData.type,
              createdById: session.user.id,
            },
          });
        }

        channels = await prisma.teamChannel.findMany({
          where: { landlordId: teamMember.landlordId },
          orderBy: { createdAt: 'asc' },
        });
      }

      return NextResponse.json({ success: true, channels });
    }

    // Get or create default channels for landlord
    let channels = await prisma.teamChannel.findMany({
      where: { landlordId: landlord.id },
      orderBy: { createdAt: 'asc' },
    });

    // If no channels exist, create default ones
    if (channels.length === 0) {
      const defaultChannels = [
        { name: 'general', description: 'General team discussions', type: 'public' },
        { name: 'random', description: 'Random conversations', type: 'public' },
        { name: 'announcements', description: 'Important announcements', type: 'public' },
      ];

      for (const channelData of defaultChannels) {
        await prisma.teamChannel.create({
          data: {
            landlordId: landlord.id,
            name: channelData.name,
            description: channelData.description,
            type: channelData.type,
            createdById: session.user.id,
          },
        });
      }

      // Fetch the newly created channels
      channels = await prisma.teamChannel.findMany({
        where: { landlordId: landlord.id },
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json({ success: true, channels });
  } catch (error) {
    console.error('Failed to fetch channels:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST - Create a new channel
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, type = 'public' } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Channel name required' },
        { status: 400 }
      );
    }

    // Get landlord
    const landlord = await prisma.landlord.findFirst({
      where: {
        ownerUserId: session.user.id,
      },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    // Create channel
    const channel = await prisma.teamChannel.create({
      data: {
        landlordId: landlord.id,
        name: name.trim(),
        description: description?.trim() || null,
        type,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, channel });
  } catch (error) {
    console.error('Failed to create channel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
