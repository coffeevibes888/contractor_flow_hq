import { prisma } from '@/db/prisma';
import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  Star,
  MapPin,
  Shield,
  Clock,
  Wrench,
  Calendar,
  CheckCircle,
  ArrowLeft,
  DollarSign,
  Phone,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { auth } from '@/auth';
import ContactContractorButton from './contact-button';
import BookingButtons from './booking-buttons';
import JsonLdScript from '@/components/seo/json-ld-script';
import {
  canonicalUrl,
  buildContractorTitle,
  buildContractorDescription,
  contractorLd,
  breadcrumbLd,
} from '@/lib/seo';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // Check if id is a valid UUID
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Try ContractorProfile first (by ID or slug)
  const profile = await prisma.contractorProfile.findFirst({
    where: isUUID ? { OR: [{ id }, { slug: id }] } : { slug: id },
    select: {
      displayName: true,
      businessName: true,
      specialties: true,
      tagline: true,
      bio: true,
      baseCity: true,
      baseState: true,
      avgRating: true,
      totalReviews: true,
      profilePhoto: true,
      heroImages: true,
      slug: true,
      subdomain: true,
    },
  });

  if (profile) {
    const name = profile.displayName || profile.businessName;
    // Canonical points to the subdomain page so /contractors/{id} doesn't compete
    const canonicalSubdomain = profile.subdomain || profile.slug;
    const canonical = canonicalUrl(`/${canonicalSubdomain}`);
    const title = buildContractorTitle({
      businessName: name,
      specialties: profile.specialties,
      baseCity: profile.baseCity,
      baseState: profile.baseState,
    });
    const description = buildContractorDescription({
      businessName: name,
      tagline: profile.tagline,
      bio: profile.bio,
      specialties: profile.specialties,
      baseCity: profile.baseCity,
      baseState: profile.baseState,
      avgRating: profile.avgRating,
      totalReviews: profile.totalReviews,
    });
    const ogImage =
      profile.profilePhoto || profile.heroImages?.[0] || undefined;
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
        images: ogImage ? [{ url: ogImage, alt: name }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    };
  }

  return { title: 'Contractor Not Found' };
}

