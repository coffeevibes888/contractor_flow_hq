import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, Edit, Calendar, DollarSign, Users, Bed, Bath, 
  MapPin, Home, Star, TrendingUp, Sparkles 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Property Details | Short-Term Rentals',
};

export default async function PropertyDetailsPage({ params }: { params: { id: string } }) {
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

  // Fetch property (placeholder - will work once schema is migrated)
  const property: any = null;

  if (!property) {
    notFound();
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/landlord/str/properties"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-blue-600 mb-1">{property.name}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>
                {property.address?.street}, {property.address?.city}, {property.address?.state}
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/landlord/str/properties/${property.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit Property
        </Link>
      </div>

      {/* Images */}
      {property.images && property.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {property.images.slice(0, 6).map((image: string, index: number) => (
            <div key={index} className="relative h-64 rounded-xl overflow-hidden">
              <Image
                src={image}
                alt={`${property.name} - Image ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-black font-medium">Total Bookings</span>
            <Calendar className="h-4 w-4 text-black" />
          </div>
          <div className="text-2xl font-bold text-black">{property._count?.bookings || 0}</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-black font-medium">Avg Rating</span>
            <Star className="h-4 w-4 text-black" />
          </div>
          <div className="text-2xl font-bold text-black">
            {property.avgRating ? property.avgRating.toFixed(1) : 'N/A'}
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-black font-medium">Base Price</span>
            <DollarSign className="h-4 w-4 text-black" />
          </div>
          <div className="text-2xl font-bold text-black">
            {formatCurrency(Number(property.basePrice))}
          </div>
          <div className="text-xs text-black/70">per night</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-black font-medium">Status</span>
            <Home className="h-4 w-4 text-black" />
          </div>
          <div className="text-lg font-bold text-black">
            {property.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Property Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-black bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {property.description || 'No description provided.'}
            </p>
          </div>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="rounded-xl border border-black bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {property.amenities.map((amenity: string) => (
                  <div key={amenity} className="flex items-center gap-2 text-sm text-gray-700">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span className="capitalize">{amenity.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* House Rules */}
          {property.houseRules && (
            <div className="rounded-xl border border-black bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">House Rules</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{property.houseRules}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <div className="rounded-xl border border-black bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Type</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {property.propertyType.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bedrooms</span>
                <span className="text-sm font-medium text-gray-900">{property.bedrooms}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bathrooms</span>
                <span className="text-sm font-medium text-gray-900">{property.bathrooms}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Beds</span>
                <span className="text-sm font-medium text-gray-900">{property.beds}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Max Guests</span>
                <span className="text-sm font-medium text-gray-900">{property.maxGuests}</span>
              </div>
              {property.sizeSqFt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Size</span>
                  <span className="text-sm font-medium text-gray-900">{property.sizeSqFt} sq ft</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-black bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Base Price</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(Number(property.basePrice))}/night
                </span>
              </div>
              {property.weekendPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Weekend Price</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(Number(property.weekendPrice))}/night
                  </span>
                </div>
              )}
              {property.cleaningFee && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cleaning Fee</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(Number(property.cleaningFee))}
                  </span>
                </div>
              )}
              {property.securityDeposit && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Security Deposit</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(Number(property.securityDeposit))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Booking Rules */}
          <div className="rounded-xl border border-black bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Rules</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Check-in</span>
                <span className="text-sm font-medium text-gray-900">{property.checkInTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Check-out</span>
                <span className="text-sm font-medium text-gray-900">{property.checkOutTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Min Stay</span>
                <span className="text-sm font-medium text-gray-900">{property.minStay} nights</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cancellation</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {property.cancellationPolicy}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Instant Booking</span>
                <span className="text-sm font-medium text-gray-900">
                  {property.instantBooking ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Link
              href={`/landlord/str/calendar?property=${property.id}`}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              View Calendar
            </Link>
            <Link
              href={`/landlord/str/bookings/new?property=${property.id}`}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Add Booking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
