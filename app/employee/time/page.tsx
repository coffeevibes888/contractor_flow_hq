import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { TimeClockPage } from '@/components/employee/time-clock-page';

export default async function TimePage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Find team member
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id, status: 'active' },
    include: {
      landlord: { select: { id: true, companyName: true } },
    },
  });

  if (!teamMember) {
    // Return a helpful message instead of redirecting
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Not a Team Member</h1>
        <p className="text-slate-400 mb-6">
          You don&apos;t have an active team membership. Please contact your employer to be added as a team member.
        </p>
        <a href="/" className="text-emerald-400 hover:underline">
          Return to Home
        </a>
      </div>
    );
  }

  // Get active time entry
  const activeEntry = await prisma.timeEntry.findFirst({
    where: { teamMemberId: teamMember.id, clockOut: null },
    include: { property: { select: { name: true } } },
  });

  // Get today's entries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEntries = await prisma.timeEntry.findMany({
    where: {
      teamMemberId: teamMember.id,
      clockIn: { gte: today, lt: tomorrow },
    },
    orderBy: { clockIn: 'desc' },
    include: { property: { select: { name: true } } },
  });

  // Get this week's entries
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const weekEntries = await prisma.timeEntry.findMany({
    where: {
      teamMemberId: teamMember.id,
      clockIn: { gte: weekStart },
      clockOut: { not: null },
    },
    orderBy: { clockIn: 'desc' },
  });

  // Calculate weekly hours
  const weeklyMinutes = weekEntries.reduce((sum, e) => sum + (e.totalMinutes || 0), 0);

  // Get today's shift
  const todayShift = await prisma.shift.findFirst({
    where: {
      teamMemberId: teamMember.id,
      date: { gte: today, lt: tomorrow },
      status: 'scheduled',
    },
    include: { property: { select: { name: true } } },
  });

  // Get properties for location selection
  const properties = await prisma.property.findMany({
    where: { landlordId: teamMember.landlordId },
    select: { id: true, name: true },
  });

  return (
    <TimeClockPage
      teamMemberId={teamMember.id}
      companyName={teamMember.landlord.companyName || 'Company'}
      activeEntry={activeEntry ? {
        id: activeEntry.id,
        clockIn: activeEntry.clockIn.toISOString(),
        breakMinutes: activeEntry.breakMinutes,
        propertyName: activeEntry.property?.name,
        notes: activeEntry.notes,
      } : null}
      todayEntries={todayEntries.map(e => ({
        id: e.id,
        clockIn: e.clockIn.toISOString(),
        clockOut: e.clockOut?.toISOString() || null,
        breakMinutes: e.breakMinutes,
        totalMinutes: e.totalMinutes,
        propertyName: e.property?.name,
      }))}
      weeklyMinutes={weeklyMinutes}
      todayShift={todayShift ? {
        id: todayShift.id,
        startTime: todayShift.startTime,
        endTime: todayShift.endTime,
        propertyName: todayShift.property?.name,
      } : null}
      properties={properties}
    />
  );
}
