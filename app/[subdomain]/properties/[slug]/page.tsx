import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import BackButton from '@/components/subdomain/back-button';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Bed,
  Bath,
  Maximize,
  MapPin,
  Home,
  Layers,
  Star,
  ShieldCheck,
  Mail,
  Phone,
} from 'lucide-react';
import PropertyScheduler from '@/components/subdomain/property-scheduler';
import { SubdomainApplyButton } from '@/components/subdomain/apply-button';
import PropertyMap from '@/components/maps/property-map';
import PropertyMediaSection from '@/components/subdomain/property-media-section';
import PropertyGallery from '@/components/subdomain/property-gallery';
import InlineContactForm from '@/components/subdomain/inline-contact-form';
import JsonLdScript from '@/components/seo/json-ld-script';
import {
  canonicalUrl,
  buildPropertySeoTitle,
  buildPropertySeoH1,
  buildPropertySeoDescription,
  propertyLd,
  breadcrumbLd,
} from '@/lib/seo';

// ─── Floor-plan grouping (unchanged behavior) ────────────────────────────────

interface FloorPlan {
  key: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqFt: number | null;
  minRent: number;
  maxRent: number;
  availableCount: number;
  amenities: string[];
  images: string[];
}

function groupUnitsByFloorPlan(units: any[]): FloorPlan[] {
  const floorPlanMap = new Map<string, FloorPlan>();

  units.forEach((unit) => {
    const bedrooms = unit.bedrooms || 0;
    const bathrooms = Number(unit.bathrooms) || 1;
    const key = `${bedrooms}-${bathrooms}`;
    const rent = Number(unit.rentAmount) || 0;

    if (floorPlanMap.has(key)) {
      const existing = floorPlanMap.get(key)!;
      existing.availableCount++;
      existing.minRent = Math.min(existing.minRent, rent);
      existing.maxRent = Math.max(existing.maxRent, rent);
      if (!existing.sizeSqFt && unit.sizeSqFt) existing.sizeSqFt = unit.sizeSqFt;
      if (unit.images?.length && !existing.images.length) existing.images = unit.images;
      unit.amenities?.forEach((a: string) => {
        if (!existing.amenities.includes(a)) existing.amenities.push(a);
      });
    } else {
      const name = bedrooms === 0 ? 'Studio' : `${bedrooms} Bedroom`;
      floorPlanMap.set(key, {
        key,
        name,
        bedrooms,
        bathrooms,
        sizeSqFt: unit.sizeSqFt || null,
        minRent: rent,
        maxRent: rent,
        availableCount: 1,
        amenities: unit.amenities || [],
        images: unit.images || [],
      });
    }
  });

  return Array.from(floorPlanMap.values()).sort((a, b) => a.bedrooms - b.bedrooms);
}

interface PropertyPageParams {
  subdomain: string;
  slug: string;
}

