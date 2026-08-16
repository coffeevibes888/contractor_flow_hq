import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import CreateListingClient from './create-listing-client';

export default async function CreateListingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'agent') {
    return redirect('/');
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: session.user.id },
  });

  if (!agent) {
    return redirect('/onboarding/agent');
  }

  return <CreateListingClient agentId={agent.id} />;
}
