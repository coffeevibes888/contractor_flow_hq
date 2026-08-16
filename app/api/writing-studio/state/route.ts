import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export const runtime = 'nodejs';

// ─── GET /api/writing-studio/state ───────────────────────────────────────────
// Returns the saved studio state for the logged-in super-admin, or null.

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'superAdmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = await prisma.writingStudioState.findUnique({
    where: { userId: session.user.id },
    select: { state: true },
  });

  return NextResponse.json({ state: row?.state ?? null });
}

// ─── PUT /api/writing-studio/state ───────────────────────────────────────────
// Upserts the studio state for the logged-in super-admin.

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'superAdmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { state?: unknown };
  if (!body.state) {
    return NextResponse.json({ error: 'Missing state' }, { status: 400 });
  }

  await prisma.writingStudioState.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, state: body.state },
    update: { state: body.state },
  });

  return NextResponse.json({ ok: true });
}
