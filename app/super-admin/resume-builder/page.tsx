import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ResumeBuilderClient from './resume-builder-client';

export default async function ResumeBuilderPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'superAdmin') {
    redirect('/');
  }

  return <ResumeBuilderClient />;
}
