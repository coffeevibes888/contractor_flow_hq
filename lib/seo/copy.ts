import { formatLocation, formatPriceShort, truncateDescription } from './canonical';

/**
 * SEO copy builders. These produce the `<title>` text and meta descriptions
 * we want Google to see — keyword-rich, location-keyed, and consistent
 * with what's rendered as the on-page H1.
 */

const SITE_SUFFIX = 'Property Flow HQ';

// ─────────────────────────────────────────────────────────────────────────────
// Contractor (subdomain root)
// ─────────────────────────────────────────────────────────────────────────────

export function buildContractorTitle(args: {
  businessName: string;
  specialties?: string[] | null;
  baseCity?: string | null;
  baseState?: string | null;
}): string {
  const { businessName, specialties, baseCity, baseState } = args;
  const primary = (specialties && specialties[0]) || 'Local Pro';
  const loc = formatLocation(baseCity, baseState);
  if (loc) {
    return `${businessName} — ${primary} in ${loc} | ${SITE_SUFFIX}`;
  }
  return `${businessName} — ${primary} | ${SITE_SUFFIX}`;
}

export function buildContractorDescription(args: {
  businessName: string;
  tagline?: string | null;
  bio?: string | null;
  specialties?: string[] | null;
  baseCity?: string | null;
  baseState?: string | null;
  avgRating?: number | null;
  totalReviews?: number | null;
}): string {
  const {
    businessName,
    tagline,
    bio,
    specialties,
    baseCity,
    baseState,
    avgRating,
    totalReviews,
  } = args;

  if (tagline && tagline.trim().length > 20) {
    return truncateDescription(tagline);
  }
  if (bio && bio.trim().length > 40) {
    return truncateDescription(bio);
  }

  const services = (specialties || []).slice(0, 3).join(', ');
  const loc = formatLocation(baseCity, baseState);
  const ratingPart =
    avgRating && totalReviews && totalReviews > 0
      ? ` Rated ${avgRating.toFixed(1)}/5 from ${totalReviews} review${totalReviews === 1 ? '' : 's'}.`
      : '';
  const servicesPart = services ? `Specializing in ${services}. ` : '';
  const locPart = loc ? `Serving ${loc}. ` : '';
  return truncateDescription(
    `${servicesPart}${locPart}Hire ${businessName} for licensed, insured local service.${ratingPart}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Landlord property (rental)
// ─────────────────────────────────────────────────────────────────────────────

export interface PropertySeoInputUnit {
  bedrooms: number | null;
  bathrooms: number | null;
  rentAmount: number | null;
  sizeSqFt?: number | null;
}

export function buildPropertySeoTitle(args: {
  propertyName: string;
  propertyType?: string | null;
  city?: string | null;
  state?: string | null;
  units: PropertySeoInputUnit[];
}): string {
  const { propertyName, propertyType, city, state, units } = args;
  const loc = formatLocation(city, state);

  // Find bed range and min price across available units
  const beds = units.map((u) => u.bedrooms ?? 0).filter((b) => Number.isFinite(b));
  const prices = units
    .map((u) => Number(u.rentAmount))
    .filter((n) => Number.isFinite(n) && n > 0);
  const minBed = beds.length ? Math.min(...beds) : null;
  const maxBed = beds.length ? Math.max(...beds) : null;
  const minPrice = prices.length ? Math.min(...prices) : null;

  const bedLabel = (() => {
    if (minBed == null) return '';
    if (minBed === maxBed) {
      return minBed === 0 ? 'Studio' : `${minBed}BR`;
    }
    const minLabel = minBed === 0 ? 'Studio' : `${minBed}BR`;
    return `${minLabel}-${maxBed}BR`;
  })();

  const typeLabel = propertyType ? capitalize(propertyType) : 'Apartments';
  const pluralType = pluralizeType(typeLabel);

  const priceLabel = minPrice ? `from ${formatPriceShort(minPrice)}/mo` : '';

  // Examples:
  //   "Sunset Blvd — 1-3BR Apartments for Rent in Denver, CO from $1,500/mo"
  //   "Maple House — 2BR House for Rent in Austin, TX — $1,800/mo"
  const segments = [
    propertyName,
    [bedLabel, `${pluralType} for Rent`].filter(Boolean).join(' '),
    loc ? `in ${loc}` : '',
    priceLabel,
  ].filter(Boolean);

  return `${segments.slice(0, 3).join(' ')}${segments[3] ? ` ${segments[3]}` : ''} | ${SITE_SUFFIX}`
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildPropertySeoH1(args: {
  propertyName: string;
  propertyType?: string | null;
  city?: string | null;
  state?: string | null;
  units: PropertySeoInputUnit[];
}): string {
  const { propertyName, propertyType, city, state, units } = args;
  const loc = formatLocation(city, state);
  const beds = units.map((u) => u.bedrooms ?? 0).filter((b) => Number.isFinite(b));
  const prices = units
    .map((u) => Number(u.rentAmount))
    .filter((n) => Number.isFinite(n) && n > 0);
  const minBed = beds.length ? Math.min(...beds) : null;
  const maxBed = beds.length ? Math.max(...beds) : null;
  const minPrice = prices.length ? Math.min(...prices) : null;

  const bedLabel = (() => {
    if (minBed == null) return '';
    if (minBed === maxBed) return minBed === 0 ? 'Studio' : `${minBed}BR`;
    const minLabel = minBed === 0 ? 'Studio' : `${minBed}BR`;
    return `${minLabel}-${maxBed}BR`;
  })();

  const typeLabel = propertyType ? capitalize(propertyType) : 'Apartments';
  const pluralType = pluralizeType(typeLabel);
  const priceLabel = minPrice ? ` from ${formatPriceShort(minPrice)}/mo` : '';

  const tail = [bedLabel, `${pluralType} for Rent`].filter(Boolean).join(' ');
  const inLoc = loc ? ` in ${loc}` : '';
  return `${propertyName} — ${tail}${inLoc}${priceLabel}`.replace(/\s+/g, ' ').trim();
}

export function buildPropertySeoDescription(args: {
  propertyName: string;
  propertyType?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  units: PropertySeoInputUnit[];
}): string {
  const { propertyName, propertyType, city, state, description, units } = args;
  const loc = formatLocation(city, state);

  const prices = units
    .map((u) => Number(u.rentAmount))
    .filter((n) => Number.isFinite(n) && n > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  const priceRange = (() => {
    if (!minPrice) return '';
    if (maxPrice && maxPrice !== minPrice) {
      return `Rents from ${formatPriceShort(minPrice)} to ${formatPriceShort(maxPrice)}/mo. `;
    }
    return `Rent ${formatPriceShort(minPrice)}/mo. `;
  })();

  const unitCount = units.length;
  const typeLabel = propertyType ? pluralizeType(capitalize(propertyType)) : 'units';
  const availability = unitCount > 0 ? `${unitCount} ${typeLabel} available. ` : '';

  if (description && description.trim().length > 60) {
    return truncateDescription(description);
  }

  const locPart = loc ? `${propertyName} in ${loc}. ` : `${propertyName}. `;
  return truncateDescription(
    `${locPart}${availability}${priceRange}Apply online with no application fees.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent listing (for sale or for rent)
// ─────────────────────────────────────────────────────────────────────────────

export function buildAgentListingTitle(args: {
  title: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  propertyType?: string | null;
  listingType?: string | null;
  city?: string | null;
  state?: string | null;
  price?: number | null;
}): string {
  const { title, bedrooms, bathrooms, propertyType, listingType, city, state, price } = args;
  const loc = formatLocation(city, state);
  const bedBath =
    bedrooms != null && bathrooms != null
      ? `${bedrooms === 0 ? 'Studio' : `${bedrooms}BR`}/${formatBaths(bathrooms)}BA`
      : '';
  const typeLabel = propertyType ? capitalize(propertyType) : 'Home';
  const action = (listingType || 'sale').toLowerCase() === 'rent' ? 'for Rent' : 'for Sale';
  const priceLabel = price ? formatPriceShort(price) + ((listingType || '').toLowerCase() === 'rent' ? '/mo' : '') : '';

  // Prefer the agent's own title if it's specific; fall back to formula
  const formula = [
    [bedBath, typeLabel].filter(Boolean).join(' '),
    action,
    loc ? `in ${loc}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const head = title && title.trim().length > 0 && title.length < 70 ? title : formula;
  const priced = priceLabel ? `${head} — ${priceLabel}` : head;
  return `${priced} | ${SITE_SUFFIX}`.replace(/\s+/g, ' ').trim();
}

export function buildAgentListingDescription(args: {
  title: string;
  description?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeSqFt?: number | null;
  city?: string | null;
  state?: string | null;
  price?: number | null;
  listingType?: string | null;
}): string {
  const { description, bedrooms, bathrooms, sizeSqFt, city, state, price, listingType } = args;
  if (description && description.trim().length > 80) {
    return truncateDescription(description);
  }
  const loc = formatLocation(city, state);
  const bb = [
    bedrooms != null ? `${bedrooms === 0 ? 'Studio' : `${bedrooms} bed${bedrooms === 1 ? '' : 's'}`}` : null,
    bathrooms != null ? `${formatBaths(bathrooms)} bath${formatBaths(bathrooms) === '1' ? '' : 's'}` : null,
    sizeSqFt ? `${sizeSqFt.toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const priceLabel = price
    ? `${formatPriceShort(price)}${(listingType || '').toLowerCase() === 'rent' ? '/mo' : ''}`
    : '';
  const action = (listingType || 'sale').toLowerCase() === 'rent' ? 'for rent' : 'for sale';
  return truncateDescription(
    [`${bb || 'Home'} ${action}${loc ? ` in ${loc}` : ''}.`, priceLabel ? `Listed at ${priceLabel}.` : '', 'Schedule a tour today.']
      .filter(Boolean)
      .join(' '),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pluralizeType(s: string): string {
  // "Apartment" → "Apartments", "House" → "Houses", "Condo" → "Condos"
  if (/s$/i.test(s)) return s;
  return `${s}s`;
}

function formatBaths(b: number): string {
  // 2 → "2", 2.5 → "2.5"
  return Number.isInteger(b) ? String(b) : b.toFixed(1).replace(/\.0$/, '');
}
