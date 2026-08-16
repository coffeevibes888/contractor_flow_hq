import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET - Fetch channels for the contractor
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor
    const contractor = await prisma.contractorProfile.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!contractor) {
      // Check if user is a team member
      let teamMember: any = null;
      try {
        teamMember = await prisma.contractorEmployee.findFirst({
          where: {
            userId: session.user.id,
            status: 'active',
          },
        });
      } catch (error) {
        console.error('ContractorEmployee check failed:', error);
      }

      if (!teamMember) {
        return NextResponse.json({ success: false, message: 'Not a team member' }, { status: 403 });
      }

      // Get channels for team member's contractor
      let channels = await prisma.contractorTeamChannel.findMany({
        where: { contractorId: teamMember.contractorId },
        orderBy: { createdAt: 'asc' },
      });

      if (channels.length === 0) {
        const defaultChannels = [
          { name: 'general', description: 'General team discussions', type: 'public' },
          { name: 'random', description: 'Random conversations', type: 'public' },
          { name: 'announcements', description: 'Important announcements', type: 'public' },
        ];

        for (const channelData of defaultChannels) {
          await prisma.contractorTeamChannel.create({
            data: {
              contractorId: teamMember.contractorId,
              name: channelData.name,
              description: channelData.description,
              type: channelData.type,
              createdById: session.user.id,
            },
          });
        }

        channels = await prisma.contractorTeamChannel.findMany({
          where: { contractorId: teamMember.contractorId },
          orderBy: { createdAt: 'asc' },
        });
      }

      return NextResponse.json({ success: true, channels });
    }

    // Get or create default channels for contractor
    let channels = await prisma.contractorTeamChannel.findMany({
      where: { contractorId: contractor.id },
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
        await prisma.contractorTeamChannel.create({
          data: {
            contractorId: contractor.id,
            name: channelData.name,
            description: channelData.description,
            type: channelData.type,
            createdById: session.user.id,
          },
        });
      }

      // Fetch the newly created channels
      channels = await prisma.contractorTeamChannel.findMany({
        where: { contractorId: contractor.id },
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

    // Get contractor
    const contractor = await prisma.contractorProfile.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!contractor) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    // Create channel
    const channel = await prisma.contractorTeamChannel.create({
      data: {
        contractorId: contractor.id,
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
