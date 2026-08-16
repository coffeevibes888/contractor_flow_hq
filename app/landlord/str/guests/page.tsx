import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Users, Mail, Phone, Calendar, Star, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Guests | Short-Term Rentals',
};

export default async function GuestsPage() {
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

  // Fetch guests (placeholder - will work once schema is migrated)
  const guests: any[] = [];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600 mb-1">Guests</h1>
        <p className="text-sm text-gray-600">
          Manage your guest profiles and history
        </p>
      </div>

      {/* Guests List */}
      {guests.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Guests Yet
          </h3>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Guest profiles are automatically created when you add bookings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guests.map((guest) => (
            <Link
              key={guest.id}
              href={`/landlord/str/guests/${guest.id}`}
              className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all"
            >
              {/* Guest Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {guest.name}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{guest.email}</span>
                    </div>
                    {guest.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{guest.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                {guest.avgRating > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{guest.avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Bookings</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {guest.totalBookings}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Total Spent</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(Number(guest.totalSpent))}
                  </div>
                </div>
              </div>

              {guest.isBlocked && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    Blocked
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
