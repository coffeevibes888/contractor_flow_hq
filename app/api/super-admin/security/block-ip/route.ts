import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { ipAddress, reason, notes, expiresAt } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    // Check if IP is already blocked
    const existing = await prisma.blockedIP.findUnique({
      where: { ipAddress }
    });

    if (existing) {
      // Update existing block
      const updated = await prisma.blockedIP.update({
        where: { ipAddress },
        data: {
          isActive: true,
          reason,
          notes,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          blockedBy: session.user.id,
          blockedAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'IP block updated',
        blockedIP: updated 
      });
    }

    // Create new block
    const blockedIP = await prisma.blockedIP.create({
      data: {
        ipAddress,
        reason: reason || 'Blocked by administrator',
        notes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        blockedBy: session.user.id,
        isActive: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'IP address blocked successfully',
      blockedIP 
    });

  } catch (error) {
    console.error('Block IP error:', error);
    return NextResponse.json(
      { error: 'Failed to block IP address' },
      { status: 500 }
    );
  }
}

// Made with Bob
