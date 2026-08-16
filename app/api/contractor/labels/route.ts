import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { generateLabelNumber } from '@/lib/utils/label-number';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contractor = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!contractor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const search = searchParams.get('search') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);

  const labels = await prisma.contractorLabel.findMany({
    where: {
      contractorId: contractor.id,
      ...(type ? { labelType: type } : {}),
      ...(search
        ? {
            OR: [
              { labelNumber: { contains: search, mode: 'insensitive' } },
              { itemName: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { printedAt: 'desc' },
    take: limit,
    include: { config: { select: { name: true } } },
  });

  return NextResponse.json(labels);
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
    configId,
    itemId,
    labelType,
    description,
    itemName,
    sku,
    quantity,
    unit,
    warehouseZone,
    warehouseAisle,
    warehouseShelf,
    warehouseBin,
    shipmentId,
    receivingId,
    notes,
    copies = 1,
  } = body;

  if (!labelType) return NextResponse.json({ error: 'labelType required' }, { status: 400 });

  // Get config for number generation
  let config = null;
  if (configId) {
    config = await prisma.contractorLabelConfig.findFirst({
      where: { id: configId, contractorId: contractor.id },
    });
  } else {
    config = await prisma.contractorLabelConfig.findFirst({
      where: { contractorId: contractor.id, labelType, isDefault: true },
    });
  }

  const createdLabels = [];

  for (let i = 0; i < Math.min(copies, 500); i++) {
    let labelNumber: string;

    if (config) {
      labelNumber = await generateLabelNumber(config);
    } else {
      // Fallback: timestamp + random
      labelNumber = `LBL-${Date.now()}-${Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, '0')}`;
    }

    const label = await prisma.contractorLabel.create({
      data: {
        contractorId: contractor.id,
        configId: config?.id ?? null,
        itemId: itemId ?? null,
        labelNumber,
        labelType,
        description: description ?? null,
        itemName: itemName ?? null,
        sku: sku ?? null,
        quantity: quantity ?? null,
        unit: unit ?? null,
        warehouseZone: warehouseZone ?? null,
        warehouseAisle: warehouseAisle ?? null,
        warehouseShelf: warehouseShelf ?? null,
        warehouseBin: warehouseBin ?? null,
        shipmentId: shipmentId ?? null,
        receivingId: receivingId ?? null,
        notes: notes ?? null,
        printedCount: 1,
      },
    });

    createdLabels.push(label);
  }

  return NextResponse.json(createdLabels, { status: 201 });
}
