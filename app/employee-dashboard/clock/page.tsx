import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import ClockClient from './clock-client';

export default async function ClockPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      contractorId: true,
      contractor: { select: { businessName: true } },
    },
  });

  if (!employee) redirect('/employee-start');

  // Get active time entry (if clocked in)
  const activeEntry = await prisma.contractorTimeEntry.findFirst({
    where: {
      employeeId: employee.id,
      contractorId: employee.contractorId,
      clockOut: null,
    },
    select: {
      id: true,
      clockIn: true,
      clockInLocation: true,
      breakMinutes: true,
      jobId: true,
      notes: true,
    },
    orderBy: { clockIn: 'desc' },
  });

  // Get today's assigned jobs for the job selector
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const db = prisma as any;
  const todayJobs = await db.contractorJob.findMany({
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
    },
    take: 20,
    orderBy: { estimatedStartDate: 'asc' },
  }).catch(() => []);

  // Get today's time entries for history
  const todayEntries = await prisma.contractorTimeEntry.findMany({
    where: {
      employeeId: employee.id,
      contractorId: employee.contractorId,
      clockIn: { gte: today },
      clockOut: { not: null },
    },
    select: {
      id: true,
      clockIn: true,
      clockOut: true,
      breakMinutes: true,
      notes: true,
      jobId: true,
    },
    orderBy: { clockIn: 'desc' },
  });

  return (
    <ClockClient
      employeeId={employee.id}
      contractorId={employee.contractorId}
      activeEntry={activeEntry ? {
        id: activeEntry.id,
        clockIn: activeEntry.clockIn.toISOString(),
        clockInLocation: activeEntry.clockInLocation as any,
        breakMinutes: activeEntry.breakMinutes,
        jobId: activeEntry.jobId,
        notes: activeEntry.notes,
      } : null}
      todayJobs={todayJobs}
      todayEntries={todayEntries.map((e: any) => ({
        id: e.id,
        clockIn: e.clockIn.toISOString(),
        clockOut: e.clockOut?.toISOString() || null,
        breakMinutes: e.breakMinutes,
        notes: e.notes,
        jobId: e.jobId,
      }))}
    />
  );
}
