/**
 * JSON-LD structured data builders.
 *
 * Schema choices follow Google's documented rich-result types:
 *  - LocalBusiness / HomeAndConstructionBusiness for contractors
 *  - RealEstateAgent for agent profiles
 *  - ApartmentComplex / Apartment / SingleFamilyResidence for landlord rentals
 *  - Residence + offers for agent listings (sale or rent)
 *  - BreadcrumbList on every detail page
 *  - AggregateRating + Review where data is available
 *
 * All builders return plain JS objects — call JSON.stringify in the rendering
 * component (json-ld-script.tsx) so we get a single, properly escaped <script>.
 */

import { canonicalUrl } from './canonical';

type JsonLd = Record<string, any>;

// ─── shared ──────────────────────────────────────────────────────────────────

function omitNullish<T extends JsonLd>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out as T;
}

function postalAddress(args: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): JsonLd | undefined {
  if (!args.street && !args.city && !args.state && !args.zip) return undefined;
  return omitNullish({
    '@type': 'PostalAddress',
    streetAddress: args.street || undefined,
    addressLocality: args.city || undefined,
    addressRegion: args.state || undefined,
    postalCode: args.zip || undefined,
    addressCountry: 'US',
  });
}

function geoCoordinates(lat?: number | null, lng?: number | null): JsonLd | undefined {
  if (lat == null || lng == null) return undefined;
  return {
    '@type': 'GeoCoordinates',
    latitude: lat,
    longitude: lng,
  };
}

function aggregateRating(rating?: number | null, count?: number | null): JsonLd | undefined {
  if (!rating || !count || count <= 0) return undefined;
  return {
    '@type': 'AggregateRating',
    ratingValue: Number(rating.toFixed(1)),
    reviewCount: count,
    bestRating: 5,
    worstRating: 1,
  };
}

// ─── contractor ──────────────────────────────────────────────────────────────

export interface ContractorLdInput {
  id: string;
  url: string; // canonical URL
  businessName: string;
  displayName?: string | null;
  tagline?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  profilePhoto?: string | null;
  heroImages?: string[] | null;
  portfolioImages?: string[] | null;
  baseCity?: string | null;
  baseState?: string | null;
  serviceAreas?: string[] | null;
  serviceRadius?: number | null;
  specialties?: string[] | null;
  yearsExperience?: number | null;
  hourlyRate?: number | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  insuranceVerified?: boolean | null;
  avgRating?: number | null;
  totalReviews?: number | null;
}

/**
 * Returns a HomeAndConstructionBusiness (a LocalBusiness subtype) describing
 * a contractor. This is the schema Google maps to "service provider" rich
 * results in Search and to Maps pack alignment when paired with GBP.
 */
export function contractorLd(input: ContractorLdInput): JsonLd {
  const image = [input.profilePhoto, input.logoUrl, ...(input.heroImages || []), ...(input.portfolioImages || [])]
    .filter((s): s is string => !!s)
    .slice(0, 6);

  const services = (input.specialties || []).map((s) => ({
    '@type': 'Service',
    name: s,
    provider: { '@id': input.url },
    areaServed: input.serviceAreas?.length
      ? input.serviceAreas.map((a) => ({ '@type': 'Place', name: a }))
      : input.baseCity
      ? { '@type': 'Place', name: `${input.baseCity}${input.baseState ? `, ${input.baseState}` : ''}` }
      : undefined,
  }));

  return omitNullish({
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': input.url,
    name: input.displayName || input.businessName,
    legalName: input.businessName,
    description: input.tagline || input.bio || undefined,
    url: input.url,
    image: image.length ? image : undefined,
    logo: input.logoUrl || undefined,
    telephone: input.phone || undefined,
    email: input.email || undefined,
    address: postalAddress({ city: input.baseCity, state: input.baseState }),
    areaServed: input.serviceAreas?.length
      ? input.serviceAreas.map((a) => ({ '@type': 'Place', name: a }))
      : undefined,
    knowsAbout: input.specialties?.length ? input.specialties : undefined,
    makesOffer: services.length ? services : undefined,
    aggregateRating: aggregateRating(input.avgRating, input.totalReviews),
    priceRange: input.hourlyRate ? `$${Math.round(input.hourlyRate)}/hr` : undefined,
    hasCredential:
      input.licenseNumber || input.licenseState || input.insuranceVerified
        ? omitNullish({
            '@type': 'EducationalOccupationalCredential',
            credentialCategory: 'Contractor License',
            identifier: input.licenseNumber || undefined,
            recognizedBy: input.licenseState
              ? { '@type': 'GovernmentOrganization', name: `State of ${input.licenseState}` }
              : undefined,
          })
        : undefined,
  });
}

