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

  const records = await prisma.contractorInventoryReceiving.findMany({
    where: { contractorId: contractor.id },
    orderBy: { receivedAt: 'desc' },
    take: 100,
    include: {
      item: { select: { id: true, name: true, sku: true, unit: true, category: true } },
    },
  });

  return NextResponse.json(records);
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
    itemId,
    quantityReceived,
    quantityExpected,
    poNumber,
    invoiceNumber,
    packingSlip,
    warehouseZone,
    warehouseAisle,
    warehouseShelf,
    warehouseBin,
    qualityChecked,
    qualityStatus,
    damageNotes,
    notes,
  } = body;

  if (!itemId || !quantityReceived) {
    return NextResponse.json({ error: 'itemId and quantityReceived are required' }, { status: 400 });
  }

  // Verify item belongs to contractor
  const item = await prisma.contractorInventoryItem.findFirst({
    where: { id: itemId, contractorId: contractor.id },
  });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  // Create receiving record
  const record = await prisma.contractorInventoryReceiving.create({
    data: {
      contractorId: contractor.id,
      itemId,
      quantityReceived,
      quantityExpected: quantityExpected ?? null,
      poNumber: poNumber ?? null,
      invoiceNumber: invoiceNumber ?? null,
      packingSlip: packingSlip ?? null,
      warehouseZone: warehouseZone ?? null,
      warehouseAisle: warehouseAisle ?? null,
      warehouseShelf: warehouseShelf ?? null,
      warehouseBin: warehouseBin ?? null,
      qualityChecked: qualityChecked ?? false,
      qualityStatus: qualityStatus ?? null,
      damageNotes: damageNotes ?? null,
      notes: notes ?? null,
    },
  });

  // Update inventory item quantities and location
  await prisma.contractorInventoryItem.update({
    where: { id: itemId },
    data: {
      quantity: { increment: quantityReceived },
      warehouseQuantity: { increment: quantityReceived },
      lastReceivedDate: new Date(),
      // Update location if provided
      ...(warehouseZone ? { warehouseZone } : {}),
      ...(warehouseAisle ? { warehouseAisle } : {}),
      ...(warehouseShelf ? { warehouseShelf } : {}),
      ...(warehouseBin ? { warehouseBin } : {}),
    },
  });

  return NextResponse.json(record, { status: 201 });
}
