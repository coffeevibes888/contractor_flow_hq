'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Star,
  Shield,
  Clock,
  Wrench,
  Users,
  Briefcase,
  Calendar,
  MapPin,
  Building2,
  Loader2,
  Zap,
  Paintbrush,
  Thermometer,
  Hammer,
  Leaf,
  Home,
  Settings,
  Droplets,
  Image as ImageIcon,
  Play,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ContractorSearch from './contractor-search';

const SPECIALTIES = [
  { name: 'Plumbing', icon: Droplets },
  { name: 'Electrical', icon: Zap },
  { name: 'HVAC', icon: Thermometer },
  { name: 'Carpentry', icon: Hammer },
  { name: 'Painting', icon: Paintbrush },
  { name: 'Roofing', icon: Home },
  { name: 'Landscaping', icon: Leaf },
  { name: 'General Repairs', icon: Wrench },
  { name: 'Appliance Repair', icon: Settings },
];

interface Contractor {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  isPaymentReady: boolean;
  completedJobs: number;
  rating: number;
  responseTime: string;
  user: { id: string; name: string | null; image: string | null } | null;
  profilePhoto?: string | null;
  tagline?: string | null;
  baseCity?: string | null;
  baseState?: string | null;
  hourlyRate?: number | null;
  yearsExperience?: number | null;
  slug?: string | null;
  coverPhoto?: string | null;
  source?: 'profile' | 'contractor';
  meritScore?: number;
  isSponsored?: boolean;
  isNew?: boolean;
  isBoosted?: boolean;
}

interface JobMedia {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  type: string;
  caption: string | null;
}

interface OpenJob {
  id: string;
  title: string;
  description: string;
  priority: string;
  budgetMin: string | null;
  budgetMax: string | null;
  bidDeadline: string | null;
  scheduledDate: string | null;
  property: { name: string; city: string; state: string };
  unit: string | null;
  landlord: { id: string; name: string; logo: string | null };
  media: JobMedia[];
  mediaCount: number;
  bidCount: number;
  createdAt: string;
}

