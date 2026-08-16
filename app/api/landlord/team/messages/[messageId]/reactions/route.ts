import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json(
        { success: false, message: 'Emoji required' },
        { status: 400 }
      );
    }

    // Check if message exists and user has access
    const message = await prisma.teamMessage.findUnique({
      where: { id: messageId },
      include: {
        channel: true,
      },
    });

    if (!message) {
      return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
    }

    // Get the landlord
    const landlord = await prisma.landlord.findUnique({
      where: { id: message.channel.landlordId },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    // Check if user is landlord owner or team member
    const isOwner = landlord.ownerUserId === session.user.id;
    const teamMember = await (prisma as any).teamMember?.findFirst?.({
      where: {
        userId: session.user.id,
        landlordId: message.channel.landlordId,
        status: 'active',
      },
    });

    if (!isOwner && !teamMember) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    // TODO: MessageReaction model needs to be added to schema
    // For now, return a not implemented response
    return NextResponse.json(
      { 
        success: false, 
        message: 'Message reactions feature not yet implemented. MessageReaction model needs to be added to Prisma schema.' 
      },
      { status: 501 } // Not Implemented
    );

    /* 
    // This code will work once MessageReaction model is added to schema:
    
    // Check if reaction already exists
    const existingReaction = await prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId: session.user.id,
        emoji,
      },
    });

    if (existingReaction) {
      // Remove reaction (toggle off)
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id },
      });

      return NextResponse.json({
        success: true,
        action: 'removed',
      });
    } else {
      // Add reaction
      await prisma.messageReaction.create({
        data: {
          messageId,
          userId: session.user.id,
          emoji,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'added',
      });
    }
    */
  } catch (error) {
    console.error('Failed to toggle reaction:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to toggle reaction' },
      { status: 500 }
    );
  }
}
