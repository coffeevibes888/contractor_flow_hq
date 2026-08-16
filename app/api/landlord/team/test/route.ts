import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getWebSocketServer } from '@/lib/websocket-server-types';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Test database connection
    const userCount = await prisma.user.count();
    
    // Test WebSocket server
    const wsServer = getWebSocketServer();
    
    // Get user's landlord
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    // Get team channels if landlord exists
    let channels: Awaited<ReturnType<typeof prisma.teamChannel.findMany>> = [];
    if (landlord) {
      channels = await prisma.teamChannel.findMany({
        where: { landlordId: landlord.id },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: session.user.id,
        userName: session.user.name,
        userCount,
        websocketAvailable: !!wsServer,
        landlordId: landlord?.id || null,
        landlordName: landlord?.name || null,
        channelCount: channels.length,
        channels: channels.map(c => ({ id: c.id, name: c.name })),
      },
    });
  } catch (error) {
    console.error('Team test error:', error);
    return NextResponse.json(
      { success: false, message: 'Test failed', error: String(error) },
      { status: 500 }
    );
  }
}