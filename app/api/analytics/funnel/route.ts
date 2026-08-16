import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const data = await request.json();

    await prisma.conversionFunnel.create({
      data: {
        sessionId: data.sessionId,
        userId: session?.user?.id || null,
        step: data.step,
        stepOrder: data.stepOrder,
        metadata: data.metadata || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Funnel tracking error:', error);
    return NextResponse.json({ error: 'Failed to track funnel step' }, { status: 500 });
  }
}
