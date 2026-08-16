import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { EmployeeSchedulePage } from '@/components/employee/employee-schedule-page';
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns';

export default async function SchedulePage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Find team member
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id, status: 'active' },
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

  // Get shifts for current and next week
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const twoWeeksEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 0 });

  const shifts = await prisma.shift.findMany({
    where: {
      teamMemberId: teamMember.id,
      date: { gte: weekStart, lte: twoWeeksEnd },
    },
    orderBy: { date: 'asc' },
    include: {
      property: { select: { name: true } },
    },
  });

  // Get availability
  const availability = await prisma.teamMemberAvailability.findMany({
    where: { teamMemberId: teamMember.id },
    orderBy: { dayOfWeek: 'asc' },
  });

  return (
    <EmployeeSchedulePage
      shifts={shifts.map(s => ({
        id: s.id,
        date: s.date.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        notes: s.notes,
        propertyName: s.property?.name,
      }))}
      availability={availability.map(a => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable,
      }))}
    />
  );
}
