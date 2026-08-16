import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const data = await request.json();

    await prisma.formInteraction.create({
      data: {
        sessionId: data.sessionId,
        userId: session?.user?.id || null,
        formId: data.formId,
        formName: data.formName || null,
        fieldName: data.fieldName || null,
        action: data.action,
        completed: data.completed,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Form interaction tracking error:', error);
    return NextResponse.json({ error: 'Failed to track form interaction' }, { status: 500 });
  }
}
