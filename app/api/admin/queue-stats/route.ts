/**
 * Admin API - Queue Statistics
 * Monitor job queue health
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { jobQueue } from '@/lib/queue/redis-queue';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (adjust based on your auth system)
    // const user = await prisma.user.findUnique({
    //   where: { id: session.user.id },
    //   select: { role: true },
    // });
    // if (user?.role !== 'SUPER_ADMIN') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Get queue stats
    const stats = await jobQueue.getStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Queue stats error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
