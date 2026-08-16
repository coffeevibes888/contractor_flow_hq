import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { detectSubdomainEntity } from '@/lib/utils/subdomain-detection';
import PublicListingDetail from './public-listing-detail';
import JsonLdScript from '@/components/seo/json-ld-script';
import {
  canonicalUrl,
  buildAgentListingTitle,
  buildAgentListingDescription,
  agentListingLd,
  breadcrumbLd,
} from '@/lib/seo';

interface PublicListingPageProps {
  params: Promise<{ subdomain: string; id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PublicListingPageProps): Promise<Metadata> {
  const { subdomain, id } = await params;

  const entity = await detectSubdomainEntity(subdomain);
  if (entity.type !== 'agent') {
    return { title: 'Not Found' };
  }

  const isUuid = UUID_RE.test(id);
  const listing = await prisma.agentListing.findFirst({
    where: {
      ...(isUuid ? { id } : { slug: id }),
      agentId: entity.data.id,
      status: { in: ['active', 'pending'] },
    },
    select: {
      title: true,
      description: true,
      address: true,
      images: true,
      slug: true,
      bedrooms: true,
      bathrooms: true,
      propertyType: true,
      listingType: true,
      price: true,
      sizeSqFt: true,
    },
  });

  if (!listing) return { title: 'Listing Not Found' };

  const address = listing.address as any;
  const city = address?.city || null;
  const state = address?.state || null;

  // Always canonical to slug-based URL on the apex host
  const canonicalSlug = listing.slug || id;
  const canonical = canonicalUrl(`/${subdomain}/listings/${canonicalSlug}`);

  const title = buildAgentListingTitle({
    title: listing.title,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms != null ? Number(listing.bathrooms) : null,
    propertyType: listing.propertyType,
    listingType: listing.listingType,
    city,
    state,
    price: Number(listing.price),
  });
  const description = buildAgentListingDescription({
    title: listing.title,
    description: listing.description,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms != null ? Number(listing.bathrooms) : null,
    sizeSqFt: listing.sizeSqFt,
    city,
    state,
    price: Number(listing.price),
    listingType: listing.listingType,
  });

  const ogImage = listing.images?.[0];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName: 'Property Flow HQ',
      images: ogImage ? [{ url: ogImage, alt: listing.title }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: ogImage ? [ogImage] : undefined },
  };
}

export default async function PublicListingPage({ params }: PublicListingPageProps) {
  const { subdomain, id } = await params;

  // Verify this is an agent subdomain
  const entity = await detectSubdomainEntity(subdomain);
  if (entity.type !== 'agent') {
    notFound();
  }

  const agent = entity.data;

  // The URL param could be a slug or a UUID
  const isUuid = UUID_RE.test(id);

  // Fetch the listing by id or slug
  const listing = await prisma.agentListing.findFirst({
    where: {
      ...(isUuid ? { id } : { slug: id }),
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
      },
    },
  });

  if (!listing) {
    notFound();
  }

  // Get similar listings from same agent
  const similarListings = await prisma.agentListing.findMany({
    where: {
      agentId: agent.id,
      id: { not: listing.id },
      status: 'active',
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  // ── SEO: structured data + breadcrumbs ───────────────────────────────────
  const address = listing.address as any;
  const canonicalSlug = listing.slug || listing.id;
  const listingCanonical = canonicalUrl(`/${subdomain}/listings/${canonicalSlug}`);
  const agentCanonical = canonicalUrl(`/${subdomain}`);

  const ldData: object[] = [
    agentListingLd({
      url: listingCanonical,
      title: listing.title,
      description: listing.description,
      propertyType: listing.propertyType,
      listingType: listing.listingType,
      street: address?.street || null,
      city: address?.city || null,
      state: address?.state || null,
      zip: address?.zip || null,
      lat: typeof address?.lat === 'number' ? address.lat : null,
      lng: typeof address?.lng === 'number' ? address.lng : null,
      images: listing.images || [],
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms != null ? Number(listing.bathrooms) : null,
      sizeSqFt: listing.sizeSqFt,
      yearBuilt: listing.yearBuilt,
      price: Number(listing.price),
      agentName: agent.name,
      agentUrl: agentCanonical,
      brokerage: agent.brokerage,
    }),
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: agent.name, path: `/${subdomain}` },
      { name: 'Listings', path: `/${subdomain}/listings` },
      { name: listing.title, path: `/${subdomain}/listings/${canonicalSlug}` },
    ]),
  ];

  return (
    <>
      <JsonLdScript data={ldData} id="agent-listing-ld" />
      <PublicListingDetail
        listing={listing}
        agent={agent}
        openHouses={listing.openHouses}
        similarListings={similarListings}
        subdomain={subdomain}
      />
    </>
  );
}
