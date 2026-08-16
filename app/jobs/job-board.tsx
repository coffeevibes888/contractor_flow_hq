'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase, MapPin, Clock, DollarSign, Building2, Users, Search,
  Star, Shield, ChevronRight, Loader2, Filter, User,
  GraduationCap, Wrench, Home, Paintbrush, Calculator, Headphones,
  HardHat, Leaf, Settings, Monitor, FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

const JOB_CATEGORIES = [
  { id: 'property-management', label: 'Property Management', icon: Building2 },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'virtual-assistant', label: 'Virtual Assistant', icon: Headphones },
  { id: 'leasing', label: 'Leasing', icon: FileText },
  { id: 'accounting', label: 'Accounting', icon: Calculator },
  { id: 'construction', label: 'Construction', icon: HardHat },
  { id: 'landscaping', label: 'Landscaping', icon: Leaf },
  { id: 'cleaning', label: 'Cleaning', icon: Home },
  { id: 'admin', label: 'Admin & Office', icon: Monitor },
  { id: 'other', label: 'Other', icon: Settings },
];

const JOB_TYPES: Record<string, string> = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  'contract': 'Contract',
  'temporary': 'Temporary',
  'internship': 'Internship',
};

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  executive: 'Executive',
};

interface Job {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  location: string;
  isRemote: boolean;
  salary: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryType: string;
  companyName: string | null;
  companyLogo: string | null;
  experienceLevel: string;
  requirements: string | null;
  benefits: string | null;
  views: number;
  applicantCount: number;
  createdAt: string;
}

interface Seeker {
  id: string;
  headline: string;
  bio: string | null;
  profilePhoto: string | null;
  coverPhoto: string | null;
  firstName: string;
  lastName: string;
  city: string | null;
  state: string | null;
  isAvailable: boolean;
  desiredJobTypes: string[];
  desiredCategories: string[];
  skills: string[];
  certifications: string[];
  yearsExperience: number | null;
  education: string | null;
  createdAt: string;
}

interface JobBoardProps {
  initialView: 'jobs' | 'seekers';
  initialJobs: Job[];
  seekerCount: number;
  jobCount: number;
  isAuthenticated: boolean;
  userRole: string;
  searchParams: {
    category?: string;
    type?: string;
    q?: string;
    location?: string;
  };
}

