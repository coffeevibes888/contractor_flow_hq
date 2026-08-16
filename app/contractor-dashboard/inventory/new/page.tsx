import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { InventoryForm } from '@/components/contractor/inventory-form';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function NewInventoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  // Fetch vendors for dropdown
  const vendors = await prisma.contractorVendor.findMany({
    where: { 
      contractorId: contractorProfile.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Add Inventory Item</h1>
        <p className="text-sm text-gray-600 mt-1">
          Add a new item to your inventory
        </p>
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <InventoryForm 
          contractorId={contractorProfile.id}
          vendors={vendors}
        />
      </div>
    </div>
  );
}
