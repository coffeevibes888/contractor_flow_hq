'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Briefcase, Building2, Calendar, CheckCircle, Clock,
  DollarSign, Eye, GraduationCap, Loader2, MapPin, Send, Share2,
  Star, ThumbsUp, Users, Globe, Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const JOB_TYPES: Record<string, string> = {
  'full-time': 'Full-Time', 'part-time': 'Part-Time', 'contract': 'Contract',
  'temporary': 'Temporary', 'internship': 'Internship',
};
const EXPERIENCE_LABELS: Record<string, string> = {
  entry: 'Entry Level', mid: 'Mid Level', senior: 'Senior', executive: 'Executive',
};
const CATEGORY_LABELS: Record<string, string> = {
  'property-management': 'Property Management', maintenance: 'Maintenance',
  'virtual-assistant': 'Virtual Assistant', leasing: 'Leasing', accounting: 'Accounting',
  construction: 'Construction', landscaping: 'Landscaping', cleaning: 'Cleaning',
  admin: 'Admin & Office', other: 'Other', general: 'General',
};

interface Review {
  id: string; rating: number; title: string; review: string;
  pros: string | null; cons: string | null; isAnonymous: boolean; createdAt: string;
}

interface Job {
  id: string; title: string; description: string; type: string; category: string;
  location: string; isRemote: boolean; salary: string | null;
  salaryMin: string | null; salaryMax: string | null; salaryType: string;
  companyName: string | null; companyLogo: string | null; companyAbout: string | null;
  experienceLevel: string; requirements: string | null; benefits: string | null;
  views: number; applicantCount: number; reviewCount: number; reviews: Review[];
  createdAt: string;
}

interface Props {
  job: Job;
  isAuthenticated: boolean;
  hasApplied: boolean;
}

