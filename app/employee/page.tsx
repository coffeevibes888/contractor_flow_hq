import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { EmployeeDashboard } from '@/components/employee/employee-dashboard';

export default async function EmployeePage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Find team member record for current user
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id, status: 'active' },
    include: {
      landlord: { select: { id: true, companyName: true } },
      user: { select: { name: true, email: true, image: true } },
    },
  });

  if (!teamMember) {
    redirect('/');
  }

  // Get upcoming shifts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingShifts = await prisma.shift.findMany({
    where: {
      teamMemberId: teamMember.id,
      date: { gte: today },
      status: { in: ['scheduled'] },
    },
    orderBy: { date: 'asc' },
    take: 5,
  });

  // Get today's time entries
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayTimeEntries = await prisma.timeEntry.findMany({
    where: {
      teamMemberId: teamMember.id,
      clockIn: { gte: today, lt: tomorrow },
    },
    orderBy: { clockIn: 'asc' },
  });

  // Get active time entry (clocked in but not out)
  const activeEntry = await prisma.timeEntry.findFirst({
    where: { teamMemberId: teamMember.id, clockOut: null },
  });

  // Get pending time off requests
  const pendingTimeOff = await prisma.timeOffRequest.findMany({
    where: { teamMemberId: teamMember.id, status: 'pending' },
    orderBy: { startDate: 'asc' },
  });

  return (
    <EmployeeDashboard
      employee={{
        id: teamMember.id,
        userId: teamMember.userId!,
        name: teamMember.user?.name || 'Unknown',
        email: teamMember.user?.email || '',
        image: teamMember.user?.image || undefined,
        role: teamMember.role,
      }}
      company={{
        id: teamMember.landlord.id,
        name: teamMember.landlord.companyName || 'Company',
      }}
      upcomingShifts={upcomingShifts.map(s => ({
        id: s.id,
        date: s.date.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        notes: s.notes || undefined,
      }))}
      todayTimeEntries={todayTimeEntries.map(e => ({
        id: e.id,
        clockIn: e.clockIn.toISOString(),
        clockOut: e.clockOut?.toISOString() || null,
      }))}
      pendingTimeOff={pendingTimeOff.map(r => ({
        id: r.id,
        type: 'time-off',
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        status: r.status,
      }))}
      isClockedIn={!!activeEntry}
      activeTimeEntryId={activeEntry?.id}
    />
  );
}
