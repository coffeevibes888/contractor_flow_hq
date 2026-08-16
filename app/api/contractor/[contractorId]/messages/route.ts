import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get messages between current user and contractor
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorId } = await params;

    // Get contractor's user ID
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true, businessName: true },
    });

    if (!contractor?.userId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Find existing thread between user and contractor
    const thread = await prisma.thread.findFirst({
      where: {
        type: 'dm',
        AND: [
          { participants: { some: { userId: session.user.id } } },
          { participants: { some: { userId: contractor.userId } } },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ messages: [] });
    }

    // Format messages for the widget
    const messages = thread.messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderUserId,
      senderName: msg.senderName,
      createdAt: msg.createdAt,
      isContractor: msg.senderUserId === contractor.userId,
    }));

    // Mark as read
    await prisma.threadParticipant.updateMany({
      where: { threadId: thread.id, userId: session.user.id },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error getting contractor messages:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}

/**
 * Send a message to contractor (supports both logged-in users and guests)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const { contractorId } = await params;
    const session = await auth();
    const body = await req.json();
    const { content, guestInfo } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Get contractor
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true, businessName: true, email: true },
    });

    if (!contractor?.userId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Handle guest messages - create a support thread
    if (!session?.user?.id) {
      if (!guestInfo?.name || !guestInfo?.email) {
        return NextResponse.json({ error: 'Guest info required' }, { status: 400 });
      }

      // Create a support thread for the guest inquiry
      const thread = await prisma.thread.create({
        data: {
          type: 'support',
          subject: `Inquiry from ${guestInfo.name} (${guestInfo.email})${guestInfo.phone ? ` - ${guestInfo.phone}` : ''}`,
          fromEmail: guestInfo.email,
          status: 'open',
          participants: {
            create: [
              { userId: contractor.userId },
            ],
          },
        },
      });

      // Create the initial message
      const message = await prisma.message.create({
        data: {
          threadId: thread.id,
          senderName: guestInfo.name,
          senderEmail: guestInfo.email,
          content: content.trim(),
          role: 'user',
        },
      });

      // TODO: Send email notification to contractor about new inquiry

      return NextResponse.json({
        success: true,
        message: {
          id: message.id,
          content: content.trim(),
          senderId: 'guest',
          senderName: guestInfo.name,
          createdAt: message.createdAt,
          isContractor: false,
        },
      });
    }

    // Handle logged-in user messages
    let thread = await prisma.thread.findFirst({
      where: {
        type: 'dm',
        AND: [
          { participants: { some: { userId: session.user.id } } },
          { participants: { some: { userId: contractor.userId } } },
        ],
      },
    });

    // Create thread if doesn't exist
    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          type: 'dm',
          subject: `Chat with ${contractor.businessName}`,
          createdByUserId: session.user.id,
          status: 'open',
          participants: {
            create: [
              { userId: session.user.id },
              { userId: contractor.userId },
            ],
          },
        },
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: session.user.id,
        senderName: session.user.name || 'User',
        senderEmail: session.user.email || '',
        content: content.trim(),
        role: 'user',
      },
    });

    // Update thread timestamp
    await prisma.thread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    // Mark as read for sender
    await prisma.threadParticipant.updateMany({
      where: { threadId: thread.id, userId: session.user.id },
      data: { lastReadAt: new Date() },
    });

    // TODO: Send push/email notification to contractor

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        senderId: message.senderUserId,
        senderName: message.senderName,
        createdAt: message.createdAt,
        isContractor: false,
      },
    });
  } catch (error) {
    console.error('Error sending message to contractor:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
