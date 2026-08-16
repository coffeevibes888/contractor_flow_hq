import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import FileDisputeForm from '@/components/disputes/file-dispute-form';

export const metadata = {
  title: 'File a Dispute | Contractor Portal',
};

export default async function ContractorNewDisputePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  // Filing a dispute is owner-only — disputes are a legal/financial action
  // that affects the business itself.
  if (session.user.role !== 'contractor') {
    return redirect('/contractor-dashboard');
  }

  // Get contractor's work orders that can be disputed
  const contractors = await prisma.contractor.findMany({
    where: { userId: session.user.id },
    select: { id: true, landlordId: true },
  });

  const contractorIds = contractors.map(c => c.id);

  const workOrders = await prisma.workOrder.findMany({
    where: { 
      contractorId: { in: contractorIds },
      status: { in: ['assigned', 'in_progress', 'completed', 'approved', 'paid'] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      agreedPrice: true,
      landlord: { select: { id: true, name: true } },
      property: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <FileDisputeForm 
        workOrders={workOrders as any} 
        userRole="contractor"
        backUrl="/contractor-dashboard/disputes"
      />
    </div>
  );
}
