import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Home, Plus, MapPin, Bed, Users, DollarSign, Calendar, Edit, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Properties | Short-Term Rentals',
};

export default async function PropertiesPage() {
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

  // Fetch properties (placeholder - will work once schema is migrated)
  const properties: any[] = [];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 mb-1">Properties</h1>
          <p className="text-sm text-gray-600">
            Manage your short-term rental listings
          </p>
        </div>
        <Link
          href="/landlord/str/properties/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Link>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Properties Yet
          </h3>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Add your first short-term rental property to start managing bookings and tracking revenue.
          </p>
          <Link
            href="/landlord/str/properties/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Add Your First Property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div
              key={property.id}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-200">
                {property.images && property.images[0] ? (
                  <Image
                    src={property.images[0]}
                    alt={property.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Home className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      property.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {property.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">
                  {property.name}
                </h3>

                {/* Address */}
                <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">
                    {property.address?.street}, {property.address?.city}, {property.address?.state}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Bed className="h-4 w-4" />
                    <span>{property.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{property.maxGuests} guests</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{property._count?.bookings || 0} bookings</span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(Number(property.basePrice))}
                    </div>
                    <div className="text-xs text-gray-500">per night</div>
                  </div>
                  {property.listedOn && property.listedOn.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {property.listedOn.map((platform: string) => (
                        <span
                          key={platform}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/landlord/str/properties/${property.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                  <Link
                    href={`/landlord/str/properties/${property.id}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
