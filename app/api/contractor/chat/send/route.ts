import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Send a message to a contractor (creates thread if needed)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorId, message, threadId: existingThreadId, recipientUserId } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Get contractor (to find the other participant if we are the homeowner)
    // OR if we are the contractor, we need to know who we are talking to (recipientUserId)
    
    let targetUserId = recipientUserId;
    
    if (!targetUserId) {
        // Try ContractorProfile first (marketplace), then fall back to Contractor (landlord directory)
        let found = false;

        if (contractorId) {
          const profile = await prisma.contractorProfile.findUnique({
            where: { id: contractorId },
            select: { userId: true },
          });

          if (profile?.userId) {
            targetUserId = profile.userId;
            found = true;
          }

          if (!found) {
            const contractor = await prisma.contractor.findUnique({
              where: { id: contractorId },
              select: { userId: true },
            });

            if (contractor?.userId) {
              targetUserId = contractor.userId;
              found = true;
            }
          }
        }

        if (!found) {
          return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
        }
    }

    // Prevent self-chat loop if logic is flawed
    if (targetUserId === session.user.id) {
        return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 });
    }

    let threadId = existingThreadId;

    // Create thread if doesn't exist
    if (!threadId) {
      // Check for existing thread first
      const existingThread = await prisma.thread.findFirst({
        where: {
          type: 'dm',
          AND: [
            { participants: { some: { userId: session.user.id } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
      });

      if (existingThread) {
        threadId = existingThread.id;
      } else {
        // Create new thread
        const newThread = await prisma.thread.create({
          data: {
            type: 'dm',
            subject: `Chat`, // We can improve this subject
            createdByUserId: session.user.id,
            status: 'open',
            participants: {
              create: [
                { userId: session.user.id },
                { userId: targetUserId },
              ],
            },
          },
        });
        threadId = newThread.id;
      }
    }

    // Create message
    await prisma.message.create({
      data: {
        threadId,
        senderUserId: session.user.id,
        senderName: session.user.name || 'User',
        senderEmail: session.user.email || '',
        content: message.trim(),
        role: 'user',
      },
    });

    // Update thread timestamp
    await prisma.thread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Mark as read for sender
    await prisma.threadParticipant.updateMany({
      where: { threadId, userId: session.user.id },
      data: { lastReadAt: new Date() },
    });

    // TODO: Send push notification to contractor
    // TODO: Send email notification if contractor is offline

    return NextResponse.json({ 
      success: true, 
      threadId,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
