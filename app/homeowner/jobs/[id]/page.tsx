import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { notFound } from 'next/navigation';
import JobDetailClient from './job-detail-client';

export default async function HomeownerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  // Get homeowner profile
  const homeowner = await prisma.homeowner.findUnique({
    where: { userId: session.user.id },
  });

  if (!homeowner) {
    return redirect('/homeowner/dashboard');
  }

  // Get work order with bids
  const workOrder = await prisma.homeownerWorkOrder.findFirst({
    where: {
      id,
      homeownerId: homeowner.id,
    },
    include: {
      bids: {
        include: {
          // We'll need to join with ContractorProfile to get contractor details
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!workOrder) {
    return notFound();
  }

  // Get contractor details for each bid
  const bidsWithContractors = await Promise.all(
    workOrder.bids.map(async (bid) => {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: bid.contractorId },
        select: {
          id: true,
          businessName: true,
          displayName: true,
          profilePhoto: true,
          avgRating: true,
          completedJobs: true,
          responseRate: true,
          specialties: true,
          hourlyRate: true,
          yearsExperience: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      });

      return {
        id: bid.id,
        amount: bid.amount.toString(),
        estimatedHours: bid.estimatedHours != null ? bid.estimatedHours.toString() : null,
        proposedStartDate: bid.proposedStartDate ? bid.proposedStartDate.toISOString() : null,
        message: bid.message,
        status: bid.status,
        createdAt: bid.createdAt.toISOString(),
        contractor: contractor
          ? {
              id: contractor.id,
              businessName: contractor.businessName,
              displayName: contractor.displayName,
              profilePhoto: contractor.profilePhoto,
              avgRating: contractor.avgRating,
              completedJobs: contractor.completedJobs,
              responseRate: contractor.responseRate,
              specialties: contractor.specialties,
              hourlyRate: contractor.hourlyRate != null ? Number(contractor.hourlyRate) : null,
              yearsExperience: contractor.yearsExperience,
              user: contractor.user,
            }
          : null,
      };
    })
  );

  // Get escrow hold if job is completed
  let escrowHold: {
    id: string;
    amount: string;
    releaseAt: string;
    status: string;
  } | null = null;
  let assignedContractor: {
    id: string;
    businessName: string;
    displayName: string | null;
    profilePhoto: string | null;
    avgRating: number | null;
    completedJobs: number;
    responseRate: number;
    specialties: string[];
    hourlyRate: number | null;
    yearsExperience: number | null;
    user: {
      id: string;
      name: string | null;
      image: string | null;
      email: string;
    } | null;
  } | null = null;

  if (workOrder.status === 'completed' && workOrder.contractorId) {
    const hold = await prisma.jobGuaranteeHold.findFirst({
      where: {
        jobId: id,
        status: 'held',
      },
    });

    if (hold) {
      escrowHold = {
        id: hold.id,
        amount: hold.amount.toString(),
        releaseAt: hold.releaseAt.toISOString(),
        status: hold.status,
      };
    }

    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: workOrder.contractorId },
      select: {
        id: true,
        businessName: true,
        displayName: true,
        profilePhoto: true,
        avgRating: true,
        completedJobs: true,
        responseRate: true,
        specialties: true,
        hourlyRate: true,
        yearsExperience: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    if (contractor) {
      assignedContractor = {
        id: contractor.id,
        businessName: contractor.businessName,
        displayName: contractor.displayName,
        profilePhoto: contractor.profilePhoto,
        avgRating: contractor.avgRating,
        completedJobs: contractor.completedJobs,
        responseRate: contractor.responseRate,
        specialties: contractor.specialties,
        hourlyRate: contractor.hourlyRate != null ? Number(contractor.hourlyRate) : null,
        yearsExperience: contractor.yearsExperience,
        user: contractor.user,
      };
    }
  }

  return (
    <JobDetailClient
      workOrder={{
        id: workOrder.id,
        title: workOrder.title,
        description: workOrder.description,
        category: workOrder.category,
        status: workOrder.status,
        priority: workOrder.priority,
        budgetMin: workOrder.budgetMin != null ? workOrder.budgetMin.toString() : null,
        budgetMax: workOrder.budgetMax != null ? workOrder.budgetMax.toString() : null,
        agreedPrice: workOrder.agreedPrice != null ? workOrder.agreedPrice.toString() : null,
        scheduledDate: workOrder.scheduledDate ? workOrder.scheduledDate.toISOString() : null,
        completedAt: workOrder.completedAt ? workOrder.completedAt.toISOString() : null,
        contractorId: workOrder.contractorId,
        images: workOrder.images,
        createdAt: workOrder.createdAt.toISOString(),
        bids: bidsWithContractors,
      }}
      currentUser={{
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image ?? null,
      }}
      escrowHold={escrowHold}
      assignedContractor={assignedContractor}
    />
  );
}
