import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { TimeOffPage } from '@/components/employee/time-off-page';

export default async function TimeOffRequestPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Find team member
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id, status: 'active' },
  });

  if (!teamMember) {
    redirect('/');
  }

  // Get all time off requests
  const requests = await prisma.timeOffRequest.findMany({
    where: { teamMemberId: teamMember.id },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewedBy: { select: { name: true } },
    },
  });

  return (
    <TimeOffPage
      requests={requests.map(r => ({
        id: r.id,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        reason: r.reason,
        status: r.status,
        reviewedBy: r.reviewedBy?.name,
        reviewedAt: r.reviewedAt?.toISOString(),
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
