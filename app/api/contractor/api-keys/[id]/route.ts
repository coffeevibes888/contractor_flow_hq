import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/** DELETE — revoke an API key */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const key = await prisma.contractorApiKey.findFirst({
    where: { id, contractorId: profile.id },
  });
  if (!key) return NextResponse.json({ error: 'Key not found' }, { status: 404 });

  await prisma.contractorApiKey.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, message: 'API key revoked' });
}
