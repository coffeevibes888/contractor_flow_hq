import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId: session.user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      listingId,
      date,
      startTime,
      endTime,
      notes,
      isVirtual,
      virtualLink,
      rsvpEnabled,
      maxAttendees,
    } = body;

    if (!listingId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the listing belongs to this agent
    const listing = await prisma.agentListing.findFirst({
      where: {
        id: listingId,
        agentId: agent.id,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const openHouse = await prisma.agentOpenHouse.create({
      data: {
        agentId: agent.id,
        listingId,
        date: new Date(date),
        startTime,
        endTime,
        notes: notes || null,
        isVirtual: isVirtual || false,
        virtualLink: isVirtual ? virtualLink : null,
        rsvpEnabled: rsvpEnabled || false,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      },
    });

    // ✅ NEW: Emit event for open house (sends reminders to agent)
    try {
      const { dbTriggers } = await import('@/lib/event-system');
      await dbTriggers.onOpenHouseCreate(openHouse);
    } catch (error) {
      console.error('Failed to emit open house event:', error);
    }

    return NextResponse.json({ success: true, openHouse });
  } catch (error) {
    console.error('Create open house error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule open house' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId: session.user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const openHouses = await prisma.agentOpenHouse.findMany({
      where: { agentId: agent.id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ openHouses });
  } catch (error) {
    console.error('Get open houses error:', error);
    return NextResponse.json(
      { error: 'Failed to get open houses' },
      { status: 500 }
    );
  }
}
