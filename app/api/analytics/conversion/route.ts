import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const data = await request.json();

    // Update session with conversion data
    await prisma.userSession.updateMany({
      where: { sessionId: data.sessionId },
      data: {
        converted: true,
        conversionType: data.conversionType,
        conversionValue: data.conversionValue || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conversion tracking error:', error);
    return NextResponse.json({ error: 'Failed to track conversion' }, { status: 500 });
  }
}
