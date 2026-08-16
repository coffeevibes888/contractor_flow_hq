import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contractor = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!contractor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existing = await prisma.contractorLabelConfig.findFirst({
    where: { id: params.id, contractorId: contractor.id },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();

  if (body.isDefault) {
    await prisma.contractorLabelConfig.updateMany({
      where: { contractorId: contractor.id, labelType: existing.labelType, isDefault: true },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.contractorLabelConfig.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contractor = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!contractor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.contractorLabelConfig.deleteMany({
    where: { id: params.id, contractorId: contractor.id },
  });

  return NextResponse.json({ success: true });
}
