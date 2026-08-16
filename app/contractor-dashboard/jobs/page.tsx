import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { JobsMobileList, JobsDesktopTable } from '@/components/contractor/jobs-list';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Briefcase, Info, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Jobs | Contractor Dashboard',
};

export default async function ContractorJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  const params = await searchParams;
  const statusFilter = params.status;
  const searchQuery = params.search;

  const where: any = { contractorId: contractorProfile.id };
  if (statusFilter && statusFilter !== 'all') {
    where.status = statusFilter;
  } else {
    // Hide archived jobs from the default "All" view
    where.status = { not: 'archived' };
  }
  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { jobNumber: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  const jobsRaw = await prisma.contractorJob.findMany({
    where,
    include: { customer: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const jobs = jobsRaw.map((job) => ({
    ...job,
    estimatedCost: job.estimatedCost ? Number(job.estimatedCost) : null,
    actualCost: job.actualCost ? Number(job.actualCost) : null,
    laborCost: job.laborCost ? Number(job.laborCost) : null,
    materialCost: job.materialCost ? Number(job.materialCost) : null,
    profitMargin: job.profitMargin ? Number(job.profitMargin) : null,
  }));

  const [allCount, quotedCount, approvedCount, scheduledCount, inProgressCount, completedCount, onHoldCount, archivedCount] =
    await Promise.all([
      prisma.contractorJob.count({ where: { contractorId: contractorProfile.id, status: { not: 'archived' } } }),
      prisma.contractorJob.count({ where: { contractorId: contractorProfile.id, status: 'quoted' } }),
      prisma.contractorJob.count({ where: { contractorId: contractorProfile.id, status: 'approved' } }),
      prisma.contractorJob.count({ where: { contractorId: contractorProfile.id, status: 'scheduled' } }),
      prisma.contractorJob.count({ where: { contractorId: contractorProfile.id, status: 'in_progress' } }),
      prisma.contractorJob.count({ where: { contractorId: contractorProfile.id, status: 'completed' } }),
      prisma.contractorJob.count({ where: { contractorId: contractorProfile.id, status: 'on_hold' } }),
      prisma.contractorJob.count({ where: { contractorId: contractorProfile.id, status: 'archived' } }),
    ]);

  const statusFilters = [
    { label: 'All Jobs', value: 'all', count: allCount },
    { label: 'Quoted', value: 'quoted', count: quotedCount },
    { label: 'Approved', value: 'approved', count: approvedCount },
    { label: 'Scheduled', value: 'scheduled', count: scheduledCount },
    { label: 'In Progress', value: 'in_progress', count: inProgressCount },
    { label: 'Completed', value: 'completed', count: completedCount },
    { label: 'On Hold', value: 'on_hold', count: onHoldCount },
    { label: 'Archived', value: 'archived', count: archivedCount },
  ];

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Jobs</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage your projects from quote to completion
          </p>
        </div>
        <div className='flex gap-2'>
          <Link href='/contractors?view=jobs'>
            <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm'>
              <Briefcase className='h-4 w-4 mr-2' />
              Browse Jobs
            </Button>
          </Link>
          <Link href='/contractor-dashboard/jobs/new'>
            <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold'>
              <Plus className='h-4 w-4 mr-2' />
              New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <div className='flex items-start gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50'>
        <div className='p-1.5 rounded-lg bg-blue-100 shrink-0'>
          <Info className='h-4 w-4 text-blue-600' />
        </div>
        <div>
          <p className='text-xs font-semibold text-blue-800'>How do jobs get created?</p>
          <p className='text-xs text-blue-700 mt-0.5 leading-relaxed'>
            Create jobs manually for your own clients, or they auto-create when a customer accepts a quote. Jobs track timeline, costs, photos, contracts, and payments. For property manager assignments, see{' '}
            <Link href='/contractor-dashboard/work-orders' className='underline font-medium'>Work Orders</Link>.
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <div className='flex items-center gap-2 mb-3'>
          <Filter className='h-4 w-4 text-gray-400' />
          <h3 className='text-sm font-semibold text-gray-700'>Filter by Status</h3>
        </div>
        <div className='flex flex-wrap gap-2'>
          {statusFilters.map((filter) => {
            const isActive = !statusFilter ? filter.value === 'all' : statusFilter === filter.value;
            return (
              <Link
                key={filter.value}
                href={`/contractor-dashboard/jobs${filter.value !== 'all' ? `?status=${filter.value}` : ''}`}
              >
                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                  }`}>
                    {filter.count}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center'>
            <Briefcase className='h-7 w-7 text-amber-400' />
          </div>
          <h3 className='text-base font-bold text-gray-800 mb-1'>No jobs yet</h3>
          <p className='text-sm text-gray-500 mb-4'>
            Create a job manually or respond to leads from the marketplace.
          </p>
          <div className='flex items-center justify-center gap-3'>
            <Link href='/contractor-dashboard/jobs/new'>
              <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
                <Plus className='h-4 w-4 mr-2' />
                Create Job
              </Button>
            </Link>
            <Link href='/contractor-dashboard/leads'>
              <Button variant='outline' className='border-gray-200 text-gray-600 hover:bg-gray-50'>
                View Leads
                <ChevronRight className='h-4 w-4 ml-1' />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='p-4 border-b border-gray-100'>
            <h3 className='text-sm font-bold text-gray-800'>
              {jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'}
              {statusFilter && statusFilter !== 'all' && (
                <span className='ml-2 text-gray-400 font-normal'>· {statusFilter.replace('_', ' ')}</span>
              )}
            </h3>
          </div>
          <div className='p-4'>
            <JobsMobileList jobs={jobs} />
            <JobsDesktopTable jobs={jobs} />
          </div>
        </div>
      )}
    </div>
  );
}
