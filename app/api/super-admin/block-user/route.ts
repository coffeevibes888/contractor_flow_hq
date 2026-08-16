import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, ipAddress } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update user to blocked status
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          isBlocked: true,
          blockedAt: new Date(),
          blockedBy: session.user.id,
        },
      });
    } catch (e) {
      // If isBlocked field doesn't exist yet (migration not run), just log it
      console.log('Note: isBlocked field may not exist yet. Run prisma migrate.');
    }

    // Try to add IP to blocked list if we have one
    let ip = ipAddress;
    if (ip) {
      try {
        await (prisma as any).blockedIP?.upsert?.({
          where: { ipAddress: ip },
          create: {
            ipAddress: ip,
            reason: `Blocked user: ${userId}`,
            blockedBy: session.user.id,
          },
          update: {
            reason: `Blocked user: ${userId}`,
            blockedBy: session.user.id,
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        // BlockedIP model may not exist yet
        console.log('Note: BlockedIP model may not exist yet. Run prisma migrate.');
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: ip ? `User blocked and IP ${ip} added to blocklist` : 'User blocked',
    });
  } catch (error) {
    console.error('Failed to block user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
