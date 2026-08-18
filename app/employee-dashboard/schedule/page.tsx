import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import ScheduleClient from './schedule-client';

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { id: true, contractorId: true },
  });

  if (!employee) redirect('/employee-start');

  // Get shifts for the current week (Mon-Sun)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const db = prisma as any;

  // Fetch shifts for this week
  const shifts = await db.contractorShift.findMany({
    where: {
      employeeId: employee.id,
      contractorId: employee.contractorId,
      date: { gte: weekStart, lt: weekEnd },
    },
    include: {
      job: { select: { id: true, title: true, jobNumber: true, address: true, city: true, state: true } },
    },
    orderBy: { date: 'asc' },
  }).catch(() => []);

  // Fetch assigned jobs (regardless of shift — shows all active jobs)
  const assignedJobs = await db.contractorJob.findMany({
    where: {
      contractorId: employee.contractorId,
      assignedEmployeeIds: { has: employee.id },
      status: { in: ['scheduled', 'in_progress'] },
    },
    select: {
      id: true,
      title: true,
      jobNumber: true,
      address: true,
      city: true,
      state: true,
      estimatedStartDate: true,
      estimatedHours: true,
      status: true,
    },
    orderBy: { estimatedStartDate: 'asc' },
    take: 20,
  }).catch(() => []);

  return (
    <ScheduleClient
      weekStart={weekStart.toISOString()}
      shifts={shifts.map((s: any) => ({
        id: s.id,
        date: s.date.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        notes: s.notes,
        job: s.job ? {
          id: s.job.id,
          title: s.job.title,
          jobNumber: s.job.jobNumber,
          address: [s.job.address, s.job.city, s.job.state].filter(Boolean).join(', '),
        } : null,
      }))}
      assignedJobs={assignedJobs.map((j: any) => ({
        id: j.id,
        title: j.title,
        jobNumber: j.jobNumber,
        address: [j.address, j.city, j.state].filter(Boolean).join(', '),
        estimatedStartDate: j.estimatedStartDate?.toISOString() || null,
        estimatedHours: j.estimatedHours,
        status: j.status,
      }))}
    />
  );
}
