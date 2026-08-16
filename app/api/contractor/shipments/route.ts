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

  const shipments = await prisma.contractorShipment.findMany({
    where: { contractorId: contractor.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      items: {
        include: {
          item: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
    },
  });

  return NextResponse.json(shipments);
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
    destinationType,
    destinationName,
    destinationAddress,
    fromWarehouseZone,
    carrier,
    trackingNumber,
    estimatedDelivery,
    shipDate,
    notes,
    items, // Array of { itemId, quantityShipped, unit, fromZone, fromAisle, fromShelf, fromBin, notes }
  } = body;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
  }

  // Generate shipment number
  const count = await prisma.contractorShipment.count({ where: { contractorId: contractor.id } });
  const shipmentNumber = `SHP-${String(count + 1).padStart(5, '0')}`;

  const shipment = await prisma.contractorShipment.create({
    data: {
      contractorId: contractor.id,
      shipmentNumber,
      status: 'draft',
      destinationType: destinationType ?? null,
      destinationName: destinationName ?? null,
      destinationAddress: destinationAddress ?? null,
      fromWarehouseZone: fromWarehouseZone ?? null,
      carrier: carrier ?? null,
      trackingNumber: trackingNumber ?? null,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      shipDate: shipDate ? new Date(shipDate) : null,
      notes: notes ?? null,
      items: {
        create: items.map((line: any) => ({
          itemId: line.itemId,
          quantityShipped: line.quantityShipped,
          unit: line.unit ?? null,
          notes: line.notes ?? null,
          fromZone: line.fromZone ?? null,
          fromAisle: line.fromAisle ?? null,
          fromShelf: line.fromShelf ?? null,
          fromBin: line.fromBin ?? null,
        })),
      },
    },
    include: { items: true },
  });

  // Deduct inventory quantities
  for (const line of items) {
    await prisma.contractorInventoryItem.update({
      where: { id: line.itemId },
      data: {
        quantity: { decrement: line.quantityShipped },
        warehouseQuantity: { decrement: line.quantityShipped },
      },
    });
  }

  return NextResponse.json(shipment, { status: 201 });
}
