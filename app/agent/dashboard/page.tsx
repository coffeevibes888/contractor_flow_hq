import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import AgentDashboardClient from './agent-dashboard-client';

export default async function AgentDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'agent') {
    return redirect('/');
  }

  // Get agent profile with stats
  const agent = await prisma.agent.findUnique({
    where: { userId: session.user.id },
    include: {
      listings: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      leads: {
        where: { status: { in: ['new', 'contacted', 'qualified'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      openHouses: {
        where: { date: { gte: new Date() } },
        orderBy: { date: 'asc' },
        take: 3,
        include: { listing: true },
      },
      _count: {
        select: {
          listings: true,
          leads: true,
          openHouses: true,
        },
      },
    },
  });

  if (!agent) {
    return redirect('/onboarding/agent');
  }

  // Calculate stats
  const activeListings = await prisma.agentListing.count({
    where: { agentId: agent.id, status: 'active' },
  });

  const pendingListings = await prisma.agentListing.count({
    where: { agentId: agent.id, status: 'pending' },
  });

  const soldListings = await prisma.agentListing.count({
    where: { agentId: agent.id, status: 'sold' },
  });

  const newLeads = await prisma.agentLead.count({
    where: { agentId: agent.id, status: 'new' },
  });

  return (
    <AgentDashboardClient
      agent={agent}
      stats={{
        activeListings,
        pendingListings,
        soldListings,
        newLeads,
        totalListings: agent._count.listings,
        totalLeads: agent._count.leads,
      }}
    />
  );
}
