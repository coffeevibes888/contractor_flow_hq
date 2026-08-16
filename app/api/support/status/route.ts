'use server';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

async function getCurrentStatus() {
  const existing = await prisma.supportStatus.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  if (!existing) {
    return await prisma.supportStatus.create({
      data: { isOnline: true },
    });
  }

  return existing;
}

export async function GET() {
  try {
    const status = await getCurrentStatus();
    return NextResponse.json({
      isOnline: status.isOnline,
      updatedAt: status.updatedAt,
      updatedBy: status.updatedBy,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load support status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !['admin', 'superAdmin'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const explicit = typeof body.isOnline === 'boolean' ? body.isOnline : undefined;

    const current = await getCurrentStatus();

    const nextValue = explicit ?? !current.isOnline;

    const updated = await prisma.supportStatus.create({
      data: {
        isOnline: nextValue,
        updatedBy: session.user.id as string,
      },
    });

    return NextResponse.json({
      isOnline: updated.isOnline,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update support status' }, { status: 500 });
  }
}
