import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify the listing belongs to this agent
    const listing = await prisma.agentListing.findFirst({
      where: {
        id,
        agentId: agent.id,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Delete related records first, then the listing
    await prisma.$transaction([
      prisma.agentOpenHouse.deleteMany({ where: { listingId: id } }),
      prisma.agentLead.deleteMany({ where: { listingId: id } }),
      prisma.agentWorkOrder.updateMany({
        where: { listingId: id },
        data: { listingId: null },
      }),
      prisma.agentListing.delete({ where: { id } }),
    ]);

    // Decrement agent's total listings count
    await prisma.agent.update({
      where: { id: agent.id },
      data: { totalListings: { decrement: 1 } },
    });

    return NextResponse.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    return NextResponse.json(
      { error: 'Failed to delete listing' },
      { status: 500 }
    );
  }
}
