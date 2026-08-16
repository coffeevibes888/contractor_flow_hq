import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { BidSubmitForm } from '@/components/contractor/bid-submit-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getContractorIdForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Submit Bid',
};

export default async function SubmitBidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

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

  const { id } = await params;

  // WorkOrder is the marketplace job. The bid page used to read non-existent
  // `category` and `address` columns straight off the WorkOrder; the address
  // lives on the linked Property as a JSON blob, and there's no category
  // column at all on WorkOrder.
  const job = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      landlord: {
        select: {
          companyName: true,
          logoUrl: true,
        },
      },
      property: {
        select: {
          address: true,
        },
      },
    },
  });

  if (!job) {
    redirect('/contractor-dashboard/marketplace');
  }

  // Check if already bid (using ContractorBid model)
  const existingBid = await prisma.contractorBid.findFirst({
    where: {
      jobId: id,
      contractorId: contractor.id,
    },
  });

  if (existingBid) {
    redirect(`/contractor-dashboard/marketplace?error=already_bid`);
  }

  // Check if bidding is still open
  if (job.bidDeadline && new Date(job.bidDeadline) < new Date()) {
    redirect(`/contractor-dashboard/marketplace?error=deadline_passed`);
  }

  // Property.address is a JSON column. Try a few common shapes; otherwise
  // fall back to the raw value's string form.
  const propertyAddress = (() => {
    if (!job.property?.address) return null;
    const a = job.property.address as
      | string
      | { street?: string; line1?: string; address?: string; city?: string; state?: string; zip?: string; zipCode?: string }
      | null;
    if (!a) return null;
    if (typeof a === 'string') return a;
    const street = a.street || a.line1 || a.address;
    const parts = [street, a.city, a.state, a.zip || a.zipCode].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  })();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/contractor-dashboard/marketplace"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Submit Your Bid</h1>
        <p className="text-sm text-gray-600 mt-1">
          Provide a competitive bid and proposal to win this job
        </p>
      </div>

      {/* Job Details */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Title</p>
            <p className="text-lg font-semibold text-gray-900">{job.title}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Description</p>
            <p className="text-sm text-gray-700">{job.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Posting Type</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{job.postingType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Priority</p>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {job.priority}
              </p>
            </div>
          </div>

          {propertyAddress && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Location</p>
              <p className="text-sm text-gray-900">{propertyAddress}</p>
            </div>
          )}

          {(job.budgetMin || job.budgetMax) && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Customer Budget Range</p>
              <p className="text-xl font-bold text-blue-600">
                ${Number(job.budgetMin ?? 0).toLocaleString()} - $
                {Number(job.budgetMax ?? 0).toLocaleString()}
              </p>
            </div>
          )}

          {job.bidDeadline && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Bidding Deadline</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(job.bidDeadline).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {job.landlord.companyName && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Posted By</p>
              <p className="text-sm font-medium text-gray-900">
                {job.landlord.companyName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bid Form */}
      <BidSubmitForm
        jobId={job.id}
        contractorId={contractor.id}
        jobTitle={job.title}
        jobBudget={{
          min: Number(job.budgetMin ?? 0),
          max: Number(job.budgetMax ?? 0),
        }}
      />
    </div>
  );
}
