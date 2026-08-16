export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { JobDetailView } from './job-detail-view';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.jobPosting.findUnique({ where: { id }, select: { title: true, companyName: true, location: true } });
  if (!job) return { title: 'Job Not Found' };
  return {
    title: `${job.title} at ${job.companyName || 'Company'} | Jobs`,
    description: `${job.title} in ${job.location}. Apply now on Property Flow HQ.`,
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const job = await prisma.jobPosting.findUnique({
    where: { id },
    include: {
      _count: { select: { applicants: true, reviews: true } },
      reviews: {
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!job) notFound();

  // Increment views
  await prisma.jobPosting.update({ where: { id }, data: { views: { increment: 1 } } });

  // Check if user already applied
  let hasApplied = false;
  if (session?.user?.id) {
    const existing = await prisma.jobApplicant.findFirst({
      where: { jobId: id, userId: session.user.id },
    });
    hasApplied = !!existing;
  }

  const serialized = {
    id: job.id,
    title: job.title,
    description: job.description,
    type: job.type,
    category: job.category,
    location: job.location,
    isRemote: job.isRemote,
    salary: job.salary,
    salaryMin: job.salaryMin?.toString() || null,
    salaryMax: job.salaryMax?.toString() || null,
    salaryType: job.salaryType,
    companyName: job.companyName,
    companyLogo: job.companyLogo,
    companyAbout: job.companyAbout,
    experienceLevel: job.experienceLevel,
    requirements: job.requirements,
    benefits: job.benefits,
    views: job.views,
    applicantCount: job._count.applicants,
    reviewCount: job._count.reviews,
    reviews: job.reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      review: r.review,
      pros: r.pros,
      cons: r.cons,
      isAnonymous: r.isAnonymous,
      createdAt: r.createdAt.toISOString(),
    })),
    createdAt: job.createdAt.toISOString(),
  };

  return (
    <JobDetailView
      job={serialized}
      isAuthenticated={!!session?.user}
      hasApplied={hasApplied}
    />
  );
}
