import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { ShippingClient } from './shipping-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function ShippingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractor = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });
  if (!contractor) redirect('/onboarding/contractor');

  const items = await prisma.contractorInventoryItem.findMany({
    where: { contractorId: contractor.id, quantity: { gt: 0 } },
    select: {
      id: true, name: true, sku: true, unit: true, category: true, quantity: true,
      warehouseZone: true, warehouseAisle: true, warehouseShelf: true, warehouseBin: true,
    },
    orderBy: { name: 'asc' },
  });

  const shipments = await prisma.contractorShipment.findMany({
    where: { contractorId: contractor.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      items: {
        include: { item: { select: { name: true, sku: true, unit: true } } },
      },
    },
  });

  return (
    <ShippingClient
      items={items}
      shipments={shipments.map((s) => ({
        id: s.id,
        shipmentNumber: s.shipmentNumber,
        status: s.status,
        destinationName: s.destinationName,
        destinationAddress: s.destinationAddress,
        destinationType: s.destinationType,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        shipDate: s.shipDate?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        itemCount: s.items.reduce((acc, i) => acc + i.quantityShipped, 0),
        lineCount: s.items.length,
        items: s.items.map((li) => ({
          id: li.id,
          itemName: li.item.name,
          sku: li.item.sku,
          unit: li.item.unit,
          quantityShipped: li.quantityShipped,
          fromZone: li.fromZone,
          fromAisle: li.fromAisle,
          fromShelf: li.fromShelf,
          fromBin: li.fromBin,
        })),
      }))}
      businessName={contractor.businessName ?? 'My Company'}
    />
  );
}
