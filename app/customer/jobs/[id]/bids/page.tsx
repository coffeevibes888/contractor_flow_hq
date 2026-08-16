import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { JobBiddingList } from '@/components/customer/job-bidding-list';
import { ArrowLeft, Briefcase, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Job Bids',
};

export default async function JobBidsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Get the job (WorkOrder)
  const job = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      landlord: {
        select: {
          companyName: true,
          logoUrl: true,
        },
      },
      contractorBids: {
        include: {
          contractor: {
            select: {
              id: true,
              businessName: true,
              displayName: true,
              avgRating: true,
              totalReviews: true,
              completedJobs: true,
              responseRate: true,
            },
          },
        },
        orderBy: { bidAmount: 'asc' },
      },
    },
  });

  if (!job) {
    redirect('/customer/jobs');
  }

  // Verify ownership (customer is the one who posted the job)
  // For WorkOrder, we need to check if user owns the landlord
  const landlord = await prisma.landlord.findFirst({
    where: {
      id: job.landlordId,
      ownerUserId: session.user.id,
    },
  });

  if (!landlord) {
    redirect('/customer/jobs');
  }

  // Calculate stats
  const activeBids = job.contractorBids.filter((bid) => bid.status === 'active');
  const acceptedBid = job.contractorBids.find((bid) => bid.status === 'accepted');
  const avgBidAmount =
    activeBids.length > 0
      ? activeBids.reduce((sum, bid) => sum + Number(bid.bidAmount), 0) /
        activeBids.length
      : 0;

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/customer/jobs"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Job Bids</h1>
        <p className="text-sm text-gray-600 mt-1">
          Review and compare bids from contractors
        </p>
      </div>

      {/* Job Details Card */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-start justify-between gap-6 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
              <Badge className={priorityColors[job.priority]}>
                {job.priority}
              </Badge>
              {acceptedBid && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Bid Accepted
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-700 mb-4">{job.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                <span>{job.priority} priority</span>
              </div>
              {job.bidDeadline && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Deadline: {new Date(job.bidDeadline).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500 mb-1">Your Budget</p>
            <p className="text-2xl font-bold text-gray-900">
              ${Number(job.budgetMin).toLocaleString()} - $
              {Number(job.budgetMax).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Bid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Bids</p>
          <p className="text-3xl font-bold text-blue-600">{job.contractorBids.length}</p>
        </div>
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Active Bids</p>
          <p className="text-3xl font-bold text-violet-600">
            {activeBids.length}
          </p>
        </div>
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Average Bid</p>
          <p className="text-3xl font-bold text-gray-900">
            ${avgBidAmount.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Accepted Bid Notice */}
      {acceptedBid && (
        <div className="rounded-lg bg-emerald-50 border-2 border-emerald-200 p-4">
          <p className="text-sm text-emerald-700 font-medium">
            ✓ You've accepted a bid from{' '}
            {acceptedBid.contractor.businessName ||
              acceptedBid.contractor.displayName}{' '}
            for ${Number(acceptedBid.bidAmount).toLocaleString()}. The job has been
            created and the contractor has been notified.
          </p>
        </div>
      )}

      {/* Bidding List */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <JobBiddingList
          jobId={job.id}
          bids={job.contractorBids}
          jobBudget={Number(job.budgetMax)}
        />
      </div>
    </div>
  );
}
