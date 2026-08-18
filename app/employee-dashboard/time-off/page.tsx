import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import TimeOffClient from './time-off-client';

export default async function TimeOffPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { id: true, contractorId: true, firstName: true, lastName: true },
  });

  if (!employee) redirect('/team-start');

  const db = prisma as any;

  // Fetch all time-off requests for this employee
  const requests = await db.contractorTimeOff.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => []);

  return (
    <TimeOffClient
      employeeId={employee.id}
      contractorId={employee.contractorId}
      requests={requests.map((r: any) => ({
        id: r.id,
        type: r.type,
        startDate: r.startDate?.toISOString() || r.createdAt.toISOString(),
        endDate: r.endDate?.toISOString() || r.createdAt.toISOString(),
        hours: r.hours ? Number(r.hours) : null,
        reason: r.reason,
        status: r.status,
        reviewedAt: r.reviewedAt?.toISOString() || null,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