// ─── agent (RealEstateAgent profile) ─────────────────────────────────────────

export interface AgentLdInput {
  id: string;
  url: string;
  name: string;
  brokerage?: string | null;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
  city?: string | null;
  state?: string | null;
  serviceAreas?: string[] | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  totalSales?: number | null;
  totalListings?: number | null;
  yearsExperience?: number | null;
  bio?: string | null;
}

export function agentLd(input: AgentLdInput): JsonLd {
  return omitNullish({
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': input.url,
    name: input.name,
    url: input.url,
    image: input.image || undefined,
    telephone: input.phone || undefined,
    email: input.email || undefined,
    description: input.bio || undefined,
    worksFor: input.brokerage ? { '@type': 'Organization', name: input.brokerage } : undefined,
    address: postalAddress({ city: input.city, state: input.state }),
    areaServed: input.serviceAreas?.length
      ? input.serviceAreas.map((a) => ({ '@type': 'Place', name: a }))
      : undefined,
    hasCredential:
      input.licenseNumber || input.licenseState
        ? {
            '@type': 'EducationalOccupationalCredential',
            credentialCategory: 'Real Estate License',
            identifier: input.licenseNumber || undefined,
          }
        : undefined,
  });
}

// ─── landlord (Organization profile + ItemList of available properties) ────

export interface LandlordLdInput {
  id: string;
  url: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  logo?: string | null;
  image?: string | null;
  address?: string | null;
}

export function landlordLd(input: LandlordLdInput): JsonLd {
  return omitNullish({
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': input.url,
    name: input.name,
    url: input.url,
    image: input.image || undefined,
    logo: input.logo || undefined,
    telephone: input.phone || undefined,
    email: input.email || undefined,
    address: input.address ? { '@type': 'PostalAddress', streetAddress: input.address, addressCountry: 'US' } : undefined,
  });
}

// ─── property (rental, landlord-owned) ────────────────────────────────────────

export interface PropertyUnitLdInput {
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeSqFt?: number | null;
  rentAmount?: number | null;
  isAvailable?: boolean | null;
}

export interface PropertyLdInput {
  url: string;
  name: string;
  description?: string | null;
  propertyType?: string | null; // 'apartment' | 'house' | etc.
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  images?: string[] | null;
  units: PropertyUnitLdInput[];
  landlordName?: string | null;
  landlordUrl?: string | null;
  /** Canonical URL for the rental application (e.g. /{slug}/apply) */
  applyUrl?: string | null;
}

/**
 * Builds an ApartmentComplex / SingleFamilyResidence-style entity
 * with `containsPlace` (per-unit) and `offers` (rent prices).
 *
 * Google indexes these as residential listings. We use ApartmentComplex
 * for multi-unit and SingleFamilyResidence/Apartment for single-unit cases.
 */