export function JobDetailView({ job, isAuthenticated, hasApplied }: Props) {
  const router = useRouter();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applied, setApplied] = useState(hasApplied);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', coverLetter: '', resumeUrl: '' });

  const formatSalary = (min: string | null, max: string | null, type: string) => {
    const suffix = type === 'hourly' ? '/hr' : type === 'yearly' ? '/yr' : '';
    if (min && max) return `$${parseFloat(min).toLocaleString()} – $${parseFloat(max).toLocaleString()}${suffix}`;
    if (min) return `From $${parseFloat(min).toLocaleString()}${suffix}`;
    if (max) return `Up to $${parseFloat(max).toLocaleString()}${suffix}`;
    return null;
  };

  const handleApply = async () => {
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApplied(true);
        setShowApplyForm(false);
        toast.success('Application submitted!');
      } else {
        toast.error(data.error || 'Failed to apply');
      }
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      router.push(`/sign-in?callbackUrl=/jobs/${job.id}/apply`);
      return;
    }
    router.push(`/jobs/${job.id}/apply`);
  };

  // Build a static map URL using OpenStreetMap embed
  const mapQuery = encodeURIComponent(job.location);
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik&marker=0,0`;
  // Use a geocoding-free approach: show a general area map via nominatim search
  const mapSearchUrl = `https://www.openstreetmap.org/search?query=${mapQuery}`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${mapQuery}&zoom=11&size=400x200&scale=2&maptype=roadmap&key=`;

  const avgRating = job.reviews.length > 0
    ? (job.reviews.reduce((s, r) => s + r.rating, 0) / job.reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/jobs" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to Jobs
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}>
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
            {!applied && !showApplyForm && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={handleApplyClick}>
                <Send className="h-4 w-4 mr-1" /> Apply Now
              </Button>
            )}
            {applied && (
              <Badge className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5">
                <CheckCircle className="h-4 w-4 mr-1" /> Applied
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column — Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <div className="flex items-start gap-4">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt="" className="h-16 w-16 rounded-xl object-cover border flex-shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl font-bold flex-shrink-0">
                    {(job.companyName || 'J').charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">{job.title}</h1>
                  <p className="text-lg text-slate-600 font-medium">{job.companyName || 'Company'}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location}</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {JOB_TYPES[job.type] || job.type}</span>
                    <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel}</span>
                    {job.isRemote && <Badge className="bg-cyan-100 text-cyan-700 font-semibold">Remote</Badge>}
                  </div>
                </div>
              </div>

              {/* Salary */}
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryType) && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xl font-bold text-emerald-600">
                  <DollarSign className="h-5 w-5" />
                  {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {job.views} views</span>
                <Badge variant="outline" className="font-medium">{CATEGORY_LABELS[job.category] || job.category}</Badge>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Job Description</h2>
              <div className="prose prose-slate prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{job.description}</p>
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Requirements</h2>
                <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">{job.requirements}</p>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && (
              <div className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Benefits</h2>
                <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">{job.benefits}</p>
              </div>
            )}

            {/* Apply Form */}
            {showApplyForm && !applied && (
              <div className="bg-white rounded-xl border p-6 shadow-sm" id="apply">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Apply for this Position</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Full Name *</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="mt-1" />
                    </div>
                    <div>
                      <Label className="font-semibold">Email *</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Phone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" className="mt-1" />
                    </div>
                    <div>
                      <Label className="font-semibold">Resume URL</Label>
                      <Input value={form.resumeUrl} onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })} placeholder="Link to your resume" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="font-semibold">Cover Letter</Label>
                    <Textarea value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} placeholder="Tell the employer why you're a great fit..." rows={5} className="mt-1" />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowApplyForm(false)}>Cancel</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={handleApply} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Submit Application
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Company Reviews */}
            {job.reviews.length > 0 && (
              <div className="bg-white rounded-xl border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Company Reviews</h2>
                  {avgRating && (
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="h-5 w-5 fill-amber-400" /> {avgRating}
                      <span className="text-slate-400 font-normal text-sm ml-1">({job.reviewCount} review{job.reviewCount !== 1 ? 's' : ''})</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {job.reviews.map((review) => (
                    <div key={review.id} className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-4 w-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          ))}
                        </div>
                        <span className="font-semibold text-sm text-slate-900">{review.title}</span>
                        <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm text-slate-600">{review.review}</p>
                      {review.pros && <p className="text-sm text-emerald-600 mt-1"><ThumbsUp className="h-3 w-3 inline mr-1" /> {review.pros}</p>}
                      {review.cons && <p className="text-sm text-red-500 mt-1"><Flag className="h-3 w-3 inline mr-1" /> {review.cons}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column — Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <Card className="border shadow-sm sticky top-20">
              <CardContent className="p-5">
                {applied ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold text-slate-900">You&apos;ve Applied</p>
                    <p className="text-sm text-slate-500 mt-1">The employer will review your application</p>
                  </div>
                ) : (
                  <>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold h-11 text-base" onClick={handleApplyClick}>
                      <Send className="h-4 w-4 mr-2" /> Apply Now
                    </Button>
                    <p className="text-xs text-slate-500 text-center mt-2">Free to apply • No fees</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Location Map */}
            <Card className="border shadow-sm overflow-hidden">
              <div className="aspect-[4/3] bg-slate-200 relative">
                <iframe
                  title="Job Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">{job.location}</p>
                    {job.isRemote && <p className="text-sm text-cyan-600 font-medium">Remote option available</p>}
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:underline mt-3 font-medium"
                >
                  <Globe className="h-4 w-4" /> View on Google Maps
                </a>
              </CardContent>
            </Card>

            {/* Company Info */}
            {(job.companyName || job.companyAbout) && (
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-bold text-slate-900 mb-3">About the Company</h3>
                  <div className="flex items-center gap-3 mb-3">
                    {job.companyLogo ? (
                      <img src={job.companyLogo} alt="" className="h-10 w-10 rounded-lg object-cover border" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                        {(job.companyName || 'C').charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{job.companyName}</p>
                      {avgRating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{avgRating}</span>
                          <span className="text-slate-400">({job.reviewCount})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {job.companyAbout && (
                    <p className="text-sm text-slate-600 leading-relaxed">{job.companyAbout}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Job Summary */}
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-bold text-slate-900 mb-3">Job Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Job Type</span>
                    <span className="font-medium text-slate-900">{JOB_TYPES[job.type] || job.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Experience</span>
                    <span className="font-medium text-slate-900">{EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category</span>
                    <span className="font-medium text-slate-900">{CATEGORY_LABELS[job.category] || job.category}</span>
                  </div>
                  {formatSalary(job.salaryMin, job.salaryMax, job.salaryType) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Salary</span>
                      <span className="font-medium text-emerald-600">{formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remote</span>
                    <span className="font-medium text-slate-900">{job.isRemote ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Posted</span>
                    <span className="font-medium text-slate-900">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
