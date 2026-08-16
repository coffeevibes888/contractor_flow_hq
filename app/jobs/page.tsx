import { Metadata } from 'next';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import JobBoard from './job-board';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Jobs | Property Flow HQ',
  description: 'Find jobs in real estate, property management, contracting, and more. Post jobs or create your profile to get hired.',
};

interface SearchParams {
  view?: string;
  category?: string;
  type?: string;
  q?: string;
  location?: string;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  const initialView = (params.view === 'seekers' ? 'seekers' : 'jobs') as 'jobs' | 'seekers';

  // Fetch initial job postings
  const jobs = await prisma.jobPosting.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 24,
    include: {
      _count: { select: { applicants: true } },
    },
  });

  // Fetch job seeker count
  const seekerCount = await prisma.jobSeekerProfile.count({
    where: { isPublic: true, isAvailable: true },
  });

  // Serialize for client
  const serializedJobs = jobs.map((job) => ({
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
    experienceLevel: job.experienceLevel,
    requirements: job.requirements,
    benefits: job.benefits,
    views: job.views,
    applicantCount: job._count.applicants,
    createdAt: job.createdAt.toISOString(),
  }));

  return (
    <JobBoard
      initialView={initialView}
      initialJobs={serializedJobs}
      seekerCount={seekerCount}
      jobCount={jobs.length}
      isAuthenticated={!!session?.user}
      userRole={session?.user?.role || 'user'}
      searchParams={params}
    />
  );
}
