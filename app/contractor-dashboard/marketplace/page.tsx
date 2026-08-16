import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { JobMarketplace } from '@/components/contractor/job-marketplace';
import { Briefcase, TrendingUp, Clock } from 'lucide-react';
import { getContractorIdForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Job Marketplace',
};

export default async function ContractorMarketplacePage({
  searchParams,
}: {
  searchParams: { category?: string; budget?: string; location?: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Resolve contractor — works for owners and active employees alike.
  const contractorId = await getContractorIdForUser(session.user.id);

  if (!contractorId) {
    redirect('/onboarding/contractor');
  }

  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
  });

  if (!contractor) {
    redirect('/onboarding/contractor');
  }

  // Get open jobs (using WorkOrder model for now, can be adapted)
  const openJobs = await prisma.workOrder.findMany({
    where: {
      status: 'open',
      isOpenBid: true,
      bidDeadline: {
        gte: new Date(),
      },
    },
    include: {
      landlord: {
        select: {
          companyName: true,
          logoUrl: true,
        },
      },
      _count: {
        select: {
          contractorBids: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Get contractor's active bids
  const myBids = await prisma.contractorBid.findMany({
    where: {
      contractorId: contractor.id,
      status: 'active',
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  // Calculate stats
  const totalJobs = openJobs.length;
  const avgBidsPerJob =
    openJobs.length > 0
      ? openJobs.reduce((sum, job) => sum + job._count.contractorBids, 0) / openJobs.length
      : 0;
  const myActiveBids = myBids.length;

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Job Marketplace</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Browse open jobs and submit competitive bids</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        {[
          { label: 'Open Jobs', value: String(totalJobs), icon: Briefcase, gradient: 'from-blue-400 to-indigo-400' },
          { label: 'Avg. Competition', value: `${avgBidsPerJob.toFixed(1)} bids`, icon: TrendingUp, gradient: 'from-violet-400 to-purple-400' },
          { label: 'My Active Bids', value: String(myActiveBids), icon: Clock, gradient: 'from-amber-400 to-orange-400' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-xs text-gray-500 font-medium'>{label}</p>
                <p className='text-2xl font-bold text-gray-900 mt-0.5'>{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                <Icon className='h-4 w-4' />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Message */}
      {searchParams && 'success' in searchParams && (
        <div className='flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium'>
          ✓ Bid submitted successfully! The customer will review your bid and may contact you.
        </div>
      )}

      {/* Job Marketplace */}
      <JobMarketplace
        jobs={openJobs}
        contractorId={contractor.id}
        myBids={myBids}
        filters={searchParams}
      />
    </div>
  );
}