export function propertyLd(input: PropertyLdInput): JsonLd {
  const isComplex = (input.propertyType === 'apartment') && input.units.length > 1;
  const type = isComplex
    ? 'ApartmentComplex'
    : input.propertyType === 'house'
    ? 'SingleFamilyResidence'
    : 'Apartment';

  const offers = input.units
    .filter((u) => u.isAvailable !== false && u.rentAmount && u.rentAmount > 0)
    .map((u) =>
      omitNullish({
        '@type': 'Offer',
        price: Number(u.rentAmount),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        category: 'Rental',
        eligibleDuration: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
      }),
    );

  const containsPlace = input.units
    .filter((u) => u.bedrooms != null || u.bathrooms != null || u.rentAmount != null)
    .slice(0, 25)
    .map((u) =>
      omitNullish({
        '@type': 'Apartment',
        numberOfBedrooms: u.bedrooms ?? undefined,
        numberOfBathroomsTotal: u.bathrooms != null ? Number(u.bathrooms) : undefined,
        floorSize: u.sizeSqFt
          ? { '@type': 'QuantitativeValue', value: u.sizeSqFt, unitCode: 'FTK' }
          : undefined,
        offers: u.rentAmount
          ? omitNullish({
              '@type': 'Offer',
              price: Number(u.rentAmount),
              priceCurrency: 'USD',
              availability: u.isAvailable !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              category: 'Rental',
            })
          : undefined,
      }),
    );

  // Aggregate floor stats across units when available
  const beds = input.units.map((u) => u.bedrooms).filter((n): n is number => typeof n === 'number');
  const baths = input.units
    .map((u) => (u.bathrooms != null ? Number(u.bathrooms) : null))
    .filter((n): n is number => typeof n === 'number');
  const sqfts = input.units.map((u) => u.sizeSqFt).filter((n): n is number => typeof n === 'number' && n > 0);

  const numberOfBedrooms = beds.length === 1 ? beds[0] : undefined;
  const numberOfBathroomsTotal = baths.length === 1 ? baths[0] : undefined;
  const floorSize = sqfts.length === 1 ? { '@type': 'QuantitativeValue', value: sqfts[0], unitCode: 'FTK' } : undefined;

  const numberOfAvailableAccommodationUnits = isComplex
    ? input.units.filter((u) => u.isAvailable !== false).length
    : undefined;

  return omitNullish({
    '@context': 'https://schema.org',
    '@type': type,
    '@id': input.url,
    name: input.name,
    url: input.url,
    description: input.description || undefined,
    address: postalAddress({ street: input.street, city: input.city, state: input.state, zip: input.zip }),
    geo: geoCoordinates(input.lat, input.lng),
    image: input.images?.length ? input.images.slice(0, 8) : undefined,
    numberOfBedrooms,
    numberOfBathroomsTotal,
    floorSize,
    numberOfAvailableAccommodationUnits,
    containsPlace: isComplex && containsPlace.length ? containsPlace : undefined,
    offers: offers.length === 0 ? undefined : offers.length === 1 ? offers[0] : offers,
    // potentialAction lets Google surface a direct "Apply" sitelink in search results
    potentialAction: input.applyUrl
      ? {
          '@type': 'ApplyAction',
          name: 'Apply Online',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: input.applyUrl,
            actionPlatform: [
              'http://schema.org/DesktopWebPlatform',
              'http://schema.org/MobileWebPlatform',
            ],
          },
        }
      : undefined,
    provider: input.landlordUrl
      ? omitNullish({
          '@type': 'Organization',
          '@id': input.landlordUrl,
          name: input.landlordName || undefined,
          url: input.landlordUrl,
        })
      : undefined,
  });
}

// ─── agent listing (Residence + Offer) ───────────────────────────────────────

export interface AgentListingLdInput {
  url: string;
  title: string;
  description?: string | null;
  propertyType?: string | null;
  listingType?: string | null; // sale | rent | lease | auction
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  images?: string[] | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeSqFt?: number | null;
  yearBuilt?: number | null;
  price?: number | null;
  agentName?: string | null;
  agentUrl?: string | null;
  brokerage?: string | null;
}

export function agentListingLd(input: AgentListingLdInput): JsonLd {
  const lt = (input.listingType || 'sale').toLowerCase();
  const isRent = lt === 'rent' || lt === 'lease';

  // Pick the most specific schema type Google understands
  const type = (() => {
    switch ((input.propertyType || '').toLowerCase()) {
      case 'house':
      case 'single-family':
      case 'single_family':
        return 'SingleFamilyResidence';
      case 'condo':
      case 'townhouse':
      case 'apartment':
        return 'Apartment';
      default:
        return 'Residence';
    }
  })();

  const offer = input.price
    ? omitNullish({
        '@type': 'Offer',
        price: Number(input.price),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        category: isRent ? 'Rental' : 'ForSale',
        ...(isRent
          ? { eligibleDuration: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } }
          : {}),
        seller: input.agentUrl
          ? omitNullish({
              '@type': 'RealEstateAgent',
              '@id': input.agentUrl,
              name: input.agentName || undefined,
              url: input.agentUrl,
            })
          : undefined,
      })
    : undefined;

  return omitNullish({
    '@context': 'https://schema.org',
    '@type': type,
    '@id': input.url,
    name: input.title,
    url: input.url,
    description: input.description || undefined,
    image: input.images?.length ? input.images.slice(0, 8) : undefined,
    address: postalAddress({ street: input.street, city: input.city, state: input.state, zip: input.zip }),
    geo: geoCoordinates(input.lat, input.lng),
    numberOfBedrooms: input.bedrooms ?? undefined,
    numberOfBathroomsTotal: input.bathrooms != null ? Number(input.bathrooms) : undefined,
    floorSize: input.sizeSqFt
      ? { '@type': 'QuantitativeValue', value: input.sizeSqFt, unitCode: 'FTK' }
      : undefined,
    yearBuilt: input.yearBuilt ?? undefined,
    offers: offer,
  });
}

