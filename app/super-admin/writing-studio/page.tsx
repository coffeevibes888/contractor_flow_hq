import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import WritingStudio from './writing-studio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Writing Studio',
};

export default async function WritingStudioPage() {
  const session = await auth();

  if (!session) {
    return redirect('/sign-in');
  }

  if (session.user?.role !== 'superAdmin') {
    return redirect('/unauthorized');
  }

  return <WritingStudio />;
}
