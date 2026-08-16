import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { CustomerReviewForm } from '@/components/customer/customer-review-form';

export const metadata: Metadata = {
  title: 'Write Review',
};

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const userId = session.user.id;
  const { job: jobIdParam } = await searchParams;

  if (!jobIdParam) {
    redirect('/customer/reviews');
  }

  // Get the job
  const job = await prisma.contractorJob.findUnique({
    where: { id: jobIdParam },
    include: {
      contractor: {
        select: {
          id: true,
          businessName: true,
          displayName: true,
        },
      },
      customer: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!job || job.customer?.userId !== userId) {
    redirect('/customer/reviews');
  }

  // Check if review already exists (reviews are keyed to the logged-in user)
  const existingReview = await prisma.contractorReview.findFirst({
    where: {
      jobId: job.id,
      customerId: userId,
    },
  });

  if (existingReview) {
    redirect(`/customer/reviews/${existingReview.id}/edit`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Write a Review</h1>
        <p className="text-sm text-gray-600 mt-1">
          Share your experience with{' '}
          {job.contractor.businessName || job.contractor.displayName}
        </p>
      </div>

      {/* Job Info */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-2">Job Details</h3>
        <p className="text-sm text-gray-600">{job.title}</p>
        {job.description && (
          <p className="text-sm text-gray-500 mt-1">{job.description}</p>
        )}
      </div>

      {/* Review Form */}
      <CustomerReviewForm
        jobId={job.id}
        contractorId={job.contractorId}
        customerId={userId}
      />
    </div>
  );
}