export default function JobBoard({
  initialView,
  initialJobs,
  seekerCount,
  jobCount,
  isAuthenticated,
  userRole,
  searchParams,
}: JobBoardProps) {
  const router = useRouter();
  const [view, setView] = useState<'jobs' | 'seekers'>(initialView);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.q || '');
  const [locationQuery, setLocationQuery] = useState(searchParams.location || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.category || '');
  const [activeType, setActiveType] = useState(searchParams.type || '');

  const handleViewChange = (newView: 'jobs' | 'seekers') => {
    setView(newView);
    const params = new URLSearchParams();
    if (newView !== 'jobs') params.set('view', newView);
    router.push(`/jobs?${params.toString()}`);
  };

  const handleApplyClick = (job: Job) => {
    router.push(`/jobs/${job.id}`);
  };

  useEffect(() => {
    if (view === 'seekers') fetchSeekers();
  }, [view]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (locationQuery) params.set('location', locationQuery);
      if (activeCategory) params.set('category', activeCategory);
      if (activeType) params.set('type', activeType);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.success) setJobs(data.jobs.map((j: any) => ({
        ...j,
        salaryMin: j.salaryMin?.toString() || null,
        salaryMax: j.salaryMax?.toString() || null,
        applicantCount: j._count?.applicants || 0,
        createdAt: j.createdAt,
      })));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const fetchSeekers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (locationQuery) params.set('location', locationQuery);
      if (activeCategory) params.set('category', activeCategory);
      const res = await fetch(`/api/jobs/seekers?${params.toString()}`);
      const data = await res.json();
      if (data.success) setSeekers(data.seekers);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleSearch = () => {
    if (view === 'jobs') fetchJobs();
    else fetchSeekers();
  };

  const formatSalary = (min: string | null, max: string | null, type: string) => {
    const suffix = type === 'hourly' ? '/hr' : type === 'yearly' ? '/yr' : '';
    if (min && max) return `$${parseFloat(min).toLocaleString()} - $${parseFloat(max).toLocaleString()}${suffix}`;
    if (min) return `From $${parseFloat(min).toLocaleString()}${suffix}`;
    if (max) return `Up to $${parseFloat(max).toLocaleString()}${suffix}`;
    return null;
  };


  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Real Estate Job Board
          </h1>
          <p className="text-xl text-center text-black font-semibold mb-8 max-w-2xl mx-auto">
            {view === 'jobs'
              ? 'Find your next opportunity in property management, contracting, and real estate'
              : 'Browse talented professionals looking for work in the industry'}
          </p>

          {/* View Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 rounded-xl p-1 flex gap-1 border border-black">
              <Button
                className={view === 'jobs'
                  ? 'bg-white text-emerald-700 hover:bg-white/90 font-bold'
                  : 'text-white hover:bg-white/20 font-bold'}
                onClick={() => handleViewChange('jobs')}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Open Jobs
                {jobCount > 0 && (
                  <Badge className="ml-2 bg-emerald-500 text-white font-bold">{jobCount}</Badge>
                )}
              </Button>
              <Button
                className={view === 'seekers'
                  ? 'bg-white text-emerald-700 hover:bg-white/90 font-bold'
                  : 'text-white hover:bg-white/20 font-bold'}
                onClick={() => handleViewChange('seekers')}
              >
                <Users className="h-4 w-4 mr-2" />
                Find Talent
                {seekerCount > 0 && (
                  <Badge className="ml-2 bg-cyan-500 text-white font-bold">{seekerCount}</Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto flex gap-2 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={view === 'jobs' ? 'Search jobs, companies, keywords...' : 'Search skills, names, titles...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 border-black font-semibold"
              />
            </div>
            <div className="w-48 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Location"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 border-black font-semibold"
              />
            </div>
            <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-black">Browse by Category</h2>
          {activeCategory && (
            <button
              onClick={() => { setActiveCategory(''); fetchJobs(); }}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 border border-black text-white text-sm font-bold"
            >
              ✕ Clear Filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {JOB_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(isActive ? '' : cat.id);
                  setTimeout(() => view === 'jobs' ? fetchJobs() : fetchSeekers(), 0);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-black shadow-lg font-bold'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:opacity-90 border-black shadow-2xl'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {view === 'jobs' ? (
          <>
            {/* Job Type Filters */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-sm font-semibold text-slate-600">Type:</span>
              {Object.entries(JOB_TYPES).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setActiveType(activeType === key ? '' : key); setTimeout(fetchJobs, 0); }}
                  className={`px-3 py-1 rounded-full text-sm font-semibold border transition-all ${
                    activeType === key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6">
              <p className="text-black font-semibold">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} available
                {activeCategory && ` in ${JOB_CATEGORIES.find(c => c.id === activeCategory)?.label}`}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : jobs.length === 0 ? (
              <Card className="bg-white border border-black shadow-2xl">
                <CardContent className="py-16">
                  <div className="text-center">
                    <Briefcase className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No jobs found</h3>
                    <p className="text-slate-600 font-semibold">Try adjusting your search or check back later for new opportunities</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {jobs.map((job) => (
                  <Card
                    key={job.id}
                    className="h-full bg-white border border-black shadow-2xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer overflow-hidden group"
                    onClick={() => handleApplyClick(job)}
                  >
                    {/* Company Banner */}
                    <div className="relative h-32 bg-gradient-to-br from-emerald-500 to-teal-600">
                      {job.companyLogo ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                          <img src={job.companyLogo} alt="" className="h-16 w-16 rounded-xl object-cover shadow-lg" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-16 w-16 rounded-xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                            {(job.companyName || 'J').charAt(0)}
                          </div>
                        </div>
                      )}

                      {/* Type Badge */}
                      <Badge className="absolute top-3 left-3 bg-white/90 text-emerald-700 font-bold text-xs">
                        {JOB_TYPES[job.type] || job.type}
                      </Badge>

                      {/* Remote Badge */}
                      {job.isRemote && (
                        <Badge className="absolute top-3 right-3 bg-cyan-500 text-white font-bold text-xs">
                          Remote
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-4">
                      {/* Salary */}
                      {formatSalary(job.salaryMin, job.salaryMax, job.salaryType) && (
                        <div className="flex items-center gap-1 text-lg font-bold text-emerald-600 mb-1">
                          <DollarSign className="h-4 w-4" />
                          {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors">
                        {job.title}
                      </h3>

                      {/* Company */}
                      {job.companyName && (
                        <div className="flex items-center gap-1 text-sm text-slate-600 mb-2">
                          <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{job.companyName}</span>
                        </div>
                      )}

                      {/* Location */}
                      <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                          {EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                          {JOB_CATEGORIES.find(c => c.id === job.category)?.label || job.category}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Users className="h-3.5 w-3.5" />
                          {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Seekers View */
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-black font-semibold">
                {seekers.length} professional{seekers.length !== 1 ? 's' : ''} looking for work
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : seekers.length === 0 ? (
              <Card className="bg-white border border-black shadow-2xl">
                <CardContent className="py-16">
                  <div className="text-center">
                    <Users className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No profiles yet</h3>
                    <p className="text-slate-600 font-semibold mb-4">Be the first to create a job seeker profile</p>
                    {isAuthenticated ? (
                      <Link href="/jobs/profile">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                          Create Your Profile
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/sign-up">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                          Sign Up Free
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {seekers.map((seeker) => (
                  <Card
                    key={seeker.id}
                    className="h-full bg-white border border-black shadow-2xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer overflow-hidden group"
                  >
                    {/* Cover / Banner */}
                    <div className="relative h-28 bg-gradient-to-br from-cyan-500 to-blue-600">
                      {seeker.coverPhoto && (
                        <img src={seeker.coverPhoto} alt="" className="w-full h-full object-cover" />
                      )}
                      {/* Profile Photo */}
                      <div className="absolute -bottom-10 left-4">
                        <div className="h-20 w-20 rounded-full bg-white p-1 shadow-xl">
                          {seeker.profilePhoto ? (
                            <img src={seeker.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                              {seeker.firstName.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>

                      {seeker.isAvailable && (
                        <Badge className="absolute top-3 right-3 bg-emerald-500 text-white font-bold text-xs">
                          Available
                        </Badge>
                      )}
                    </div>

                    <CardContent className="pt-12 pb-4 px-4">
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-cyan-600 transition-colors line-clamp-1">
                        {seeker.firstName} {seeker.lastName}
                      </h3>
                      <p className="text-sm text-slate-600 font-medium line-clamp-1 mb-2">{seeker.headline}</p>

                      {seeker.city && seeker.state && (
                        <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          {seeker.city}, {seeker.state}
                        </div>
                      )}

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {seeker.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                        {seeker.skills.length > 3 && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            +{seeker.skills.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        {seeker.yearsExperience && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {seeker.yearsExperience}yr exp
                          </span>
                        )}
                        {seeker.desiredJobTypes.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {seeker.desiredJobTypes.map(t => JOB_TYPES[t] || t).join(', ')}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 border-t border-black text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Looking for work?
          </h2>
          <p className="text-white font-semibold mb-4 text-lg">
            Create your free profile and let employers find you
          </p>
          <p className="text-emerald-200 mb-8 text-sm font-bold">
            ✓ 100% free for job seekers
          </p>
          <Link href={isAuthenticated ? '/jobs/profile' : '/sign-up'}>
            <Button size="lg" variant="brand" className="font-bold bg-white text-emerald-700 hover:bg-white/90">
              Create Your Profile
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
}
