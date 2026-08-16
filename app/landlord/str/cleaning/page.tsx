import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Plus, Sparkles, Calendar, MapPin, User, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'Cleaning Schedule | Short-Term Rentals',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

export default async function CleaningPage() {
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

  // Fetch cleanings (placeholder - will work once schema is migrated)
  const cleanings: any[] = [];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 mb-1">Cleaning Schedule</h1>
          <p className="text-sm text-gray-600">
            Manage cleaning schedules between guest stays
          </p>
        </div>
        <Link
          href="/landlord/str/calendar"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Calendar className="h-4 w-4" />
          View Calendar
        </Link>
      </div>

      {/* Cleanings List */}
      {cleanings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Cleanings Scheduled
          </h3>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Cleanings are automatically scheduled when you add bookings.
          </p>
          <Link
            href="/landlord/str/bookings/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Add Booking
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cleanings.map((cleaning) => (
            <div
              key={cleaning.id}
              className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {cleaning.rental.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[cleaning.status]}`}>
                      {cleaning.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{cleaning.rental.address?.city}, {cleaning.rental.address?.state}</span>
                  </div>
                </div>
                {cleaning.status === 'scheduled' && (
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Complete
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(cleaning.scheduledDate), 'MMM d, yyyy')}
                    {cleaning.scheduledTime && ` at ${cleaning.scheduledTime}`}
                  </span>
                </div>
                {cleaning.assignedTo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{cleaning.assignedTo}</span>
                  </div>
                )}
                {cleaning.booking && (
                  <div className="text-sm text-gray-600">
                    Booking: {cleaning.booking.confirmationCode}
                  </div>
                )}
              </div>

              {cleaning.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{cleaning.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
