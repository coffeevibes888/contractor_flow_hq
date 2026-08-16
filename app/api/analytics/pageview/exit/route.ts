import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Update page view with exit data
    await prisma.pageView.update({
      where: { id: data.id },
      data: {
        timeOnPage: data.timeOnPage,
        scrollDepth: data.scrollDepth,
        exitPage: true,
        bounced: data.timeOnPage < 10000, // Less than 10 seconds = bounce
      },
    });

    // Update session with exit page
    await prisma.userSession.updateMany({
      where: { sessionId: data.sessionId },
      data: {
        exitPage: data.path,
        endTime: new Date(),
        duration: data.timeOnPage,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exit tracking error:', error);
    return NextResponse.json({ error: 'Failed to track exit' }, { status: 500 });
  }
}
