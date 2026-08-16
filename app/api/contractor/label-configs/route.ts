import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contractor = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!contractor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const configs = await prisma.contractorLabelConfig.findMany({
    where: { contractorId: contractor.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contractor = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!contractor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const {
    name, labelType, isDefault,
    prefix, suffix, sequenceType, padLength, startAt,
    showLogo, showBarcode, showLocation, showDate, showQty,
    showItemName, showSku, showNotes, labelSize, copies,
  } = body;

  if (!name || !labelType) {
    return NextResponse.json({ error: 'name and labelType are required' }, { status: 400 });
  }

  // If setting as default, unset existing defaults for this type
  if (isDefault) {
    await prisma.contractorLabelConfig.updateMany({
      where: { contractorId: contractor.id, labelType, isDefault: true },
      data: { isDefault: false },
    });
  }

  const config = await prisma.contractorLabelConfig.create({
    data: {
      contractorId: contractor.id,
      name,
      labelType,
      isDefault: isDefault ?? false,
      prefix: prefix ?? null,
      suffix: suffix ?? null,
      sequenceType: sequenceType ?? 'sequential',
      padLength: padLength ?? 4,
      startAt: startAt ?? 1,
      currentSeq: 0,
      showLogo: showLogo ?? true,
      showBarcode: showBarcode ?? true,
      showLocation: showLocation ?? true,
      showDate: showDate ?? true,
      showQty: showQty ?? true,
      showItemName: showItemName ?? true,
      showSku: showSku ?? true,
      showNotes: showNotes ?? false,
      labelSize: labelSize ?? '4x6',
      copies: copies ?? 1,
    },
  });

  return NextResponse.json(config, { status: 201 });
}
