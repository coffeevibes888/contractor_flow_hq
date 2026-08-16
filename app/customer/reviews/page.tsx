import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { CustomerReviewsList } from '@/components/customer/customer-reviews-list';
import { Star, MessageSquare, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'My Reviews',
};

export default async function CustomerReviewsPage() {
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

  // Fetch reviews. ContractorReview links to a job only by `jobId` (there's
  // no `job` relation), so we don't include it here.
  const reviews = await prisma.contractorReview.findMany({
    where: { customerId: { in: customerIds } },
    include: {
      contractor: {
        select: {
          id: true,
          businessName: true,
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get completed jobs without reviews
  const completedJobs = await prisma.contractorJob.findMany({
    where: {
      customerId: { in: customerIds },
      status: 'completed',
      NOT: {
        id: {
          in: reviews.map((r) => r.jobId).filter((id): id is string => id !== null),
        },
      },
    },
    include: {
      contractor: {
        select: {
          id: true,
          businessName: true,
          displayName: true,
        },
      },
    },
    orderBy: { actualEndDate: 'desc' },
  });

  // Calculate stats
  const totalReviews = reviews.length;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.overallRating), 0) / reviews.length
      : 0;
  const pendingReviews = completedJobs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">My Reviews</h1>
        <p className="text-sm text-gray-600 mt-1">
          Share your experience and help other customers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-100">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-3xl font-bold text-amber-600">
                {avgRating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reviews</p>
              <p className="text-3xl font-bold text-blue-600">{totalReviews}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-100">
              <CheckCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700 font-medium">Pending Reviews</p>
              <p className="text-3xl font-bold text-amber-600">{pendingReviews}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Reviews */}
      {completedJobs.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 shadow-sm">
          <div className="p-5 border-b border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Jobs Awaiting Your Review
            </h3>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {completedJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-lg border-2 border-amber-200 bg-white p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-600">
                      {job.contractor.businessName || job.contractor.displayName}
                    </p>
                  </div>
                  <a href={`/customer/reviews/new?job=${job.id}`}>
                    <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium">
                      <Star className="h-4 w-4 inline mr-2" />
                      Write Review
                    </button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Reviews</h3>
        </div>
        <div className="p-5">
          <CustomerReviewsList reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
