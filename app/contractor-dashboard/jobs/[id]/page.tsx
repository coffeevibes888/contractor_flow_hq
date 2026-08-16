import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { JobDetailsTabs } from './job-details-tabs';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Job Details | Contractor Dashboard',
};

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const { id } = await params;

  // Get contractor profile (works for owners and employees)
  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    subscriptionTier: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  // Fetch job with all related data
  const job = await prisma.contractorJob.findFirst({
    where: {
      id,
      contractorId: contractorProfile.id,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      timeEntries: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { clockIn: 'desc' },
      },
      expenses: {
        orderBy: { expenseDate: 'desc' },
      },
      changeOrders: {
        orderBy: { createdAt: 'desc' },
      },
      jobMilestones: {
        orderBy: { order: 'asc' },
      },
      jobNotes: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      jobPhotos: {
        orderBy: { takenAt: 'desc' },
      },
    },
  });

  if (!job) {
    notFound();
  }

  // Get assigned employees details
  const assignedEmployees = await prisma.contractorEmployee.findMany({
    where: {
      id: { in: job.assignedEmployeeIds },
      contractorId: contractorProfile.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      photo: true,
      role: true,
    },
  });

  // Serialize dates for client component
  const serializedJob = {
    ...job,
    estimatedStartDate: job.estimatedStartDate?.toISOString() || null,
    estimatedEndDate: job.estimatedEndDate?.toISOString() || null,
    actualStartDate: job.actualStartDate?.toISOString() || null,
    actualEndDate: job.actualEndDate?.toISOString() || null,
    reviewedAt: job.reviewedAt?.toISOString() || null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    timeEntries: job.timeEntries.map((entry) => ({
      ...entry,
      clockIn: entry.clockIn.toISOString(),
      clockOut: entry.clockOut?.toISOString() || null,
      approvedAt: entry.approvedAt?.toISOString() || null,
    })),
    expenses: job.expenses.map((expense) => ({
      ...expense,
      expenseDate: expense.expenseDate.toISOString(),
      approvedAt: expense.approvedAt?.toISOString() || null,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    })),
    changeOrders: job.changeOrders.map((co) => ({
      ...co,
      approvedAt: co.approvedAt?.toISOString() || null,
      createdAt: co.createdAt.toISOString(),
      updatedAt: co.updatedAt.toISOString(),
    })),
    jobMilestones: job.jobMilestones.map((milestone) => ({
      ...milestone,
      completedAt: milestone.completedAt?.toISOString() || null,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
    })),
    jobNotes: job.jobNotes.map((note) => ({
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
    jobPhotos: (job.jobPhotos ?? []).map((photo: any) => ({
      id: photo.id,
      url: photo.url,
      thumbnail: photo.thumbnail ?? null,
      caption: photo.caption ?? null,
      category: photo.category,
      visibleToCustomer: Boolean(photo.visibleToCustomer),
      takenAt: photo.takenAt.toISOString(),
      tags: photo.tags ?? [],
    })),
  };

  return (
    <div className='w-full'>
      <JobDetailsTabs
        job={serializedJob}
        assignedEmployees={assignedEmployees}
        contractorId={contractorProfile.id}
        subscriptionTier={contractorProfile.subscriptionTier || 'starter'}
      />
    </div>
  );
}
