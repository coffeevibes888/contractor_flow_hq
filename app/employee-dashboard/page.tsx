import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import EmployeeDashboardHome from './dashboard-home';

export default async function EmployeeDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  // Fetch employee data for the dashboard
  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      contractorId: true,
      hireDate: true,
      contractor: {
        select: { businessName: true },
      },
    },
  });

  if (!employee) redirect('/employee-start');

  // Get today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [todayShifts, activeTimeEntry, upcomingTimeOff, unreadMessages] = await Promise.all([
    // Today's shifts
    (prisma as any).contractorShift.count({
      where: {
        employeeId: employee.id,
        contractorId: employee.contractorId,
        date: { gte: today, lt: tomorrow },
        status: 'scheduled',
      },
    }).catch(() => 0),

    // Active clock-in (no clock out yet)
    prisma.contractorTimeEntry.findFirst({
      where: {
        employeeId: employee.id,
        contractorId: employee.contractorId,
        clockOut: null,
      },
      select: { id: true, clockIn: true, jobId: true },
      orderBy: { clockIn: 'desc' },
    }).catch(() => null),

    // Pending time-off requests
    (prisma as any).contractorTimeOff.count({
      where: {
        employeeId: employee.id,
        status: 'pending',
      },
    }).catch(() => 0),

    // Unread messages (placeholder — will be wired in messaging phase)
    0,
  ]);

  return (
    <EmployeeDashboardHome
      employee={{
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        companyName: employee.contractor.businessName,
        hireDate: employee.hireDate.toISOString(),
      }}
      stats={{
        todayShifts,
        isClockedIn: !!activeTimeEntry,
        clockedInSince: activeTimeEntry?.clockIn?.toISOString() || null,
        pendingTimeOff: upcomingTimeOff,
        unreadMessages,
      }}
    />
  );
}
