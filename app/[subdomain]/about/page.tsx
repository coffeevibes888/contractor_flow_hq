import Image from 'next/image';
import { notFound } from 'next/navigation';
import { detectSubdomainEntity } from '@/lib/utils/subdomain-detection';
import { Star, Shield, CheckCircle2, MapPin, Clock, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function SubdomainAboutPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const result = await detectSubdomainEntity(subdomain);

  if (result.type === 'not_found') {
    return notFound();
  }

  if (result.type === 'landlord') {
    return <LandlordAboutContent data={result.data} />;
  }

  return <ContractorAboutContent data={result.data} />;
}

function LandlordAboutContent({ data }: { data: any }) {
  const brandName = data.companyName || data.name;
  const aboutBio =
    data.aboutBio ||
    `Learn more about ${brandName}. We manage quality homes with care, transparency, and responsive service.`;
  const aboutPhoto = data.aboutPhoto || data.logoUrl || null;
  const gallery = data.aboutGallery || [];

  return (
    <main className="min-h-[70vh] w-full px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-white/70">About</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">{brandName}</h1>
          <p className="text-sm text-white/80 max-w-2xl">
            Meet your property management team, understand how we operate, and see what makes our homes special.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-6 shadow-lg">
              <p className="whitespace-pre-line text-white leading-relaxed text-base">{aboutBio}</p>
            </div>
            {gallery.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((src: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative h-32 sm:h-40 rounded-xl overflow-hidden border border-white/20 bg-white/10"
                    >
                      <Image src={src} alt={`Gallery ${idx + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-6 flex flex-col items-center gap-4 shadow-lg">
              {aboutPhoto ? (
                <div className="relative h-40 w-40 rounded-2xl overflow-hidden border border-white/20 bg-white/5">
                  <Image src={aboutPhoto} alt={`${brandName} photo`} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-32 w-32 rounded-2xl border border-dashed border-white/30 flex items-center justify-center text-white/60 text-sm">
                  Add a primary photo
                </div>
              )}
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-white">{brandName}</p>
                <p className="text-xs text-white/70">Property Management</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ContractorAboutContent({ data }: { data: any }) {
  const brandName = data.businessName;
  const aboutBio =
    data.aboutBio ||
    data.bio ||
    `Learn more about ${brandName}. Professional contractor services with quality workmanship and reliable service.`;
  const aboutPhoto = data.aboutPhoto || data.profilePhoto || data.logoUrl || null;
  const gallery = data.aboutGallery || data.portfolioImages || [];

  return (
    <main className="min-h-[70vh] w-full px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-white/70">About</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">{brandName}</h1>
          {data.tagline && (
            <p className="text-sm text-white/80 max-w-2xl">{data.tagline}</p>
          )}
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="space-y-6">
            {/* Bio */}
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-6 shadow-lg">
              <p className="whitespace-pre-line text-white leading-relaxed text-base">{aboutBio}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-2xl font-bold text-white">{data.avgRating?.toFixed(1) || '5.0'}</span>
                </div>
                <p className="text-xs text-white/70">{data.totalReviews || 0} Reviews</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">{data.completedJobs || 0}</div>
                <p className="text-xs text-white/70">Jobs Completed</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">{data.yearsExperience || 0}+</div>
                <p className="text-xs text-white/70">Years Experience</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">{Math.round((data.onTimeRate || 0) * 100)}%</div>
                <p className="text-xs text-white/70">On-Time Rate</p>
              </div>
            </div>

            {/* Specialties */}
            {data.specialties && data.specialties.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Specialties
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.specialties.map((specialty: string) => (
                    <Badge key={specialty} variant="secondary" className="bg-white/10 text-white border-white/20">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {gallery.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Portfolio</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.slice(0, 6).map((src: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative h-32 sm:h-40 rounded-xl overflow-hidden border border-white/20 bg-white/10"
                    >
                      <Image src={src} alt={`Portfolio ${idx + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Profile Card */}
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-6 flex flex-col items-center gap-4 shadow-lg">
              {aboutPhoto ? (
                <div className="relative h-40 w-40 rounded-2xl overflow-hidden border border-white/20 bg-white/5">
                  <Image src={aboutPhoto} alt={`${brandName} photo`} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-32 w-32 rounded-2xl border border-dashed border-white/30 flex items-center justify-center text-white/60 text-sm">
                  No photo
                </div>
              )}
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-white">{brandName}</p>
                <p className="text-xs text-white/70">{data.displayName}</p>
              </div>

              {/* Credentials */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {data.licenseNumber && (
                  <Badge variant="outline" className="text-xs gap-1 border-white/20 text-white">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Licensed
                  </Badge>
                )}
                {data.insuranceVerified && (
                  <Badge variant="outline" className="text-xs gap-1 border-white/20 text-white">
                    <Shield className="h-3 w-3 text-blue-400" /> Insured
                  </Badge>
                )}
                {data.backgroundChecked && (
                  <Badge variant="outline" className="text-xs gap-1 border-white/20 text-white">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Background Checked
                  </Badge>
                )}
              </div>
            </div>

            {/* Location */}
            {(data.baseCity || data.baseState) && (
              <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 shadow-lg">
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="h-5 w-5 text-white/70" />
                  <span>{[data.baseCity, data.baseState].filter(Boolean).join(', ')}</span>
                </div>
                {data.serviceRadius && (
                  <p className="text-sm text-white/70 mt-1 ml-7">
                    Serves within {data.serviceRadius} miles
                  </p>
                )}
              </div>
            )}

            {/* Service Areas */}
            {data.serviceAreas && data.serviceAreas.length > 0 && (
              <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 shadow-lg">
                <h3 className="text-sm font-semibold text-white mb-2">Service Areas</h3>
                <div className="flex flex-wrap gap-1">
                  {data.serviceAreas.map((area: string) => (
                    <Badge key={area} variant="secondary" className="text-xs bg-white/10 text-white/80">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 shadow-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-white/70" />
                <span className={`font-medium ${data.isAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {data.isAvailable ? 'Available for Work' : 'Currently Unavailable'}
                </span>
              </div>
              {data.availabilityNotes && (
                <p className="text-sm text-white/70 mt-1 ml-7">{data.availabilityNotes}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
