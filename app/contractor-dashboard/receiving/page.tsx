import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { ReceivingDockClient } from './receiving-dock-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function ReceivingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractor = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });
  if (!contractor) redirect('/onboarding/contractor');

  // Fetch inventory items for the dropdown
  const items = await prisma.contractorInventoryItem.findMany({
    where: { contractorId: contractor.id },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      category: true,
      quantity: true,
      warehouseZone: true,
      warehouseAisle: true,
      warehouseShelf: true,
      warehouseBin: true,
    },
    orderBy: { name: 'asc' },
  });

  // Recent receiving history
  const recentReceiving = await prisma.contractorInventoryReceiving.findMany({
    where: { contractorId: contractor.id },
    orderBy: { receivedAt: 'desc' },
    take: 50,
    include: {
      item: { select: { name: true, sku: true, unit: true } },
    },
  });

  const serialized = recentReceiving.map((r) => ({
    id: r.id,
    itemId: r.itemId,
    itemName: r.item.name,
    itemSku: r.item.sku,
    itemUnit: r.item.unit,
    quantityReceived: r.quantityReceived,
    quantityExpected: r.quantityExpected,
    receivedAt: r.receivedAt.toISOString(),
    warehouseZone: r.warehouseZone,
    warehouseAisle: r.warehouseAisle,
    warehouseShelf: r.warehouseShelf,
    warehouseBin: r.warehouseBin,
    poNumber: r.poNumber,
    invoiceNumber: r.invoiceNumber,
    qualityChecked: r.qualityChecked,
    qualityStatus: r.qualityStatus,
    damageNotes: r.damageNotes,
    notes: r.notes,
  }));

  return (
    <ReceivingDockClient
      items={items}
      recentReceiving={serialized}
      businessName={contractor.businessName ?? 'My Company'}
    />
  );
}
