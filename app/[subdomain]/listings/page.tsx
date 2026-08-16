import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { detectSubdomainEntity } from '@/lib/utils/subdomain-detection';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Bath, Square, Home, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgentListingsPageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: AgentListingsPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const entity = await detectSubdomainEntity(subdomain);
  
  if (entity.type !== 'agent') {
    return { title: 'Not Found' };
  }

  const agentName = entity.data.companyName || entity.data.name;
  
  return {
    title: `All Listings | ${agentName}`,
    description: `Browse all available properties from ${agentName}. Find your perfect home today.`,
  };
}

export default async function AgentListingsPage({ params }: AgentListingsPageProps) {
  const { subdomain } = await params;

  // Verify this is an agent subdomain
  const entity = await detectSubdomainEntity(subdomain);
  if (entity.type !== 'agent') {
    notFound();
  }

  const agent = entity.data;

  // Get all active listings
  const listings = await prisma.agentListing.findMany({
    where: {
      agentId: agent.id,
      status: { in: ['active', 'pending'] },
    },
    include: {
      openHouses: {
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        orderBy: { date: 'asc' },
        take: 1,
      },
    },
    orderBy: [
      { isFeatured: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  // Get upcoming open houses
  const upcomingOpenHouses = await prisma.agentOpenHouse.findMany({
    where: {
      agentId: agent.id,
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          images: true,
          address: true,
          price: true,
        },
      },
    },
    orderBy: { date: 'asc' },
    take: 5,
  });

  const brandName = agent.companyName || agent.name;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {agent.logoUrl && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100">
                  <Image src={agent.logoUrl} alt={brandName} fill className="object-contain p-1" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{brandName}</h1>
                <p className="text-slate-600">
                  {listings.length} Active {listings.length === 1 ? 'Listing' : 'Listings'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agent.companyPhone && (
                <Button asChild variant="outline">
                  <a href={`tel:${agent.companyPhone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </a>
                </Button>
              )}
              {agent.user?.email && (
                <Button asChild variant="outline">
                  <a href={`mailto:${agent.user.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Upcoming Open Houses */}
        {upcomingOpenHouses.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-amber-600" />
              Upcoming Open Houses
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingOpenHouses.map((oh) => {
                const address = oh.listing.address as any;
                return (
                  <Link
                    key={oh.id}
                    href={`/${subdomain}/listings/${oh.listing.id}`}
                    className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="text-center bg-amber-100 rounded-lg p-3 min-w-[70px]">
                      <p className="text-xs text-amber-600 font-semibold uppercase">
                        {new Date(oh.date).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-2xl font-bold text-amber-700">
                        {new Date(oh.date).getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 line-clamp-1">
                        {oh.listing.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {address?.city}, {address?.state}
                      </p>
                      <p className="text-sm text-amber-600 font-medium">
                        {oh.startTime} - {oh.endTime}
                      </p>
                      {oh.isVirtual && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Virtual Available
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* All Listings */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            All Listings
          </h2>
          
          {listings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => {
                const address = listing.address as any;
                const hasOpenHouse = listing.openHouses.length > 0;

                return (
                  <Link
                    key={listing.id}
                    href={`/${subdomain}/listings/${listing.id}`}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
                  >
                    <div className="relative aspect-[4/3]">
                      {listing.images?.[0] ? (
                        <Image
                          src={listing.images[0]}
                          alt={listing.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                          <Home className="h-12 w-12 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge className="bg-amber-600 text-white">
                          For {listing.listingType === 'sale' ? 'Sale' : 'Rent'}
                        </Badge>
                        {hasOpenHouse && (
                          <Badge className="bg-emerald-600 text-white">
                            <Calendar className="h-3 w-3 mr-1" />
                            Open House
                          </Badge>
                        )}
                      </div>
                      {listing.isFeatured && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-violet-600 text-white">Featured</Badge>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(Number(listing.price))}
                          {listing.listingType === 'rent' && (
                            <span className="text-sm font-normal">/mo</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
                        <MapPin className="h-3 w-3" />
                        {address?.city}, {address?.state} {address?.zip}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        {listing.bedrooms !== null && (
                          <span className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {listing.bedrooms} bd
                          </span>
                        )}
                        {listing.bathrooms !== null && (
                          <span className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            {Number(listing.bathrooms)} ba
                          </span>
                        )}
                        {listing.sizeSqFt && (
                          <span className="flex items-center gap-1">
                            <Square className="h-4 w-4" />
                            {listing.sizeSqFt.toLocaleString()} sqft
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <Home className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Active Listings</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {brandName} currently doesn&apos;t have any active listings. Check back soon for new properties.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
