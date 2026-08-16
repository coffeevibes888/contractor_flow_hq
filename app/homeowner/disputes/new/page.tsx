import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import FileDisputeForm from '@/components/disputes/file-dispute-form';

export const metadata = {
  title: 'File a Dispute | Homeowner',
};

export default async function HomeownerNewDisputePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  // Get homeowner's work orders that can be disputed
  let workOrders: any[] = [];
  try {
    const homeowner = await (prisma as any).homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (homeowner) {
      workOrders = await (prisma as any).homeownerWorkOrder.findMany({
        where: { 
          homeownerId: homeowner.id,
          status: { in: ['assigned', 'in_progress', 'completed'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          agreedPrice: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Transform to match expected format
      workOrders = workOrders.map((wo: any) => ({
        ...wo,
        landlord: { id: 'homeowner', name: 'Homeowner Job' },
        property: { name: 'My Home' },
      }));
    }
  } catch {
    // Model might not exist
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <FileDisputeForm 
          workOrders={workOrders} 
          userRole="homeowner"
          backUrl="/homeowner/disputes"
        />
      </div>
    </div>
  );
}
