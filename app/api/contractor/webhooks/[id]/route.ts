import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

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

  const endpoint = await prisma.contractorWebhookEndpoint.findFirst({
    where: { id, contractorId: profile.id },
  });
  if (!endpoint) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

  await prisma.contractorWebhookEndpoint.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Webhook endpoint deleted' });
}
