import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import EmployeeStartClient from './employee-start-client';

export const metadata: Metadata = {
  title: 'Join Your Team — Contractor Flow HQ',
  description:
    'Create your free employee account. Clock in/out with GPS, view your schedule, submit time-off requests, and communicate with your team — all from your phone.',
  alternates: { canonical: 'https://www.contractorflowhq.com/team-start' },
  openGraph: {
    title: 'Join Your Team — Employee Portal | Contractor Flow HQ',
    description:
      'Clock in, view schedule, request time off, and manage your work — free for all team members.',
    url: 'https://www.contractorflowhq.com/team-start',
  },
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function EmployeeStartPage() {
  const session = await auth();

  // Already linked employees go straight to their dashboard
  if (session?.user?.role === 'contractor_employee') {
    redirect('/employee-dashboard');
  }

  return <EmployeeStartClient />;
}
