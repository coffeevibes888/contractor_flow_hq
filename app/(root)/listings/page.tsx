import { Metadata } from 'next';
import { prisma } from '@/db/prisma';
import { unstable_cache } from 'next/cache';
import ListingsClient from './listings-client';
import JsonLdScript from '@/components/seo/json-ld-script';
import { canonicalUrl, listingsDirectoryLd, breadcrumbLd } from '@/lib/seo';

type ListingsPageSearchParams = {
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
  type?: string;
  city?: string;
  q?: string;
  view?: string;
  listingType?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListingsPageSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const city = params.city && params.city !== 'all' ? params.city : null;
  const listingType = params.listingType;
  const bedrooms = params.bedrooms && params.bedrooms !== 'any' ? params.bedrooms : null;

  const locationLabel = city ? ` in ${city}` : '';
  const bedroomLabel = bedrooms
    ? bedrooms === '0' ? 'Studio ' : bedrooms === '4+' ? '4+ Bedroom ' : `${bedrooms} Bedroom `
    : '';
  const typeLabel =
    listingType === 'sale' ? 'Homes for Sale'
    : listingType === 'rent' ? `${bedroomLabel}Apartments & Rentals`
    : `${bedroomLabel}Apartments, Rooms & Homes for Rent`;

  const title = `${typeLabel}${locationLabel || ' Near You'} | Property Flow HQ`;
  const description = city
    ? `Browse available ${typeLabel.toLowerCase()}${locationLabel}. Filter by price, bedrooms, bathrooms, and more. Find your next home today on Property Flow HQ.`
    : `Browse ${typeLabel.toLowerCase()}. Search by city, price, bedrooms, and property type. No fees to search. Find your next home on Property Flow HQ.`;

  const canonical = canonicalUrl('/listings');

  // Build comprehensive keywords for search engine discovery
  const keywords: string[] = [
    'apartments for rent',
    'rooms for rent',
    'homes for rent',
    'homes for sale',
    'rental properties',
    'property listings',
    'real estate',
    'find apartments',
    'rent a house',
    '1 bedroom apartment',
    '2 bedroom apartment',
    '3 bedroom apartment',
    'studio apartment',
    'cheap apartments',
    'apartments near me',
  ];
  if (city) {
    keywords.push(
      `apartments for rent in ${city}`,
      `homes for rent in ${city}`,
      `${city} rentals`,
      `${city} apartments`,
      `cheap apartments in ${city}`,
      `2 bedroom apartments in ${city}`,
      `studios in ${city}`,
    );
  }
  if (bedrooms) {
    const bedLabel = bedrooms === '0' ? 'studio' : `${bedrooms} bedroom`;
    keywords.push(
      `${bedLabel} apartments for rent`,
      `${bedLabel} homes`,
      city ? `${bedLabel} apartments in ${city}` : `${bedLabel} apartments near me`,
    );
  }

  return {
    title,
    description,
    alternates: { canonical },
    keywords,
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'Property Flow HQ',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// Cache filter options for 5 minutes (cities, price ranges)
const getCachedFilterOptions = unstable_cache(
  async () => {
    const [allUnits, allAgentListings] = await Promise.all([
      prisma.unit.findMany({
        where: {
          isAvailable: true,
          property: {
            status: 'active',
            isPublished: true,
            landlord: {
              ownerUserId: { not: null },
            },
          },
        },
        include: { property: { select: { address: true } } },
      }),
      prisma.agentListing.findMany({
        where: { status: 'active' },
        select: { address: true, price: true },
      }),
    ]);

    const citiesFromUnits = allUnits.map(u => (u.property.address as any)?.city).filter(Boolean);
    const citiesFromAgents = allAgentListings.map(l => (l.address as any)?.city).filter(Boolean);
    const cities = [...new Set([...citiesFromUnits, ...citiesFromAgents])].sort();

    const unitPrices = allUnits.map(u => Number(u.rentAmount)).filter(p => p > 0);
    const agentPrices = allAgentListings.map(l => Number((l as any).price)).filter(p => p > 0);
    const allPrices = [...unitPrices, ...agentPrices];
    const minPriceVal = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const maxPriceVal = allPrices.length > 0 ? Math.max(...allPrices) : 5000000;

    return { cities, minPrice: minPriceVal, maxPrice: maxPriceVal };
  },
  ['listings-filter-options'],
  { revalidate: 300 }
);

async function getListings(searchParams: {
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
  type?: string;
  city?: string;
  q?: string;
  listingType?: string; // 'all', 'rent', 'sale'
}) {
  const { minPrice, maxPrice, bedrooms, bathrooms, type, city, q, listingType } = searchParams;

  // Build where clause for units (rental properties from landlords)
  const unitWhere: any = {
    isAvailable: true,
  };

  if (minPrice) {
    unitWhere.rentAmount = { ...unitWhere.rentAmount, gte: parseFloat(minPrice) };
  }
  if (maxPrice) {
    unitWhere.rentAmount = { ...unitWhere.rentAmount, lte: parseFloat(maxPrice) };
  }
  if (bedrooms && bedrooms !== 'any') {
    if (bedrooms === '4+') {
      unitWhere.bedrooms = { gte: 4 };
    } else {
      unitWhere.bedrooms = parseInt(bedrooms);
    }
  }
  if (bathrooms && bathrooms !== 'any') {
    if (bathrooms === '3+') {
      unitWhere.bathrooms = { gte: 3 };
    } else {
      unitWhere.bathrooms = parseFloat(bathrooms);
    }
  }
  if (type && type !== 'all') {
    unitWhere.type = type;
  }

  // Build where clause for agent listings
  const agentListingWhere: any = {
    status: 'active',
  };

  if (listingType && listingType !== 'all') {
    agentListingWhere.listingType = listingType === 'sale' ? 'sale' : 'rent';
  }

  if (minPrice) {
    agentListingWhere.price = { ...agentListingWhere.price, gte: parseFloat(minPrice) };
  }
  if (maxPrice) {
    agentListingWhere.price = { ...agentListingWhere.price, lte: parseFloat(maxPrice) };
  }
  if (bedrooms && bedrooms !== 'any') {
    if (bedrooms === '4+') {
      agentListingWhere.bedrooms = { gte: 4 };
    } else {
      agentListingWhere.bedrooms = parseInt(bedrooms);
    }
  }
  if (bathrooms && bathrooms !== 'any') {
    if (bathrooms === '3+') {
      agentListingWhere.bathrooms = { gte: 3 };
    } else {
      agentListingWhere.bathrooms = parseFloat(bathrooms);
    }
  }

  // Get available units with property info (only if showing rentals or all)
  let rentalListings: any[] = [];
  if (!listingType || listingType === 'all' || listingType === 'rent') {
    const units = await prisma.unit.findMany({
      where: {
        ...unitWhere,
        property: {
          status: 'active',
          isPublished: true,
          landlord: {
            ownerUserId: { not: null },
          },
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            address: true,
            type: true,
            videoUrl: true,
            virtualTourUrl: true,
            landlord: {
              select: {
                id: true,
                name: true,
                companyName: true,
                subdomain: true,
              },
            },
            // Fetch ALL units of this property so we can aggregate images
            // regardless of which individual units are available
            units: {
              select: { images: true },
            },
          },
        },
      },
      orderBy: { rentAmount: 'asc' },
    });

    let filteredUnits = units;
    
    if (city && city !== 'all') {
      filteredUnits = filteredUnits.filter(unit => {
        const address = unit.property.address as any;
        return address?.city?.toLowerCase().includes(city.toLowerCase());
      });
    }

    if (q) {
      const query = q.toLowerCase();
      // Detect if the query looks like a price (e.g. "$1,500", "1500", "$2000")
      const priceMatch = q.match(/^\$?([\d,]+)$/);
      if (priceMatch) {
        const priceValue = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (!isNaN(priceValue) && priceValue > 0) {
          // Treat as a max price filter with a ±20% range for flexibility
          const lowerBound = Math.max(0, priceValue * 0.8);
          const upperBound = priceValue * 1.2;
          filteredUnits = filteredUnits.filter(unit => {
            const rent = Number(unit.rentAmount);
            return rent >= lowerBound && rent <= upperBound;
          });
        }
      } else {
        filteredUnits = filteredUnits.filter(unit => {
          const address = unit.property.address as any;
          return (
            unit.property.name.toLowerCase().includes(query) ||
            unit.name.toLowerCase().includes(query) ||
            address?.city?.toLowerCase().includes(query) ||
            address?.state?.toLowerCase().includes(query) ||
            address?.street?.toLowerCase().includes(query) ||
            unit.property.description?.toLowerCase().includes(query) ||
            (unit.type && unit.type.toLowerCase().includes(query)) ||
            (unit.bedrooms != null && query.match(/(\d+)\s*(?:bed|br|bedroom)/i) && unit.bedrooms === parseInt(query.match(/(\d+)\s*(?:bed|br|bedroom)/i)![1]))
          );
        });
      }
    }

    // Transform rental units to listing format
    // Group units by property for apartment complexes (type === 'apartment' with multiple units)
    const unitsByProperty = new Map<string, typeof filteredUnits>();
    
    filteredUnits.forEach(unit => {
      const propertyId = unit.property.id;
      if (!unitsByProperty.has(propertyId)) {
        unitsByProperty.set(propertyId, []);
      }
      unitsByProperty.get(propertyId)!.push(unit);
    });

    rentalListings = [];
    
    unitsByProperty.forEach((propertyUnits, propertyId) => {
      const firstUnit = propertyUnits[0];
      const property = firstUnit.property;
      const address = property.address as any;
      const isApartmentComplex = property.type === 'apartment' && propertyUnits.length > 3;

      // Collect images across ALL units of the property (not just available ones)
      // so occupied/unavailable units' photos still appear on the listing card
      const allPropertyImages = Array.from(
        new Set(
          (property.units as { images: string[] }[])
            .flatMap(u => u.images || [])
            .filter(Boolean)
        )
      );
      
      if (isApartmentComplex) {
        // For apartment complexes, create a single listing with aggregated data
        const prices = propertyUnits.map(u => Number(u.rentAmount)).filter(p => p > 0);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const bedrooms = propertyUnits.map(u => u.bedrooms || 0);
        const minBeds = Math.min(...bedrooms);
        const maxBeds = Math.max(...bedrooms);
        
        rentalListings.push({
          id: propertyId, // Use property ID for complex
          propertyId: property.id,
          propertyName: property.name,
          propertySlug: property.slug,
          unitName: null,
          type: 'apartment',
          bedrooms: minBeds === maxBeds ? minBeds : null, // null indicates range
          bedroomRange: minBeds !== maxBeds ? { min: minBeds, max: maxBeds } : null,
          bathrooms: null,
          sizeSqFt: null,
          price: minPrice,
          priceRange: minPrice !== maxPrice ? { min: minPrice, max: maxPrice } : null,
          rentAmount: minPrice,
          images: allPropertyImages,
          amenities: [...new Set(propertyUnits.flatMap(u => u.amenities || []))],
          availableFrom: null,
          address: {
            street: address?.street || '',
            city: address?.city || '',
            state: address?.state || '',
            zip: address?.zip || '',
            lat: address?.lat || null,
            lng: address?.lng || null,
          },
          landlord: property.landlord ? {
            name: property.landlord.companyName || property.landlord.name,
            subdomain: property.landlord.subdomain,
          } : null,
          agent: null,
          hasVideo: !!property.videoUrl,
          hasVirtualTour: !!property.virtualTourUrl,
          listingType: 'rent' as const,
          source: 'property' as const,
          isApartmentComplex: true,
          unitCount: propertyUnits.length,
        });
      } else {
        // For regular properties, list each unit separately
        propertyUnits.forEach(unit => {
          // Fall back to any image from the property if this unit has none
          const unitImages = unit.images?.length ? unit.images : allPropertyImages;
          rentalListings.push({
            id: unit.id,
            propertyId: property.id,
            propertyName: property.name,
            propertySlug: property.slug,
            unitName: unit.name,
            type: unit.type,
            bedrooms: unit.bedrooms,
            bedroomRange: null,
            bathrooms: unit.bathrooms ? Number(unit.bathrooms) : null,
            sizeSqFt: unit.sizeSqFt,
            price: Number(unit.rentAmount),
            priceRange: null,
            rentAmount: Number(unit.rentAmount),
            images: unitImages,
            amenities: unit.amenities,
            availableFrom: unit.availableFrom?.toISOString() || null,
            address: {
              street: address?.street || '',
              city: address?.city || '',
              state: address?.state || '',
              zip: address?.zip || '',
              lat: address?.lat || null,
              lng: address?.lng || null,
            },
            landlord: property.landlord ? {
              name: property.landlord.companyName || property.landlord.name,
              subdomain: property.landlord.subdomain,
            } : null,
            agent: null,
            hasVideo: !!property.videoUrl,
            hasVirtualTour: !!property.virtualTourUrl,
            listingType: 'rent' as const,
            source: 'property' as const,
            isApartmentComplex: false,
            unitCount: 1,
          });
        });
      }
    });
  }

  // Get agent listings (for sale or rent)
  let agentListings: any[] = [];
  if (!listingType || listingType === 'all' || listingType === 'sale') {
    const agentListingsRaw = await prisma.agentListing.findMany({
      where: agentListingWhere,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            brokerage: true,
            user: {
              select: { image: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let filteredAgentListings = agentListingsRaw;

    if (city && city !== 'all') {
      filteredAgentListings = filteredAgentListings.filter(listing => {
        const address = listing.address as any;
        return address?.city?.toLowerCase().includes(city.toLowerCase());
      });
    }

    if (q) {
      const query = q.toLowerCase();
      // Detect if the query looks like a price (e.g. "$1,500", "1500", "$2000")
      const priceMatch = q.match(/^\$?([\d,]+)$/);
      if (priceMatch) {
        const priceValue = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (!isNaN(priceValue) && priceValue > 0) {
          const lowerBound = Math.max(0, priceValue * 0.8);
          const upperBound = priceValue * 1.2;
          filteredAgentListings = filteredAgentListings.filter(listing => {
            const price = Number((listing as any).price);
            return price >= lowerBound && price <= upperBound;
          });
        }
      } else {
        filteredAgentListings = filteredAgentListings.filter(listing => {
          const address = listing.address as any;
          return (
            listing.title.toLowerCase().includes(query) ||
            address?.city?.toLowerCase().includes(query) ||
            address?.state?.toLowerCase().includes(query) ||
            address?.street?.toLowerCase().includes(query) ||
            listing.description?.toLowerCase().includes(query)
          );
        });
      }
    }

    // Transform agent listings to common format
    agentListings = filteredAgentListings.map(listing => {
      const address = listing.address as any;
      return {
        id: listing.id,
        propertyId: null,
        propertyName: listing.title,
        propertySlug: listing.slug,
        unitName: null,
        type: listing.propertyType,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms ? Number(listing.bathrooms) : null,
        sizeSqFt: listing.sizeSqFt,
        price: Number(listing.price),
        rentAmount: listing.listingType === 'rent' ? Number(listing.price) : null,
        images: listing.images,
        amenities: listing.features || [],
        availableFrom: null,
        address: {
          street: address?.street || '',
          city: address?.city || '',
          state: address?.state || '',
          zip: address?.zip || '',
          lat: address?.lat || null,
          lng: address?.lng || null,
        },
        landlord: null,
        agent: listing.agent ? {
          id: listing.agent.id,
          name: listing.agent.name,
          subdomain: listing.agent.subdomain,
          brokerage: listing.agent.brokerage,
          image: listing.agent.user?.image,
        } : null,
        hasVideo: !!listing.videoUrl,
        hasVirtualTour: !!listing.virtualTourUrl,
        listingType: listing.listingType as 'sale' | 'rent',
        source: 'agent' as const,
      };
    });
  }

  // Combine and sort all listings
  const allListings = [...rentalListings, ...agentListings].sort((a, b) => a.price - b.price);

  // Use cached filter options
  const filters = await getCachedFilterOptions();

  return {
    listings: allListings,
    filters,
    total: allListings.length,
  };
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingsPageSearchParams>;
}) {
  const params = await searchParams;
  const data = await getListings(params);

  // Build ItemList JSON-LD so Google understands this is a property directory
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.propertyflowhq.com';
  const listingItems = data.listings.map((l: any) => {
    const isAgent = l.source === 'agent';
    const url = isAgent
      ? `${baseUrl}/${l.agent?.subdomain}/listings/${l.propertySlug}`
      : `${baseUrl}/${l.landlord?.subdomain}/properties/${l.propertySlug}`;

    // Build a plain-text description from price + location so Google has
    // meaningful snippet text for each ListItem even when no description exists.
    const cityState = [l.address?.city, l.address?.state].filter(Boolean).join(', ');
    const bedLabel = l.bedrooms != null ? `${l.bedrooms === 0 ? 'Studio' : `${l.bedrooms}BR`}` : null;
    const priceLabel = l.price > 0
      ? (l.listingType === 'sale' ? `$${Math.round(l.price).toLocaleString('en-US')}` : `$${Math.round(l.price).toLocaleString('en-US')}/mo`)
      : null;
    const descParts = [bedLabel, cityState ? `in ${cityState}` : null, priceLabel].filter(Boolean);
    const description = descParts.length ? descParts.join(' ') : null;

    return {
      url,
      name: l.propertyName,
      description,
      image: l.images?.[0] || null,
      price: l.price,
      city: l.address?.city || null,
      state: l.address?.state || null,
    };
  });

  const city = params.city && params.city !== 'all' ? params.city : null;
  const directoryTitle = city
    ? `Apartments & Homes for Rent in ${city}`
    : 'Apartments, Rooms & Homes for Rent';
  const directoryDescription = city
    ? `Browse ${data.total} available rentals in ${city} on Property Flow HQ.`
    : `Browse ${data.total} available apartments, rooms, and homes for rent on Property Flow HQ.`;

  const ldData = [
    // CollectionPage signals to Google this is a browsable directory
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: directoryTitle,
      description: directoryDescription,
      url: canonicalUrl('/listings'),
      isPartOf: {
        '@type': 'WebSite',
        name: 'PropertyFlow HQ',
        url: 'https://www.propertyflowhq.com',
      },
    },
    listingsDirectoryLd({
      url: canonicalUrl('/listings'),
      name: directoryTitle,
      description: directoryDescription,
      items: listingItems,
    }),
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Listings', path: '/listings' },
      ...(city ? [{ name: city, path: `/listings/${city.toLowerCase().replace(/\s+/g, '-')}` }] : []),
    ]),
    // Individual RealEstateListing structured data for top listings (max 10 for performance)
    ...data.listings.slice(0, 10).map((l: any) => {
      const isAgent = l.source === 'agent';
      const url = isAgent
        ? `${baseUrl}/${l.agent?.subdomain}/listings/${l.propertySlug}`
        : `${baseUrl}/${l.landlord?.subdomain}/properties/${l.propertySlug}`;
      const cityState = [l.address?.city, l.address?.state].filter(Boolean).join(', ');

      const listing: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: l.propertyName,
        url,
        datePosted: new Date().toISOString().split('T')[0],
      };

      if (l.images?.[0]) listing.image = l.images[0];
      if (l.address?.city) listing.contentLocation = {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          streetAddress: l.address.street || undefined,
          addressLocality: l.address.city,
          addressRegion: l.address.state || undefined,
          postalCode: l.address.zip || undefined,
          addressCountry: 'US',
        },
        ...(l.address.lat && l.address.lng ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: l.address.lat,
            longitude: l.address.lng,
          },
        } : {}),
      };

      // Attach an Offer (price)
      if (l.price > 0) {
        listing.offers = {
          '@type': 'Offer',
          price: l.price,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          ...(l.listingType === 'rent' ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: l.price,
              priceCurrency: 'USD',
              unitText: 'MONTH',
            },
          } : {}),
        };
      }

      // Description with bedrooms/bathrooms/sqft
      const parts: string[] = [];
      if (l.bedrooms != null) parts.push(l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} bedroom`);
      if (l.bathrooms != null) parts.push(`${l.bathrooms} bathroom`);
      if (l.sizeSqFt) parts.push(`${l.sizeSqFt} sq ft`);
      if (cityState) parts.push(cityState);
      if (l.listingType === 'rent' && l.price > 0) parts.push(`$${Math.round(l.price).toLocaleString('en-US')}/month`);
      if (parts.length) listing.description = parts.join(' · ');

      return listing;
    }),
  ];

  return (
    <>
      <JsonLdScript data={ldData} id="listings-directory-ld" />
      <ListingsClient initialData={data} searchParams={params} />
    </>
  );
}
