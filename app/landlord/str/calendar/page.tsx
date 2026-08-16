import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import STRCalendar from '@/components/landlord/str/calendar-view';

export const metadata: Metadata = {
  title: 'Calendar | Short-Term Rentals',
};

export default async function CalendarPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
  });

  if (!landlord) {
    redirect('/onboarding/landlord');
  }

  // Fetch properties for filter (placeholder - will work once schema is migrated)
  const properties: any[] = [];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600 mb-1">Calendar</h1>
        <p className="text-sm text-gray-600">
          View availability and manage bookings across all properties
        </p>
      </div>

      {/* Calendar Component */}
      <STRCalendar properties={properties} />
    </div>
  );
}
