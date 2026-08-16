import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'superAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const { notes } = await req.json();
  await prisma.freeLeaseUsage.update({
    where: { id },
    data: { notes: typeof notes === 'string' ? notes : null },
  });
  return NextResponse.json({ ok: true });
}
