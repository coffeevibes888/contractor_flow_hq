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
    const { ipAddress } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    // Update the block to inactive
    const unblockedIP = await prisma.blockedIP.update({
      where: { ipAddress },
      data: {
        isActive: false
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'IP address unblocked successfully',
      unblockedIP 
    });

  } catch (error) {
    console.error('Unblock IP error:', error);
    return NextResponse.json(
      { error: 'Failed to unblock IP address' },
      { status: 500 }
    );
  }
}

// Made with Bob
