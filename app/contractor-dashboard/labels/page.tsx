import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LabelsClient } from './labels-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function LabelsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractor = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });
  if (!contractor) redirect('/onboarding/contractor');

  const configs = await prisma.contractorLabelConfig.findMany({
    where: { contractorId: contractor.id },
    orderBy: { createdAt: 'asc' },
  });

  const recentLabels = await prisma.contractorLabel.findMany({
    where: { contractorId: contractor.id },
    orderBy: { printedAt: 'desc' },
    take: 100,
    include: {
      config: { select: { name: true } },
      item: { select: { name: true, sku: true } },
    },
  });

  const items = await prisma.contractorInventoryItem.findMany({
    where: { contractorId: contractor.id },
    select: { id: true, name: true, sku: true, unit: true, warehouseZone: true, warehouseAisle: true, warehouseShelf: true, warehouseBin: true },
    orderBy: { name: 'asc' },
  });

  return (
    <LabelsClient
      configs={configs}
      recentLabels={recentLabels.map((l) => ({
        id: l.id,
        labelNumber: l.labelNumber,
        labelType: l.labelType,
        itemName: l.itemName ?? l.item?.name ?? null,
        sku: l.sku ?? l.item?.sku ?? null,
        quantity: l.quantity,
        unit: l.unit,
        warehouseZone: l.warehouseZone,
        warehouseAisle: l.warehouseAisle,
        warehouseShelf: l.warehouseShelf,
        warehouseBin: l.warehouseBin,
        status: l.status,
        printedAt: l.printedAt.toISOString(),
        configName: l.config?.name ?? null,
        description: l.description,
      }))}
      items={items}
      businessName={contractor.businessName ?? 'My Company'}
    />
  );
}