// ─── Metadata (unchanged) ────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<PropertyPageParams>;
}): Promise<Metadata> {
  const { subdomain, slug } = await params;

  const landlord = await prisma.landlord.findUnique({
    where: { subdomain },
    select: { id: true, name: true, companyName: true },
  });
  if (!landlord) return { title: 'Property Not Found' };

  const property = await prisma.property.findFirst({
    where: { slug, landlordId: landlord.id },
    include: { units: { where: { isAvailable: true } } },
  });
  if (!property) return { title: 'Property Not Found' };

  const address = property.address as any;
  const city = address?.city || null;
  const state = address?.state || null;
  const unitInputs = property.units.map((u) => ({
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms != null ? Number(u.bathrooms) : null,
    sizeSqFt: u.sizeSqFt,
    rentAmount: u.rentAmount != null ? Number(u.rentAmount) : null,
  }));

  const title = buildPropertySeoTitle({
    propertyName: property.name,
    propertyType: property.type,
    city,
    state,
    units: unitInputs,
  });
  const description = buildPropertySeoDescription({
    propertyName: property.name,
    propertyType: property.type,
    city,
    state,
    description: property.description,
    units: unitInputs,
  });
  const ogImage = property.units.find((u) => u.images?.length)?.images?.[0] || undefined;
  const canonical = canonicalUrl(`/${subdomain}/properties/${property.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `apartments for rent in ${city || ''}`.trim(),
      `homes for rent in ${city || ''}`.trim(),
      `${property.type} for rent ${city || ''}`.trim(),
      property.name,
    ].filter((k) => k && !k.endsWith('in')),
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName: 'Property Flow HQ',
      images: ogImage ? [{ url: ogImage, alt: property.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function SubdomainPropertyPage({
  params,
}: {
  params: Promise<PropertyPageParams>;
}) {
  const { subdomain, slug } = await params;

  const landlord = await prisma.landlord.findUnique({
    where: { subdomain },
    include: {
      owner: {
        select: { email: true, phoneNumber: true },
      },
    },
  });

  if (!landlord) {
    redirect('/');
  }

  const property = await prisma.property.findFirst({
    where: {
      slug,
      landlordId: landlord.id,
    },
    include: {
      // Fetch ALL units for image gathering; filter available ones separately below
      units: true,
    },
  });

  if (!property) {
    notFound();
  }

  const session = await auth();

  // Tenants with an active lease here go straight to their dashboard.
  if (session?.user?.id && session.user.role === 'tenant') {
    const tenantLease = await prisma.lease
      .findFirst({
        where: {
          tenantId: session.user.id,
          status: 'active',
          unit: { property: { landlordId: landlord.id } },
        },
      })
      .catch(() => null);

    if (tenantLease) redirect('/user/dashboard');
  }

  // ── Address / SEO ──────────────────────────────────────────────────────────
  const address = property.address as any;
  const city = address?.city || null;
  const state = address?.state || null;
  const street = address?.street || null;
  const zip = address?.zip || null;
  const lat = address?.lat ?? null;
  const lng = address?.lng ?? null;

  // Available units only — used for pricing, SEO, and apply/schedule actions
  const availableUnits = property.units.filter((u) => u.isAvailable);

  const unitInputs = availableUnits.map((u) => ({
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms != null ? Number(u.bathrooms) : null,
    sizeSqFt: u.sizeSqFt,
    rentAmount: u.rentAmount != null ? Number(u.rentAmount) : null,
    isAvailable: u.isAvailable,
  }));

  const seoH1 = buildPropertySeoH1({
    propertyName: property.name,
    propertyType: property.type,
    city,
    state,
    units: unitInputs,
  });

  // ── Gather images: dedupe across ALL units (including occupied), cap at 24 ─
  const galleryImages = Array.from(
    new Set(property.units.flatMap((u) => u.images || []).filter(Boolean)),
  ).slice(0, 24);

  const propertyCanonical = canonicalUrl(`/${subdomain}/properties/${property.slug}`);
  const subdomainCanonical = canonicalUrl(`/${subdomain}`);

  const propertyLdData: object[] = [
    propertyLd({
      url: propertyCanonical,
      name: property.name,
      description: property.description,
      propertyType: property.type,
      street,
      city,
      state,
      zip,
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
      images: galleryImages.slice(0, 8),
      units: unitInputs,
      landlordName: landlord.companyName || landlord.name,
      landlordUrl: subdomainCanonical,
      applyUrl: canonicalUrl(`/${subdomain}/application?property=${property.slug}`),
    }),
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: landlord.companyName || landlord.name, path: `/${subdomain}` },
      { name: property.name, path: `/${subdomain}/properties/${property.slug}` },
    ]),
  ];

  const mediaUrls =
    property.videoUrl || property.virtualTourUrl
      ? { videoUrl: property.videoUrl, virtualTourUrl: property.virtualTourUrl }
      : null;

  // Pricing summary used in the headline card — available units only
  const rents = availableUnits
    .map((u) => Number(u.rentAmount))
    .filter((n) => !isNaN(n) && n > 0);
  const minRent = rents.length ? Math.min(...rents) : null;
  const maxRent = rents.length ? Math.max(...rents) : null;

  const brandName = landlord.companyName || landlord.name;
  const brandEmail = landlord.companyEmail || landlord.owner?.email || null;
  const brandPhone = landlord.companyPhone || landlord.owner?.phoneNumber || null;
  const brandAddress = landlord.companyAddress || null;

  return (
    <main className="flex-1 w-full bg-slate-50 overflow-x-hidden">
      <JsonLdScript data={propertyLdData} id="property-ld" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 md:py-10 space-y-6 sm:space-y-8">
        {/* Back link */}
        <BackButton fallbackHref="/listings" />

        {/* ── Top row: gallery + summary ───────────────────────────────────── */}
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.15fr_0.85fr] overflow-hidden">
          {/* Left column: gallery + about card fills the gap below */}
          <div className="min-w-0 flex flex-col gap-5 sm:gap-6">
            <PropertyGallery images={galleryImages} alt={property.name} />
            {/* About card lives here so it fills the empty space under the gallery */}
            <div className="flex-1">
              <AboutSection
                landlord={landlord}
                brandName={brandName}
                brandEmail={brandEmail}
                brandPhone={brandPhone}
                brandAddress={brandAddress}
              />
            </div>
          </div>

          {/* Summary card */}
          <div className="space-y-4 sm:space-y-5 min-w-0">
            <div className="rounded-3xl bg-white shadow-2xl border border-slate-100 p-5 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent break-words">
                  {seoH1}
                </h1>
                {[street, city, state, zip].filter(Boolean).length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{[street, city, state, zip].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Price */}
              {minRent != null && (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900">
                    {formatCurrency(minRent)}
                    {maxRent && maxRent > minRent ? (
                      <span className="text-lg sm:text-2xl text-slate-700"> – {formatCurrency(maxRent)}</span>
                    ) : null}
                  </span>
                  <span className="text-sm text-slate-500 font-medium">/mo</span>
                </div>
              )}

              {property.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{property.description}</p>
              )}

              <div className="flex flex-wrap gap-2 items-center">
                <Badge
                  variant="secondary"
                  className="bg-slate-100 text-slate-700 border-slate-200 capitalize"
                >
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  {property.type}
                </Badge>
                {availableUnits.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border-blue-100"
                  >
                    {availableUnits.length} unit{availableUnits.length !== 1 ? 's' : ''} available
                  </Badge>
                )}
                {property.addressVerified && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 border-emerald-100 inline-flex items-center gap-1"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified listing
                  </Badge>
                )}
              </div>

              <div className="pt-2">
                <SubdomainApplyButton propertySlug={property.slug} size="lg" />
              </div>
            </div>

            {/* Available units / floor plans */}
            <UnitsCard property={property} />
          </div>
        </div>

        {/* ── Schedule a viewing ───────────────────────────────────────────── */}
        <PropertyScheduler propertyId={property.id} propertyName={property.name} />

        {/* ── Video / Virtual tour ─────────────────────────────────────────── */}
        {(mediaUrls?.videoUrl || mediaUrls?.virtualTourUrl) && (
          <PropertyMediaSection
            videoUrl={mediaUrls.videoUrl}
            virtualTourUrl={mediaUrls.virtualTourUrl}
            propertyName={property.name}
          />
        )}

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        {address && address.street && (
          <section className="rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 sm:px-6 md:px-8 pt-5 sm:pt-6 md:pt-7">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent inline-flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Property location
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {[address.street, address.city, address.state, address.zip].filter(Boolean).join(', ')}
              </p>
            </div>
            <div className="px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8 pt-3 sm:pt-4">
              <PropertyMap
                address={{
                  street: address.street,
                  city: address.city,
                  state: address.state,
                  zip: address.zip,
                }}
                propertyName={property.name}
                className="h-[250px] sm:h-[300px] md:h-[360px] rounded-xl overflow-hidden border border-slate-200"
              />
            </div>
          </section>
        )}

        {/* ── Contact (from /contact) ─────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto w-full">
          <InlineContactForm
            brandName={brandName}
            subdomain={subdomain}
            defaultSubject={`Inquiry about ${property.name}`}
          />
        </div>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <div className="flex justify-center pt-2 pb-6">
          <SubdomainApplyButton propertySlug={property.slug} size="lg" />
        </div>
      </div>
    </main>
  );
}

// ─── Sub-components (server) ────────────────────────────────────────────────

function UnitsCard({ property }: { property: any }) {
  const isApartmentComplex = property.type === 'apartment' && property.units.length > 3;

  return (
    <section className="rounded-3xl bg-white shadow-2xl border border-slate-100 p-5 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent inline-flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600" />
          {isApartmentComplex ? 'Floor Plans' : 'Available Units'}
        </h2>
        <span className="text-xs text-slate-500 font-medium">
          {property.units.length} unit{property.units.length !== 1 ? 's' : ''}
        </span>
      </header>

      <div className="space-y-3">
        {isApartmentComplex
          ? groupUnitsByFloorPlan(property.units).map((floorPlan) => (
              <FloorPlanRow key={floorPlan.key} floorPlan={floorPlan} />
            ))
          : property.units.map((unit: any) => <UnitRow key={unit.id} unit={unit} />)}
      </div>
    </section>
  );
}

function FloorPlanRow({ floorPlan }: { floorPlan: FloorPlan }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-100 grid place-items-center flex-shrink-0">
            <Home className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{floorPlan.name}</p>
            <p className="text-xs text-slate-500">
              {floorPlan.availableCount} unit{floorPlan.availableCount !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base sm:text-lg font-extrabold text-slate-900">
            {floorPlan.minRent === floorPlan.maxRent
              ? formatCurrency(floorPlan.minRent)
              : `${formatCurrency(floorPlan.minRent)} – ${formatCurrency(floorPlan.maxRent)}`}
          </div>
          <span className="text-xs text-slate-500">/mo</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <Stat icon={<Bed className="h-3.5 w-3.5" />}>
          {floorPlan.bedrooms === 0
            ? 'Studio'
            : `${floorPlan.bedrooms} bed${floorPlan.bedrooms !== 1 ? 's' : ''}`}
        </Stat>
        <Stat icon={<Bath className="h-3.5 w-3.5" />}>
          {floorPlan.bathrooms} bath{floorPlan.bathrooms !== 1 ? 's' : ''}
        </Stat>
        {floorPlan.sizeSqFt && (
          <Stat icon={<Maximize className="h-3.5 w-3.5" />}>
            {floorPlan.sizeSqFt.toLocaleString()} sqft
          </Stat>
        )}
      </div>

      {floorPlan.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {floorPlan.amenities.slice(0, 5).map((amenity, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="text-[10px] border-slate-300 text-slate-700 bg-white"
            >
              {amenity}
            </Badge>
          ))}
          {floorPlan.amenities.length > 5 && (
            <Badge
              variant="outline"
              className="text-[10px] border-slate-300 text-slate-700 bg-white"
            >
              +{floorPlan.amenities.length - 5} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function UnitRow({ unit }: { unit: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="font-semibold text-slate-900 truncate">{unit.name}</p>
        <div className="text-right flex-shrink-0">
          <div className="text-base sm:text-lg font-extrabold text-slate-900">
            {formatCurrency(Number(unit.rentAmount))}
          </div>
          <span className="text-xs text-slate-500">/mo</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {unit.bedrooms != null && (
          <Stat icon={<Bed className="h-3.5 w-3.5" />}>
            {unit.bedrooms} bed{unit.bedrooms !== 1 ? 's' : ''}
          </Stat>
        )}
        {unit.bathrooms != null && (
          <Stat icon={<Bath className="h-3.5 w-3.5" />}>
            {Number(unit.bathrooms)} bath{Number(unit.bathrooms) !== 1 ? 's' : ''}
          </Stat>
        )}
        {unit.sizeSqFt && (
          <Stat icon={<Maximize className="h-3.5 w-3.5" />}>{unit.sizeSqFt} sqft</Stat>
        )}
      </div>
      {unit.amenities && unit.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unit.amenities.map((amenity: string, idx: number) => (
            <Badge
              key={idx}
              variant="outline"
              className="text-[10px] border-slate-300 text-slate-700 bg-white"
            >
              {amenity}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      <span className="text-slate-400">{icon}</span>
      {children}
    </span>
  );
}

function AboutSection({
  landlord,
  brandName,
  brandEmail,
  brandPhone,
  brandAddress,
}: {
  landlord: any;
  brandName: string;
  brandEmail: string | null;
  brandPhone: string | null;
  brandAddress: string | null;
}) {
  const aboutBio =
    landlord.aboutBio ||
    `Learn more about ${brandName}. We manage quality homes with care, transparency, and responsive service.`;
  const aboutPhoto = landlord.aboutPhoto || landlord.logoUrl || null;
  const gallery: string[] = landlord.aboutGallery || [];

  return (
    <section className="rounded-3xl bg-white shadow-2xl border border-slate-100 p-5 sm:p-6 md:p-8 h-full">
      <header className="space-y-1 mb-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">About</p>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent">
          {brandName}
        </h2>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
            {aboutBio}
          </p>
          {gallery.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gallery.slice(0, 6).map((src, idx) => (
                <div
                  key={idx}
                  className="relative h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <Image src={src} alt={`Gallery ${idx + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dark card: photo + name + contact info */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-700 text-white p-5 flex flex-col gap-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            {aboutPhoto ? (
              <div className="relative h-16 w-16 rounded-xl overflow-hidden ring-1 ring-white/20 shrink-0">
                <Image src={aboutPhoto} alt={`${brandName} photo`} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-xl ring-1 ring-white/20 grid place-items-center shrink-0">
                <Building2 className="h-8 w-8 text-blue-200" />
              </div>
            )}
            <div>
              <p className="font-semibold text-base leading-tight">{brandName}</p>
              <p className="text-xs text-blue-200">Property Management</p>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-200 ring-1 ring-amber-300/40">
                <Star className="h-2.5 w-2.5 fill-current" />
                Trusted by tenants
              </div>
            </div>
          </div>

          {/* Contact details */}
          {(brandEmail || brandPhone || brandAddress) && (
            <div className="border-t border-white/10 pt-4 space-y-2.5">
              {brandEmail && (
                <a
                  href={`mailto:${brandEmail}`}
                  className="flex items-center gap-2.5 group"
                >
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-blue-100 shrink-0 group-hover:bg-white/20 transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-blue-300">Email</p>
                    <p className="text-sm font-medium text-white truncate group-hover:text-blue-200 transition-colors">
                      {brandEmail}
                    </p>
                  </div>
                </a>
              )}
              {brandPhone && (
                <a
                  href={`tel:${brandPhone}`}
                  className="flex items-center gap-2.5 group"
                >
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-blue-100 shrink-0 group-hover:bg-white/20 transition-colors">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-blue-300">Phone</p>
                    <p className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors">
                      {brandPhone}
                    </p>
                  </div>
                </a>
              )}
              {brandAddress && (
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-blue-100 shrink-0">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-blue-300">Office</p>
                    <p className="text-sm font-medium text-white">{brandAddress}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
