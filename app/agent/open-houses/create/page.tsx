import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import CreateOpenHouseClient from './create-open-house-client';

export default async function CreateOpenHousePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'agent') {
    return redirect('/');
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: session.user.id },
    include: {
      listings: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          address: true,
        },
      },
    },
  });

  if (!agent) {
    return redirect('/onboarding/agent');
  }

  return <CreateOpenHouseClient agentId={agent.id} listings={agent.listings} />;
}
