export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { JobApplyClient } from './job-apply-client';

export const metadata = {
  title: 'Apply for Job',
};

export default async function JobApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/jobs/${id}/apply`);
  }

  const job = await prisma.jobPosting.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      companyName: true,
      status: true,
    },
  });

  if (!job) notFound();

  if (job.status !== 'active') {
    redirect(`/jobs/${id}`);
  }

  // If already submitted (not draft), send them to their dashboard
  const existing = await prisma.jobApplicant.findFirst({
    where: { jobId: id, userId: session.user.id },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== 'draft' && existing.status !== 'withdrawn') {
    redirect('/user/dashboard/jobs');
  }

  return (
    <JobApplyClient
      jobId={job.id}
      jobTitle={job.title}
      companyName={job.companyName}
    />
  );
}