interface ContractorMarketplaceProps {
  initialView: 'contractors' | 'jobs';
  contractors: Contractor[];
  openJobsCount: number;
  searchParams: {
    q?: string;
    specialty?: string;
    sort?: string;
  };
  activeSpecialty?: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function ContractorMarketplace({
  initialView,
  contractors,
  openJobsCount,
  searchParams,
  activeSpecialty,
}: ContractorMarketplaceProps) {
  const router = useRouter();
  const [view, setView] = useState<'contractors' | 'jobs'>(initialView);
  const [openJobs, setOpenJobs] = useState<OpenJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const { q, sort } = searchParams;
  const specialty = activeSpecialty || searchParams.specialty;
  const specialties = SPECIALTIES;

  useEffect(() => {
    if (view === 'jobs') {
      fetchOpenJobs();
    }
  }, [view]);

  const fetchOpenJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch('/api/work-orders/open');
      const data = await res.json();
      if (data.success) {
        setOpenJobs(data.workOrders);
      }
    } catch (error) {
      console.error('Failed to fetch open jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleViewChange = (newView: 'contractors' | 'jobs') => {
    setView(newView);
    const params = new URLSearchParams();
    if (newView === 'jobs') params.set('view', 'jobs');
    if (q) params.set('q', q);
    if (specialty) params.set('specialty', specialty);
    router.push(`/contractor-marketplace?${params.toString()}`);
  };

  const formatBudget = (min: string | null, max: string | null) => {
    if (!min && !max) return 'Budget TBD';
    if (min && max)
      return `$${parseFloat(min).toLocaleString()} - $${parseFloat(max).toLocaleString()}`;
    if (min) return `From $${parseFloat(min).toLocaleString()}`;
    return `Up to $${parseFloat(max!).toLocaleString()}`;
  };

  return (
    <div className='min-h-screen bg-white'>
      {/* Hero Section */}
      <div className='pt-8 pb-12'>
        <div className='max-w-7xl mx-auto px-4'>
          <h1 className='text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-sky-700 bg-clip-text text-transparent'>
            Contractor Marketplace
          </h1>
          <p className='text-xl text-center text-black font-semibold mb-8 max-w-2xl mx-auto'>
            {view === 'contractors'
              ? 'Browse verified professionals for all your property maintenance needs'
              : 'Find open jobs and submit bids to grow your business'}
          </p>

          {/* View Toggle */}
          <div className='flex justify-center mb-8'>
            <div className='bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 rounded-xl p-1 flex gap-1 border border-black'>
              <Button
                className={
                  view === 'contractors'
                    ? 'bg-white text-blue-600 hover:bg-white/90 font-bold'
                    : 'text-white hover:bg-white/20 font-bold'
                }
                onClick={() => handleViewChange('contractors')}
              >
                <Users className='h-4 w-4 mr-2' />
                Find Contractors
              </Button>
              <Button
                className={
                  view === 'jobs'
                    ? 'bg-slate-400 text-white hover:bg-white/90 font-bold'
                    : 'text-white hover:bg-white/20 font-bold'
                }
                onClick={() => handleViewChange('jobs')}
              >
                <Briefcase className='h-4 w-4 mr-2' />
                Open Bids
                {openJobsCount > 0 && (
                  <Badge className='ml-2 bg-emerald-500 text-white font-bold'>
                    {openJobsCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {view === 'contractors' && (
            <ContractorSearch initialQuery={q} initialSpecialty={specialty} />
          )}
        </div>
      </div>

      {view === 'contractors' ? (
        <>
          {/* Categories */}
          <div className='max-w-7xl mx-auto px-4 py-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-bold text-black'>
                Browse by Specialty
              </h2>
              {specialty && (
                <Link
                  href='/contractor-marketplace'
                  className='px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500 via-violet-600 to-amber-200 border border-black text-slate-900 hover:bg-slate-200 text-sm font-bold transition-all'
                >
                  ✕ Clear Filter
                </Link>
              )}
            </div>
            <div className='flex flex-wrap gap-3'>
              {specialties.map((spec) => {
                const Icon = spec.icon;
                const isActive = specialty === spec.name;
                return (
                  <Link
                    key={spec.name}
                    href={`/contractor-marketplace?specialty=${encodeURIComponent(spec.name)}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all border ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 text-white border-black shadow-lg font-bold'
                        : 'bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 text-white font-bold hover:text-black hover:bg-blue-300 border-black shadow-2xl'
                    }`}
                  >
                    <Icon className='h-4 w-4' />
                    {spec.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Contractors Results */}
          <div className='max-w-7xl mx-auto px-4 pb-16'>
            <div className='flex items-center justify-between mb-6'>
              <p className='text-black font-semibold'>
                {contractors.length} contractor
                {contractors.length !== 1 ? 's' : ''} available
                {specialty && ` for ${specialty}`}
              </p>
              <div className='flex gap-2'>
                <Link
                  href={`/contractor-marketplace?${new URLSearchParams({ ...searchParams, sort: 'rating' }).toString()}`}
                >
                  <Button
                    variant={sort === 'rating' ? 'brand' : 'surface'}
                    size='sm'
                    className='font-bold'
                  >
                    Top Rated
                  </Button>
                </Link>
                <Link
                  href={`/contractor-marketplace?${new URLSearchParams({ ...searchParams, sort: 'jobs' }).toString()}`}
                >
                  <Button
                    variant={sort === 'jobs' ? 'brand' : 'surface'}
                    size='sm'
                    className='font-bold'
                  >
                    Most Jobs
                  </Button>
                </Link>
              </div>
            </div>

            {contractors.length === 0 ? (
              <Card className='bg-white border border-black shadow-2xl'>
                <CardContent className='py-16'>
                  <div className='text-center'>
                    <Wrench className='h-16 w-16 mx-auto text-slate-400 mb-4' />
                    <h3 className='text-xl font-bold text-slate-900 mb-2'>
                      No contractors found
                    </h3>
                    <p className='text-slate-600 font-semibold mb-4'>
                      Try adjusting your search or browse all categories
                    </p>
                    <Link href='/contractor-marketplace'>
                      <Button variant='surface' className='font-bold'>
                        View All Contractors
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {contractors.map((contractor) => (
                  <Link
                    key={contractor.id}
                    href={`/contractors/${contractor.slug || contractor.id}`}
                  >
                    <Card
                      className={`h-full bg-white border shadow-2xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer overflow-hidden group ${contractor.isSponsored ? 'border-amber-400 border-2' : 'border-black'}`}
                    >
                      {/* Banner / Ad / Logo image - big background */}
                      <div className='relative aspect-[4/3] bg-gradient-to-br from-blue-500 to-cyan-500'>
                        {contractor.coverPhoto ? (
                          <img
                            src={contractor.coverPhoto}
                            alt={`${contractor.name} banner`}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center'>
                            <div className='text-white text-6xl font-bold opacity-20'>
                              {contractor.name.charAt(0)}
                            </div>
                          </div>
                        )}

                        {/* Sponsored / New / Verified badges */}
                        <div className='absolute top-3 left-3 flex flex-col gap-1'>
                          {contractor.isSponsored && (
                            <span className='px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold'>
                              ✦ Sponsored
                            </span>
                          )}
                          {contractor.isNew && !contractor.isSponsored && (
                            <span className='px-2 py-0.5 rounded-full bg-violet-500 text-white text-xs font-bold'>
                              ✦ New
                            </span>
                          )}
                        </div>

                        {/* Verified Badge */}
                        {contractor.isPaymentReady && (
                          <div className='absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1'>
                            <Shield className='h-3 w-3' /> Verified
                          </div>
                        )}

                        {/* Profile / Face photo - small circle overlapping bottom */}
                        <div className='absolute -bottom-10 left-3'>
                          <div className='h-20 w-20 rounded-full bg-white p-1 shadow-xl'>
                            {contractor.profilePhoto ||
                            contractor.user?.image ? (
                              <img
                                src={
                                  contractor.profilePhoto ||
                                  contractor.user?.image ||
                                  ''
                                }
                                alt={contractor.name}
                                className='w-full h-full rounded-full object-cover'
                              />
                            ) : (
                              <div className='w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold'>
                                {contractor.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content Section - p-4 to match listing cards */}
                      <CardContent className='pt-12 pb-4 px-4'>
                        {/* Name and Rating */}
                        <div className='mb-3'>
                          <h3 className='font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors line-clamp-1'>
                            {contractor.name}
                          </h3>
                          <div className='flex items-center gap-1 mb-1'>
                            <Star className='h-4 w-4 fill-amber-400 text-amber-400' />
                            <span className='font-semibold text-slate-900'>
                              {contractor.rating.toFixed(1)}
                            </span>
                            <span className='text-slate-500 text-sm'>
                              ({contractor.completedJobs} jobs)
                            </span>
                          </div>
                          {contractor.tagline && (
                            <p className='text-sm text-slate-500 line-clamp-1'>
                              {contractor.tagline}
                            </p>
                          )}
                        </div>

                        {/* Location */}
                        {contractor.baseCity && contractor.baseState && (
                          <div className='flex items-center gap-1 text-sm text-slate-500 mb-3 line-clamp-1'>
                            <MapPin className='h-4 w-4 flex-shrink-0' />
                            {contractor.baseCity}, {contractor.baseState}
                          </div>
                        )}

                        {/* Specialties */}
                        <div className='flex flex-wrap gap-1.5 mb-3'>
                          {contractor.specialties.slice(0, 2).map((spec) => (
                            <span
                              key={spec}
                              className='px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium'
                            >
                              {spec}
                            </span>
                          ))}
                          {contractor.specialties.length > 2 && (
                            <span className='px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium'>
                              +{contractor.specialties.length - 2}
                            </span>
                          )}
                        </div>

                        {/* Footer Stats */}
                        <div className='flex items-center gap-3 text-sm text-slate-600'>
                          <span className='flex items-center gap-1'>
                            <Clock className='h-4 w-4' />
                            {contractor.responseTime}
                          </span>
                          <span className='flex items-center gap-1'>
                            <Wrench className='h-4 w-4' />
                            {contractor.completedJobs}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Open Jobs View - Grid Layout */
        <div className='max-w-7xl mx-auto px-4 pb-16'>
          {loadingJobs ? (
            <div className='flex items-center justify-center py-16'>
              <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
            </div>
          ) : openJobs.length === 0 ? (
            <Card className='bg-white border border-black shadow-2xl'>
              <CardContent className='py-16'>
                <div className='text-center'>
                  <Briefcase className='h-16 w-16 mx-auto text-slate-400 mb-4' />
                  <h3 className='text-xl font-bold text-slate-900 mb-2'>
                    No open jobs available
                  </h3>
                  <p className='text-slate-600 font-semibold mb-4'>
                    Check back later for new opportunities
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className='text-black font-semibold mb-6'>
                {openJobs.length} open job{openJobs.length !== 1 ? 's' : ''}{' '}
                available for bidding
              </p>
              <div className='grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {openJobs.map((job) => (
                  <Link key={job.id} href={`/contractors/jobs/${job.id}`}>
                    <Card className='h-full bg-white border border-black shadow-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group'>
                      {/* Image/Media Section */}
                      <div className='relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200'>
                        {job.media && job.media.length > 0 ? (
                          <>
                            {job.media[0].type === 'video' ? (
                              <div className='relative w-full h-full'>
                                <img
                                  src={
                                    job.media[0].thumbnailUrl ||
                                    job.media[0].url
                                  }
                                  alt={job.title}
                                  className='w-full h-full object-cover'
                                />
                                <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
                                  <div className='w-12 h-12 rounded-full bg-white/90 flex items-center justify-center'>
                                    <Play className='h-6 w-6 text-slate-700 ml-1' />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={job.media[0].url}
                                alt={job.title}
                                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                              />
                            )}
                            {job.mediaCount > 1 && (
                              <div className='absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs flex items-center gap-1'>
                                <ImageIcon className='h-3 w-3' />
                                {job.mediaCount}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className='w-full h-full flex items-center justify-center'>
                            <Wrench className='h-16 w-16 text-slate-300' />
                          </div>
                        )}
                        {/* Priority Badge */}
                        <Badge
                          className={`absolute top-2 left-2 ${priorityColors[job.priority]}`}
                        >
                          {job.priority.charAt(0).toUpperCase() +
                            job.priority.slice(1)}
                        </Badge>
                      </div>

                      {/* Content */}
                      <CardContent className='p-3'>
                        {/* Budget */}
                        <div className='flex items-center gap-1 text-lg font-bold text-blue-600 mb-1'>
                          <DollarSign className='h-4 w-4' />
                          {formatBudget(job.budgetMin, job.budgetMax).replace(
                            '$',
                            ''
                          )}
                        </div>

                        {/* Title */}
                        <h3 className='font-semibold text-slate-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors'>
                          {job.title}
                        </h3>

                        {/* Location */}
                        <div className='flex items-center gap-1 text-sm text-slate-500 mb-2'>
                          <MapPin className='h-3.5 w-3.5 flex-shrink-0' />
                          <span className='truncate'>
                            {job.property.city}, {job.property.state}
                          </span>
                        </div>

                        {/* Property */}
                        <div className='flex items-center gap-1 text-sm text-slate-500 mb-3'>
                          <Building2 className='h-3.5 w-3.5 flex-shrink-0' />
                          <span className='truncate'>
                            {job.property.name}
                            {job.unit && ` - ${job.unit}`}
                          </span>
                        </div>

                        {/* Footer */}
                        <div className='flex items-center justify-between pt-2 border-t border-slate-100'>
                          <div className='flex items-center gap-1.5'>
                            {job.landlord.logo ? (
                              <img
                                src={job.landlord.logo}
                                alt=''
                                className='h-5 w-5 rounded-full object-cover'
                              />
                            ) : (
                              <div className='h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold'>
                                {job.landlord.name.charAt(0)}
                              </div>
                            )}
                            <span className='text-xs text-slate-500 truncate max-w-[80px]'>
                              {job.landlord.name}
                            </span>
                          </div>
                          <div className='flex items-center gap-1 text-xs text-slate-500'>
                            <Users className='h-3.5 w-3.5' />
                            {job.bidCount} bid{job.bidCount !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Deadline if exists */}
                        {job.scheduledDate && (
                          <div className='flex items-center gap-1 text-xs text-orange-600 mt-2'>
                            <Calendar className='h-3 w-3' />
                            Needed by{' '}
                            {new Date(job.scheduledDate).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* CTA Section */}
      <div className='bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 border-t border-black text-white py-16'>
        <div className='max-w-4xl mx-auto px-4 text-center'>
          <h2 className='text-3xl font-bold mb-4'>
            {view === 'contractors'
              ? 'Are you a contractor?'
              : 'Need work done?'}
          </h2>
          <p className='text-white font-semibold mb-4 text-lg'>
            {view === 'contractors'
              ? 'Join our marketplace and connect with property managers looking for reliable professionals'
              : 'Post your job and let contractors compete for your business'}
          </p>
          <p className='text-emerald-200 mb-8 text-sm font-bold'>
            ✓ Free to use • Only $1 fee per payment or cashout
          </p>
          <Link
            href={
              view === 'contractors'
                ? '/sign-up?role=contractor'
                : '/sign-up?role=landlord'
            }
          >
            <Button size='lg' variant='brand' className='font-bold'>
              {view === 'contractors' ? 'Join as a Contractor' : 'Post a Job'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
