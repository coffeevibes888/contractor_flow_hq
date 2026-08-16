import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
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

    const blockedIPs = await prisma.blockedIP.findMany({
      orderBy: { blockedAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      blockedIPs 
    });

  } catch (error) {
    console.error('Get blocked IPs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocked IPs' },
      { status: 500 }
    );
  }
}

// Made with Bob
