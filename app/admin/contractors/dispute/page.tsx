import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import FileDisputeForm from '@/components/disputes/file-dispute-form';

export const metadata: Metadata = {
  title: 'File a Dispute | Admin',
};

export default async function AdminFileDisputePage({
  searchParams,
}: {
  searchParams: Promise<{ workOrderId?: string }>;
}) {
  const session = await auth();
  const { workOrderId } = await searchParams;

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    return redirect('/admin');
  }

  // Get work orders that can be disputed
  const workOrders = await prisma.workOrder.findMany({
    where: {
      landlordId: landlordResult.landlord.id,
      status: { in: ['assigned', 'in_progress', 'completed', 'approved', 'paid'] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      agreedPrice: true,
      landlord: { select: { id: true, name: true } },
      property: { select: { name: true } },
      contractor: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Transform to include contractor name in property for display
  const transformedWorkOrders = workOrders.map(wo => ({
    ...wo,
    property: { name: `${wo.property.name}${wo.contractor ? ` (${wo.contractor.name})` : ''}` },
  }));

  return (
    <main className="w-full px-2 py-4 md:px-6 lg:px-8 md:py-6">
      <div className="max-w-2xl mx-auto">
        <FileDisputeForm 
          workOrders={transformedWorkOrders as any}
          userRole="landlord"
          backUrl="/admin/contractors"
        />
      </div>
    </main>
  );
}
