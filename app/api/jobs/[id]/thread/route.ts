import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: jobId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { otherPartyId } = body;

    // Verify user has access to this job
    const workOrder = await prisma.homeownerWorkOrder.findFirst({
      where: {
        id: jobId,
        OR: [
          { homeowner: { userId: session.user.id } },
          { contractorId: otherPartyId }, // If user is contractor
        ],
      },
      include: {
        homeowner: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Job not found or access denied' }, { status: 404 });
    }

    // Check if thread already exists for this job
    let thread = await prisma.thread.findFirst({
      where: {
        type: 'job',
        participants: {
          every: {
            userId: {
              in: [session.user.id, otherPartyId],
            },
          },
        },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100, // Last 100 messages
        },
      },
    });

    // Create thread if it doesn't exist
    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          type: 'job',
          subject: `Job: ${workOrder.title}`,
          createdByUserId: session.user.id,
          status: 'open',
          participants: {
            create: [
              { userId: session.user.id },
              { userId: otherPartyId },
            ],
          },
        },
        include: {
          participants: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        subject: thread.subject,
        type: thread.type,
      },
      messages: thread.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderUserId: msg.senderUserId,
        senderName: msg.senderName,
        senderImage: msg.senderEmail, // You might want to fetch user image
        createdAt: msg.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error creating/getting thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }
}
