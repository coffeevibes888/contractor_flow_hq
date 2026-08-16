import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import { canonicalUrl } from '@/lib/seo';

/**
 * City-specific listings page: /listings/las-vegas, /listings/chicago, etc.
 * Redirects to /listings?city=<CityName> with a canonical set on the redirect target.
 *
 * This gives Google indexable, clean URLs like:
 *   /listings/las-vegas  →  "Apartments for Rent in Las Vegas"
 *   /listings/chicago    →  "Apartments for Rent in Chicago"
 *
 * We redirect rather than duplicate content.
 * The canonical on /listings already points here.
 */

interface CityPageProps {
  params: Promise<{ city: string }>;
}

function slugToCity(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const cityName = slugToCity(citySlug);

  // Verify at least one listing exists for this city
  const hasListings = await prisma.unit.findFirst({
    where: {
      isAvailable: true,
      property: {
        status: { not: 'deleted' },
        address: { path: ['city'], string_contains: cityName },
      },
    },
    select: { id: true },
  }).catch(() => null);

  if (!hasListings) {
    return { title: 'Listings Not Found' };
  }

  const title = `Apartments & Homes for Rent in ${cityName} | Property Flow HQ`;
  const description = `Browse available apartments, rooms, and homes for rent in ${cityName}. Filter by price, bedrooms, and more. Find your next home today.`;
  const canonical = canonicalUrl(`/listings/${citySlug}`);

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `apartments for rent in ${cityName}`,
      `rooms for rent in ${cityName}`,
      `homes for rent in ${cityName}`,
      `${cityName} rentals`,
      `${cityName} apartments`,
      `${cityName} real estate`,
    ],
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

export default async function CityListingsPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;
  const cityName = slugToCity(citySlug);

  // Verify city has listings before redirecting
  const hasListings = await prisma.unit.findFirst({
    where: {
      isAvailable: true,
      property: {
        status: { not: 'deleted' },
        address: { path: ['city'], string_contains: cityName },
      },
    },
    select: { id: true },
  }).catch(() => null);

  if (!hasListings) {
    notFound();
  }

  // Redirect to the filtered listings page
  redirect(`/listings?city=${encodeURIComponent(cityName)}`);
}
