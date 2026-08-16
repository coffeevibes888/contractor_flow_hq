import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST() {
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

    // Delete all sessions except the current one
    const result = await prisma.session.deleteMany({
      where: {
        NOT: {
          sessionToken: session.sessionToken
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully logged out ${result.count} active sessions`,
      sessionsTerminated: result.count
    });

  } catch (error) {
    console.error('Force logout all error:', error);
    return NextResponse.json(
      { error: 'Failed to force logout all sessions' },
      { status: 500 }
    );
  }
}

// Made with Bob