export default async function ContractorProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  // Check if id is a valid UUID
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // ── 301 to the slug URL when a UUID is hit ────────────────────────────────
  // We have two URL shapes for the same contractor: `/contractors/{uuid}`
  // (legacy, links from emails/old code) and `/{slug}` (canonical, what
  // ranks). Returning content from both confuses Google ("duplicate
  // content") and splits link equity. A permanent redirect collapses every
  // signal into the slug URL while keeping the legacy links functional.
  // We only redirect when we can *resolve* a slug to redirect to — if the
  // ID is unknown we fall through to the regular notFound() at the bottom.
  if (isUUID) {
    const target = await prisma.contractorProfile.findUnique({
      where: { id },
      select: { slug: true, subdomain: true },
    });
    const slug = target?.subdomain || target?.slug;
    if (slug) {
      // Next 14+ uses `permanentRedirect()` to issue a 308 (permanent), or
      // we can hand-build a 301 via `redirect(url, RedirectType.replace)`.
      // We prefer permanentRedirect because Next maps it to a 308 which
      // Google treats identically to a 301 for SEO consolidation.
      permanentRedirect(`/${slug}`);
    }
  }

  // Try to find ContractorProfile by ID or slug first
  const profile = await prisma.contractorProfile.findFirst({
    where: isUUID
      ? {
          OR: [{ id: id }, { slug: id }],
        }
      : {
          slug: id,
        },
    include: {
      user: {
        select: { id: true, name: true, image: true, createdAt: true },
      },
      reviewsReceived: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: {
            select: { name: true, image: true },
          },
        },
      },
    },
  });

  if (!profile) {
    notFound();
  }

  const name = profile.displayName || profile.businessName;
  const memberSince = profile.user?.createdAt
    ? new Date(profile.user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently joined';

  // Check if current user can hire
  const canHire =
    session?.user?.role === 'admin' ||
    session?.user?.role === 'landlord' ||
    session?.user?.role === 'property_manager';

  // ── SEO: structured data + breadcrumbs (canonical to subdomain) ─────────
  const canonicalSubdomain = profile.subdomain || profile.slug;
  const subdomainCanonical = canonicalUrl(`/${canonicalSubdomain}`);
  const ldData: object[] = [
    contractorLd({
      id: profile.id,
      url: subdomainCanonical,
      businessName: profile.businessName,
      displayName: profile.displayName,
      tagline: profile.tagline,
      bio: profile.bio,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      logoUrl: profile.logoUrl,
      profilePhoto: profile.profilePhoto,
      heroImages: profile.heroImages,
      portfolioImages: profile.portfolioImages,
      baseCity: profile.baseCity,
      baseState: profile.baseState,
      serviceAreas: profile.serviceAreas,
      serviceRadius: profile.serviceRadius,
      specialties: profile.specialties,
      yearsExperience: profile.yearsExperience,
      hourlyRate: profile.hourlyRate ? Number(profile.hourlyRate) : null,
      licenseNumber: profile.licenseNumber,
      licenseState: profile.licenseState,
      insuranceVerified: profile.insuranceVerified,
      avgRating: profile.avgRating,
      totalReviews: profile.totalReviews,
    }),
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Contractors', path: '/contractors' },
      { name: name, path: `/contractors/${profile.slug || profile.id}` },
    ]),
  ];

  return (
    <div className='min-h-screen bg-white'>
      <JsonLdScript data={ldData} id='contractor-marketplace-ld' />
      {/* Header */}
      <div className='pt-6 bg-white'>
        <div className='max-w-6xl mx-auto px-4 py-6'>
          <Link
            href='/contractor-marketplace'
            className='inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4'
          >
            <ArrowLeft className='h-4 w-4' />
            Back to Contractors
          </Link>
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-4 -mt-8'>
        <div className='grid lg:grid-cols-3 gap-6'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Profile Card */}
            <Card className='overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-violet-50 border-2 border-slate-200 shadow-lg'>
              <div className='h-48 bg-gradient-to-r from-blue-500 to-cyan-500 relative'>
                {profile.coverPhoto && (
                  <img
                    src={profile.coverPhoto}
                    alt=''
                    className='w-full h-full object-cover'
                  />
                )}
                <div className='absolute -bottom-16 left-6'>
                  <div className='h-32 w-32 rounded-full bg-white p-1 shadow-xl'>
                    {profile.profilePhoto || profile.user?.image ? (
                      <img
                        src={profile.profilePhoto || profile.user?.image || ''}
                        alt={name}
                        className='w-full h-full rounded-full object-cover'
                      />
                    ) : (
                      <div className='w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-4xl font-bold'>
                        {name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className='pt-20 pb-6'>
                <div className='flex items-start justify-between'>
                  <div>
                    <div className='flex items-center gap-3 mb-2'>
                      <h1 className='text-2xl font-bold text-slate-900'>
                        {name}
                      </h1>
                      {profile.identityVerified && (
                        <span className='px-2 py-1 rounded bg-gradient-to-r from-sky-300 via-cyan-300 to-indigo-600 text-emerald-700 text-xs font-medium flex items-center gap-1'>
                          <Shield className='h-3 w-3' /> Verified Pro
                        </span>
                      )}
                    </div>
                    {profile.tagline && (
                      <p className='text-slate-600 mb-2'>{profile.tagline}</p>
                    )}
                    <p className='text-slate-500 mb-4'>
                      {profile.specialties.join(' • ')}
                    </p>

                    <div className='flex flex-wrap items-center gap-4 text-sm'>
                      <div className='flex items-center gap-1'>
                        <Star className='h-5 w-5 fill-amber-400 text-amber-400' />
                        <span className='font-semibold text-slate-900'>
                          {profile.avgRating.toFixed(1)}
                        </span>
                        <span className='text-slate-500'>
                          ({profile.totalReviews} reviews)
                        </span>
                      </div>
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Wrench className='h-4 w-4' />
                        {profile.completedJobs} jobs completed
                      </div>
                      {profile.baseCity && profile.baseState && (
                        <div className='flex items-center gap-1 text-slate-500'>
                          <MapPin className='h-4 w-4' />
                          {profile.baseCity}, {profile.baseState}
                        </div>
                      )}
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Calendar className='h-4 w-4' />
                        Member since {memberSince}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About */}
            <Card className='bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 border-2 border-slate-200 shadow-lg'>
              <CardHeader>
                <CardTitle className='text-slate-900'>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-slate-600'>
                  {profile.bio ||
                    `Professional contractor specializing in ${profile.specialties.slice(0, 3).join(', ')}. 
                  Committed to quality work and customer satisfaction.`}
                </p>
              </CardContent>
            </Card>

            {/* Specialties */}
            <Card className='bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-slate-200 shadow-lg'>
              <CardHeader>
                <CardTitle className='text-slate-900'>
                  Services Offered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                  {profile.specialties.map((specialty) => (
                    <div
                      key={specialty}
                      className='flex items-center gap-2 p-3 rounded-lg bg-slate-50'
                    >
                      <CheckCircle className='h-5 w-5 text-emerald-500' />
                      <span className='text-slate-700'>{specialty}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio */}
            {profile.portfolioImages.length > 0 && (
              <Card className='bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-slate-200 shadow-lg'>
                <CardHeader>
                  <CardTitle className='text-slate-900'>Portfolio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                    {profile.portfolioImages.slice(0, 6).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Portfolio ${idx + 1}`}
                        className='w-full aspect-square rounded-lg object-cover'
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {profile.reviewsReceived.length > 0 && (
              <Card className='bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 border-2 border-slate-200 shadow-lg'>
                <CardHeader>
                  <CardTitle className='text-slate-900'>Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    {profile.reviewsReceived.map((review) => (
                      <div
                        key={review.id}
                        className='p-4 rounded-lg bg-slate-50'
                      >
                        <div className='flex items-center gap-3 mb-2'>
                          {review.customer.image ? (
                            <img
                              src={review.customer.image}
                              alt=''
                              className='w-10 h-10 rounded-full'
                            />
                          ) : (
                            <div className='w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium'>
                              {review.customer.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className='font-medium text-slate-900'>
                              {review.customer.name}
                            </p>
                            <div className='flex items-center gap-1'>
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < Number(review.overallRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className='text-slate-600'>{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Contact Card */}
            <Card className='sticky top-6 bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-50 border-2 border-slate-200 shadow-lg'>
              <CardContent className='p-6'>
                {profile.hourlyRate && (
                  <div className='text-center mb-4 pb-4 border-b'>
                    <p className='text-sm text-slate-500 mb-1'>Starting at</p>
                    <p className='text-2xl font-bold text-slate-900 flex items-center justify-center gap-1'>
                      <DollarSign className='h-6 w-6' />
                      {parseFloat(profile.hourlyRate.toString()).toFixed(0)}/hr
                    </p>
                  </div>
                )}

                <div className='text-center mb-6'>
                  <p className='text-sm text-slate-500 mb-1'>Response Time</p>
                  <p className='text-lg font-semibold text-slate-900 flex items-center justify-center gap-2'>
                    <Clock className='h-5 w-5 text-emerald-500' />
                    {profile.responseRate > 90
                      ? 'Usually responds in 1 hour'
                      : profile.responseRate > 70
                        ? 'Usually responds in 4 hours'
                        : 'Usually responds in 24 hours'}
                  </p>
                </div>

                {session ? (
                  <div className='space-y-3'>
                    <ContactContractorButton
                      contractorId={profile.id}
                      contractorName={name}
                    />
                    <BookingButtons
                      contractorId={profile.id}
                      contractorName={name}
                      instantBookingEnabled={profile.instantBookingEnabled}
                      displayName={profile.displayName}
                      businessName={profile.businessName}
                      depositRequired={profile.depositRequired}
                      depositAmount={
                        profile.depositAmount != null
                          ? Number(profile.depositAmount)
                          : null
                      }
                      cancellationPolicy={
                        profile.cancellationPolicy ?? undefined
                      }
                      cancellationHours={profile.cancellationHours}
                    />
                    {canHire && (
                      <Button variant='outline' className='w-full' asChild>
                        <Link href={`/admin/contractors/hire/${profile.id}`}>
                          <Wrench className='h-4 w-4 mr-2' />
                          Send Job Offer
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <ContactContractorButton
                      contractorId={profile.id}
                      contractorName={name}
                    />
                    <BookingButtons
                      contractorId={profile.id}
                      contractorName={name}
                      instantBookingEnabled={profile.instantBookingEnabled}
                      displayName={profile.displayName}
                      businessName={profile.businessName}
                      depositRequired={profile.depositRequired}
                      depositAmount={
                        profile.depositAmount != null
                          ? Number(profile.depositAmount)
                          : null
                      }
                      cancellationPolicy={
                        profile.cancellationPolicy ?? undefined
                      }
                      cancellationHours={profile.cancellationHours}
                    />
                  </div>
                )}

                <div className='mt-6 pt-6 border-t space-y-3'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-slate-500'>Jobs Completed</span>
                    <span className='font-medium text-slate-900'>
                      {profile.completedJobs}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-slate-500'>Rating</span>
                    <span className='font-medium text-slate-900 flex items-center gap-1'>
                      <Star className='h-4 w-4 fill-amber-400 text-amber-400' />
                      {profile.avgRating.toFixed(1)}
                    </span>
                  </div>
                  {profile.yearsExperience && (
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-slate-500'>Experience</span>
                      <span className='font-medium text-slate-900'>
                        {profile.yearsExperience} years
                      </span>
                    </div>
                  )}
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-slate-500'>Verified</span>
                    <span
                      className={`font-medium ${profile.identityVerified ? 'text-emerald-600' : 'text-slate-500'}`}
                    >
                      {profile.identityVerified ? 'Yes' : 'Pending'}
                    </span>
                  </div>
                  {profile.insuranceVerified && (
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-slate-500'>Insured</span>
                      <span className='font-medium text-emerald-600'>Yes</span>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                {(profile.phone || profile.website) && (
                  <div className='mt-6 pt-6 border-t space-y-2'>
                    {profile.phone && (
                      <a
                        href={`tel:${profile.phone}`}
                        className='flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600'
                      >
                        <Phone className='h-4 w-4' />
                        {profile.phone}
                      </a>
                    )}
                    {profile.website && (
                      <a
                        href={profile.website}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600'
                      >
                        <Globe className='h-4 w-4' />
                        Website
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Padding */}
      <div className='h-16' />
    </div>
  );
}
