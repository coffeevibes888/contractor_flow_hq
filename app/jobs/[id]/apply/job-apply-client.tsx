'use client';

import { useRouter } from 'next/navigation';
import { JobApplicationWizard } from '@/components/jobs/application-wizard';

interface Props {
  jobId: string;
  jobTitle: string;
  companyName: string | null;
}

export function JobApplyClient({ jobId, jobTitle, companyName }: Props) {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <JobApplicationWizard
        jobId={jobId}
        jobTitle={jobTitle}
        companyName={companyName}
        onComplete={() => router.push('/user/dashboard/jobs')}
        onCancel={() => router.push(`/jobs/${jobId}`)}
      />
    </main>
  );
}
