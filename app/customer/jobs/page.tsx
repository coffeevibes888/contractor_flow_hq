import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { CustomerJobsList } from '@/components/customer/customer-jobs-list';

export const metadata: Metadata = {
  title: 'My Jobs',
};

export default async function CustomerJobsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Get user's customer records
  const customerRecords = await prisma.contractorCustomer.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (customerRecords.length === 0) {
    redirect('/customer/dashboard');
  }

  const customerIds = customerRecords.map((c) => c.id);

  // Fetch all jobs
  const jobs = await prisma.contractorJob.findMany({
    where: { customerId: { in: customerIds } },
    include: {
      contractor: {
        select: {
          id: true,
          businessName: true,
          displayName: true,
          avgRating: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const activeJobs = jobs.filter((j) =>
    ['approved', 'scheduled', 'in_progress'].includes(j.status)
  ).length;
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const totalSpent = jobs
    .filter((j) => ['completed', 'paid'].includes(j.status))
    .reduce((sum, j) => sum + Number(j.actualCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">My Jobs</h1>
        <p className="text-sm text-gray-600 mt-1">
          Track your projects and communicate with contractors
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
          <p className="text-3xl font-bold text-blue-600">{activeJobs}</p>
        </div>
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-3xl font-bold text-emerald-600">{completedJobs}</p>
        </div>
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Spent</p>
          <p className="text-3xl font-bold text-gray-900">${totalSpent.toFixed(0)}</p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Jobs</h3>
        </div>
        <div className="p-5">
          <CustomerJobsList jobs={jobs} />
        </div>
      </div>
    </div>
  );
}
