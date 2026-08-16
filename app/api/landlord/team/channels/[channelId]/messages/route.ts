import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getWebSocketServer } from '@/lib/websocket-server-types';

// GET - Fetch messages for a channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    console.log('GET /api/landlord/team/channels/[channelId]/messages - Start');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('Unauthorized - no session');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await params;
    console.log('Fetching messages for channel:', channelId);

    // Verify user has access to this channel
    const channel = await prisma.teamChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      console.error('Channel not found:', channelId);
      return NextResponse.json({ success: false, message: 'Channel not found' }, { status: 404 });
    }

    console.log('Channel found:', channel.name);

    // Get the landlord
    const landlord = await prisma.landlord.findUnique({
      where: { id: channel.landlordId },
    });

    if (!landlord) {
      console.error('Landlord not found:', channel.landlordId);
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    console.log('Landlord found:', landlord.name);

    // Check if user is landlord owner or team member
    const isOwner = landlord.ownerUserId === session.user.id;
    console.log('Is owner:', isOwner);
    
    let isTeamMember = false;
    try {
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId: session.user.id,
          landlordId: channel.landlordId,
          status: 'active',
        },
      });
      isTeamMember = !!teamMember;
      console.log('Is team member:', isTeamMember);
    } catch (error) {
      console.log('TeamMember check error:', error);
    }

    if (!isOwner && !isTeamMember) {
      console.error('Access denied for user:', session.user.id, 'to channel:', channelId);
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    // Fetch messages
    console.log('Fetching messages...');
    const messages = await prisma.teamMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      take: 100, // Limit to last 100 messages
    });

    console.log('Found messages:', messages.length);

    // Fetch senders for all messages
    const senderIds = [...new Set(messages.map(m => m.senderId))];
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    const senderMap = new Map(senders.map(s => [s.id, s]));

    const response = {
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        channelId: m.channelId,
        content: m.content,
        senderId: m.senderId,
        senderName: senderMap.get(m.senderId)?.name || 'Unknown',
        senderImage: senderMap.get(m.senderId)?.image,
        sender: senderMap.get(m.senderId) || { id: m.senderId, name: 'Unknown', email: '', image: null },
        createdAt: m.createdAt.toISOString(),
        reactions: [],
        attachments: m.attachments || [],
      })),
    };

    console.log('Returning response with', response.messages.length, 'messages');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch messages - Full error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, message: 'Failed to fetch messages', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    console.log('POST /api/landlord/team/channels/[channelId]/messages - Start');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('Unauthorized - no session');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await params;
    console.log('Sending message to channel:', channelId);
    
    const body = await request.json();
    const { content, attachments } = body;
    console.log('Message content:', content);

    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      console.log('No content or attachments provided');
      return NextResponse.json(
        { success: false, message: 'Message content or attachments required' },
        { status: 400 }
      );
    }

    // Verify user has access to this channel
    const channel = await prisma.teamChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      console.error('Channel not found:', channelId);
      return NextResponse.json({ success: false, message: 'Channel not found' }, { status: 404 });
    }

    console.log('Channel found:', channel.name);

    // Get the landlord
    const landlord = await prisma.landlord.findUnique({
      where: { id: channel.landlordId },
    });

    if (!landlord) {
      console.error('Landlord not found:', channel.landlordId);
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    console.log('Landlord found:', landlord.name);

    // Check if user is landlord owner or team member
    const isOwner = landlord.ownerUserId === session.user.id;
    console.log('Is owner:', isOwner);
    
    let isTeamMember = false;
    try {
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId: session.user.id,
          landlordId: channel.landlordId,
          status: 'active',
        },
      });
      isTeamMember = !!teamMember;
      console.log('Is team member:', isTeamMember);
    } catch (error) {
      console.log('TeamMember check error:', error);
    }

    if (!isOwner && !isTeamMember) {
      console.error('Access denied for user:', session.user.id, 'to channel:', channelId);
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    // Create message
    console.log('Creating message...');
    const message = await prisma.teamMessage.create({
      data: {
        channelId,
        senderId: session.user.id,
        content: content?.trim() || '',
        attachments: attachments || [],
      },
    });

    console.log('Message created:', message.id);

    // Fetch sender info
    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    const messageResponse = {
      id: message.id,
      channelId: message.channelId,
      content: message.content,
      senderId: message.senderId,
      senderName: sender?.name || 'Unknown',
      senderImage: sender?.image,
      sender: sender || { id: session.user.id, name: 'Unknown', email: '', image: null },
      createdAt: message.createdAt.toISOString(),
      reactions: [],
      attachments: message.attachments || [],
    };

    // Try to broadcast to WebSocket clients (but don't fail if WebSocket is down)
    try {
      const wsServer = getWebSocketServer();
      if (wsServer) {
        console.log('Broadcasting to WebSocket clients');
        wsServer.broadcastNewMessage(channelId, messageResponse);
      } else {
        console.log('WebSocket server not available');
      }
    } catch (wsError) {
      console.log('WebSocket broadcast failed:', wsError);
      // Don't fail the request if WebSocket fails
    }

    console.log('Returning message response');
    return NextResponse.json({
      success: true,
      message: messageResponse,
    });
  } catch (error) {
    console.error('Failed to send message - Full error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, message: 'Failed to send message', error: String(error) },
      { status: 500 }
    );
  }
}
