import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import AgentListingsClient from './agent-listings-client';

export default async function AgentListingsPage() {
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

  const listings = await prisma.agentListing.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
  });

  return <AgentListingsClient listings={listings} />;
}
