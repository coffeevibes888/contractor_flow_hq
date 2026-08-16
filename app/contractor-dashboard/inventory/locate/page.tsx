import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LocateClient } from './locate-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function LocatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractor = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });
  if (!contractor) redirect('/onboarding/contractor');

  // All items with location data
  const items = await prisma.contractorInventoryItem.findMany({
    where: { contractorId: contractor.id },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      quantity: true,
      warehouseQuantity: true,
      unit: true,
      warehouseZone: true,
      warehouseAisle: true,
      warehouseShelf: true,
      warehouseBin: true,
      lastReceivedDate: true,
      reorderPoint: true,
    },
    orderBy: [{ warehouseZone: 'asc' }, { warehouseAisle: 'asc' }, { warehouseShelf: 'asc' }, { name: 'asc' }],
  });

  // All labels for lookup by number
  const labels = await prisma.contractorLabel.findMany({
    where: { contractorId: contractor.id, status: 'active' },
    select: {
      id: true,
      labelNumber: true,
      itemName: true,
      sku: true,
      quantity: true,
      unit: true,
      warehouseZone: true,
      warehouseAisle: true,
      warehouseShelf: true,
      warehouseBin: true,
      labelType: true,
      printedAt: true,
    },
    orderBy: { printedAt: 'desc' },
  });

  return (
    <LocateClient
      items={items.map((i) => ({
        ...i,
        lastReceivedDate: i.lastReceivedDate?.toISOString() ?? null,
      }))}
      labels={labels.map((l) => ({
        ...l,
        printedAt: l.printedAt.toISOString(),
      }))}
    />
  );
}
