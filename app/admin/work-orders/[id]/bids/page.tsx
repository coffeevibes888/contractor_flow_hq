import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import BidsReviewClient from './bids-review-client';

export const metadata: Metadata = {
  title: 'Review Bids | Admin',
  description: 'Review contractor bids, negotiate, and fund the winner.',
};

export default async function BidsReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      property: { select: { name: true, address: true, type: true } },
      unit: { select: { name: true } },
      landlord: { select: { id: true, ownerUserId: true, name: true } },
      bids: {
        include: {
          contractor: {
            select: {
              id: true,
              name: true,
              email: true,
              userId: true,
              specialties: true,
              isPaymentReady: true,
              user: {
                select: { id: true, image: true },
              },
            },
          },
          messages: {
            select: { id: true },
          },
        },
        orderBy: { amount: 'asc' },
      },
      media: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, url: true, type: true, caption: true },
      },
    },
  });

  if (!wo) notFound();

  // Authorization: viewer must own the landlord this WO belongs to
  if (wo.landlord.ownerUserId !== session.user.id) {
    redirect('/admin');
  }

  // Pull contractor profiles for trust badges (rating, license, payment status)
  const contractorUserIds = wo.bids.map((b) => b.contractor.userId).filter(Boolean) as string[];
  const profiles = contractorUserIds.length
    ? await prisma.contractorProfile.findMany({
        where: { userId: { in: contractorUserIds } },
        select: {
          userId: true,
          businessName: true,
          yearsExperience: true,
          licenseNumber: true,
          insuranceVerified: true,
          backgroundChecked: true,
          stripeConnectAccountId: true,
          isPaymentReady: true,
          avgRating: true,
          totalReviews: true,
          completedJobs: true,
        },
      })
    : [];
  const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

  const bidsForClient = wo.bids.map((b) => {
    const profile = b.contractor.userId ? profileByUserId.get(b.contractor.userId) : null;
    return {
      id: b.id,
      amount: Number(b.amount),
      laborCost: b.laborCost ? Number(b.laborCost) : null,
      materialsCost: b.materialsCost ? Number(b.materialsCost) : null,
      estimatedHours: b.estimatedHours ? Number(b.estimatedHours) : null,
      proposedStartDate: b.proposedStartDate?.toISOString() || null,
      estimatedCompletionDate: b.estimatedCompletionDate?.toISOString() || null,
      inclusions: b.inclusions ?? [],
      exclusions: b.exclusions ?? [],
      warrantyDays: b.warrantyDays ?? null,
      willPullPermits: b.willPullPermits ?? null,
      paymentTerms: b.paymentTerms || null,
      validUntil: b.validUntil?.toISOString() || null,
      message: b.message || null,
      status: b.status,
      messageCount: b.messages.length,
      createdAt: b.createdAt.toISOString(),
      contractor: {
        id: b.contractor.id,
        userId: b.contractor.userId,
        name: profile?.businessName || b.contractor.name,
        email: b.contractor.email,
        image: b.contractor.user?.image || null,
        specialties: b.contractor.specialties,
        isPaymentReady: profile?.isPaymentReady ?? b.contractor.isPaymentReady ?? false,
        yearsExperience: profile?.yearsExperience ?? null,
        licenseNumber: profile?.licenseNumber ?? null,
        insuranceVerified: profile?.insuranceVerified ?? false,
        backgroundChecked: profile?.backgroundChecked ?? false,
        avgRating: profile?.avgRating ? Number(profile.avgRating) : null,
        totalReviews: profile?.totalReviews ?? 0,
        completedJobs: profile?.completedJobs ?? 0,
      },
    };
  });

  return (
    <BidsReviewClient
      currentUserId={session.user.id}
      job={{
        id: wo.id,
        title: wo.title,
        description: wo.description,
        priority: wo.priority,
        status: wo.status,
        budgetMin: wo.budgetMin ? Number(wo.budgetMin) : null,
        budgetMax: wo.budgetMax ? Number(wo.budgetMax) : null,
        property: {
          name: wo.property.name,
          type: wo.property.type,
          city: (wo.property.address as any)?.city || '',
          state: (wo.property.address as any)?.state || '',
        },
        unit: wo.unit?.name || null,
        mediaCount: wo.media.length,
      }}
      lifecycle={{
        status: wo.lifecycleStatus as any,
        escrowAmount: wo.escrowAmount ? Number(wo.escrowAmount) : null,
        pmApprovalDeadline: wo.pmApprovalDeadline?.toISOString() || null,
        scheduledDate: wo.scheduledDate?.toISOString() || null,
        acceptedBidId: wo.acceptedBidId,
      }}
      bids={bidsForClient}
    />
  );
}