// ─── listings directory (ItemList) ───────────────────────────────────────────

export interface ListingItemInput {
  url: string;
  name: string;
  description?: string | null;
  image?: string | null;
  price?: number | null;
  priceCurrency?: string;
  city?: string | null;
  state?: string | null;
}

/**
 * ItemList schema for the /listings directory page.
 * Tells Google this page is a catalogue of real estate listings.
 */
export function listingsDirectoryLd(args: {
  url: string;
  name: string;
  description: string;
  items: ListingItemInput[];
}): JsonLd {
  return omitNullish({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: args.name,
    description: args.description,
    url: args.url,
    numberOfItems: args.items.length,
    itemListElement: args.items.slice(0, 50).map((item, i) =>
      omitNullish({
        '@type': 'ListItem',
        position: i + 1,
        url: item.url,
        name: item.name,
        description: item.description || undefined,
        image: item.image || undefined,
      })
    ),
  });
}

// ─── breadcrumbs ─────────────────────────────────────────────────────────────

export function breadcrumbLd(items: Array<{ name: string; path: string }>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

// ─── FAQ page ────────────────────────────────────────────────────────────────

/**
 * FAQPage structured data — when valid, Google may render the questions
 * directly in search results as expandable rich snippets, lifting CTR
 * substantially. Each Question must have a non-empty `acceptedAnswer.text`.
 *
 * Pass a flat list (one entry per Q&A across categories). HTML is allowed
 * inside the answer string; Google strips dangerous tags.
 */
export function faqLd(items: Array<{ question: string; answer: string }>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items
      .filter((it) => it.question.trim().length > 0 && it.answer.trim().length > 0)
      .map((it) => ({
        '@type': 'Question',
        name: it.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: it.answer,
        },
      })),
  };
}

// ─── blog post (Article) ─────────────────────────────────────────────────────

export interface ArticleLdInput {
  url: string; // canonical URL
  title: string;
  description?: string | null;
  image?: string | null;
  datePublished: Date | string;
  dateModified?: Date | string | null;
  authorName?: string | null;
  authorImage?: string | null;
  tags?: string[] | null;
  /** Publisher/site name. Defaults to "Property Flow HQ". */
  publisherName?: string;
  /** Publisher logo URL — Google requires this for News-eligible Articles. */
  publisherLogo?: string;
}

/**
 * Schema.org Article — the canonical type for blog posts. Combined with a
 * good Open Graph image and a sitemap entry, this is what surfaces blog
 * content as rich results in Google Search and Discover.
 */
export function articleLd(input: ArticleLdInput): JsonLd {
  const datePublished =
    input.datePublished instanceof Date ? input.datePublished.toISOString() : input.datePublished;
  const dateModified = input.dateModified
    ? input.dateModified instanceof Date
      ? input.dateModified.toISOString()
      : input.dateModified
    : datePublished;

  return omitNullish({
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': input.url,
    mainEntityOfPage: input.url,
    headline: input.title,
    description: input.description || undefined,
    image: input.image || undefined,
    datePublished,
    dateModified,
    keywords: input.tags?.length ? input.tags.join(', ') : undefined,
    author: input.authorName
      ? omitNullish({
          '@type': 'Person',
          name: input.authorName,
          image: input.authorImage || undefined,
        })
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: input.publisherName || 'Property Flow HQ',
      logo: input.publisherLogo
        ? { '@type': 'ImageObject', url: input.publisherLogo }
        : undefined,
    },
  });
}
