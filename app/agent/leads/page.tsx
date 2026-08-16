import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import AgentLeadsClient from './agent-leads-client';

export default async function AgentLeadsPage() {
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

  const leads = await prisma.agentLead.findMany({
    where: { agentId: agent.id },
    include: {
      listing: {
        select: { title: true, address: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <AgentLeadsClient leads={leads} />;
}
