'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin, Calendar, Clock, DollarSign, Building2, Users, Shield,
  ChevronLeft, Send, Edit2, CheckCircle, AlertCircle, Briefcase,
  Star, MessageSquare, Loader2, Timer, Award, X, ChevronRight, Play,
  Image as ImageIcon, Wrench, Package, FileCheck, Plus, Trash2, Sparkles,
  CalendarClock, FileText, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import BidMessageThread from '@/components/contractor/bid-message-thread';
import JobTracker from '@/components/contractor/job-tracker';
import MilestonesPanel from '@/components/contractor/milestones-panel';

interface JobMedia {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  type: string;
  caption: string | null;
}

interface Job {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  budgetMin: string | null;
  budgetMax: string | null;
  bidDeadline: string | null;
  scheduledDate: string | null;
  createdAt: string;
  property: { name: string; type: string; city: string; state: string };
  unit: string | null;
  landlord: { id: string; name: string; logo: string | null; memberSince: string; totalJobs: number; totalProperties: number };
  media: JobMedia[];
  mediaCount: number;
  bidCount: number;
}

interface MyBid {
  id: string;
  amount: string;
  laborCost: string | null;
  materialsCost: string | null;
  estimatedHours: string | null;
  proposedStartDate: string | null;
  estimatedCompletionDate: string | null;
  inclusions: string[];
  exclusions: string[];
  warrantyDays: number | null;
  willPullPermits: boolean | null;
  paymentTerms: string | null;
  validUntil: string | null;
  message: string | null;
  status: string;
  createdAt: string;
}

interface SimilarJob {
  id: string;
  title: string;
  budgetMin: string | null;
  budgetMax: string | null;
  priority: string;
  city: string;
  bidCount: number;
  createdAt: string;
}

interface Lifecycle {
  status:
    | 'pending' | 'funded' | 'scheduled' | 'in_progress'
    | 'awaiting_approval' | 'released' | 'disputed' | 'refunded' | 'cancelled';
  escrowAmount: number | null;
  pmApprovalDeadline: string | null;
  scheduledDate: string | null;
  acceptedBidId: string | null;
}

interface JobDetailClientProps {
  job: Job;
  myBid: MyBid | null;
  myContractorId: string | null;
  currentUserId: string | null;
  isLoggedIn: boolean;
  isContractor: boolean;
  similarJobs: SimilarJob[];
  lowestBidAmount: number | null;
  lifecycle: Lifecycle;
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-slate-100 text-slate-700', label: 'Low Priority' },
  medium: { color: 'bg-blue-100 text-blue-700', label: 'Medium Priority' },
  high: { color: 'bg-orange-100 text-orange-700', label: 'High Priority' },
  urgent: { color: 'bg-red-100 text-red-700', label: 'Urgent' },
};

export default function JobDetailClient({ job, myBid, myContractorId, currentUserId, isLoggedIn, isContractor, similarJobs, lowestBidAmount, lifecycle }: JobDetailClientProps) {
  const isMyJob = !!myBid && myBid.id === lifecycle.acceptedBidId;
  const showTracker = isMyJob && lifecycle.status !== 'pending';
  const router = useRouter();
  const { toast } = useToast();
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bidForm, setBidForm] = useState({
    amount: myBid?.amount || '',
    laborCost: myBid?.laborCost || '',
    materialsCost: myBid?.materialsCost || '',
    estimatedHours: myBid?.estimatedHours || '',
    proposedStartDate: myBid?.proposedStartDate?.split('T')[0] || '',
    estimatedCompletionDate: myBid?.estimatedCompletionDate?.split('T')[0] || '',
    inclusions: myBid?.inclusions?.length ? myBid.inclusions : [''],
    exclusions: myBid?.exclusions?.length ? myBid.exclusions : [''],
    warrantyDays: myBid?.warrantyDays?.toString() || '',
    willPullPermits: myBid?.willPullPermits ?? null as boolean | null,
    paymentTerms: myBid?.paymentTerms || '',
    validUntil: myBid?.validUntil?.split('T')[0] || '',
    message: myBid?.message || '',
  });

  const updateInclusion = (idx: number, val: string) => {
    setBidForm((f) => ({ ...f, inclusions: f.inclusions.map((v, i) => (i === idx ? val : v)) }));
  };
  const addInclusion = () =>
    setBidForm((f) => ({ ...f, inclusions: [...f.inclusions, ''] }));
  const removeInclusion = (idx: number) =>
    setBidForm((f) => ({
      ...f,
      inclusions: f.inclusions.length === 1 ? [''] : f.inclusions.filter((_, i) => i !== idx),
    }));

  const updateExclusion = (idx: number, val: string) => {
    setBidForm((f) => ({ ...f, exclusions: f.exclusions.map((v, i) => (i === idx ? val : v)) }));
  };
  const addExclusion = () =>
    setBidForm((f) => ({ ...f, exclusions: [...f.exclusions, ''] }));
  const removeExclusion = (idx: number) =>
    setBidForm((f) => ({
      ...f,
      exclusions: f.exclusions.length === 1 ? [''] : f.exclusions.filter((_, i) => i !== idx),
    }));

  const breakdownSum =
    (parseFloat(bidForm.laborCost || '0') || 0) +
    (parseFloat(bidForm.materialsCost || '0') || 0);
  const totalAmount = parseFloat(bidForm.amount || '0') || 0;
  const breakdownMatches =
    !bidForm.laborCost && !bidForm.materialsCost
      ? null
      : Math.abs(breakdownSum - totalAmount) < 0.01;

  const formatBudget = (min: string | null, max: string | null) => {
    if (!min && !max) return 'Budget Flexible';
    if (min && max) return `${parseFloat(min).toLocaleString()} - ${parseFloat(max).toLocaleString()}`;
    if (min) return `From ${parseFloat(min).toLocaleString()}`;
    return `Up to ${parseFloat(max!).toLocaleString()}`;
  };

  const handleSubmitBid = async () => {
    if (!bidForm.amount) {
      toast({ title: 'Error', description: 'Please enter a bid amount', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/work-orders/${job.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(bidForm.amount),
          laborCost: bidForm.laborCost || null,
          materialsCost: bidForm.materialsCost || null,
          estimatedHours: bidForm.estimatedHours || null,
          proposedStartDate: bidForm.proposedStartDate || null,
          estimatedCompletionDate: bidForm.estimatedCompletionDate || null,
          inclusions: bidForm.inclusions.filter((v) => v.trim()),
          exclusions: bidForm.exclusions.filter((v) => v.trim()),
          warrantyDays: bidForm.warrantyDays || null,
          willPullPermits: bidForm.willPullPermits,
          paymentTerms: bidForm.paymentTerms || null,
          validUntil: bidForm.validUntil || null,
          message: bidForm.message || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit bid');
      toast({ title: myBid ? 'Bid Updated' : 'Bid Submitted!', description: myBid ? 'Your bid has been updated' : 'Your proposal has been sent' });
      setBidDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to submit bid', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openLightbox = (index: number) => { setLightboxIndex(index); setLightboxOpen(true); };
  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % job.media.length);
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + job.media.length) % job.media.length);

  const timeAgo = formatDistanceToNow(new Date(job.createdAt), { addSuffix: true });
  const memberSince = new Date(job.landlord.memberSince).getFullYear();


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/contractors?view=jobs" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors">
            <ChevronLeft className="h-4 w-4" />Back to Jobs
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={priorityConfig[job.priority].color}>{priorityConfig[job.priority].label}</Badge>
                <span className="text-white/70 text-sm">Posted {timeAgo}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.property.city}, {job.property.state}</span>
                <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{job.property.name}</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{job.bidCount} proposal{job.bidCount !== 1 ? 's' : ''}</span>
                {job.mediaCount > 0 && <span className="flex items-center gap-1"><ImageIcon className="h-4 w-4" />{job.mediaCount} photo{job.mediaCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatBudget(job.budgetMin, job.budgetMax)}</p>
              <p className="text-white/70 text-sm">Project Budget</p>
              
              {lowestBidAmount && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <p className="text-xl font-semibold text-emerald-300">
                    ${lowestBidAmount.toLocaleString()}
                  </p>
                  <p className="text-white/70 text-xs">Current Lowest Bid</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Media Gallery */}
            {job.media.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-blue-600" />Photos & Videos</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {job.media.map((m, idx) => (
                      <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer group" onClick={() => openLightbox(idx)}>
                        {m.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800">
                            <img src={m.thumbnailUrl || m.url} alt="" className="w-full h-full object-cover opacity-70" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="h-6 w-6 text-slate-700 ml-1" /></div>
                            </div>
                          </div>
                        ) : (
                          <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Description */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-blue-600" />Job Details</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{job.description}</p>
                </div>
                <Separator className="my-6" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="h-5 w-5 text-blue-600" /></div>
                    <div><p className="text-sm text-slate-500">Property Type</p><p className="font-medium text-slate-900 capitalize">{job.property.type}</p></div>
                  </div>
                  {job.unit && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-violet-100 rounded-lg"><Building2 className="h-5 w-5 text-violet-600" /></div>
                      <div><p className="text-sm text-slate-500">Unit</p><p className="font-medium text-slate-900">{job.unit}</p></div>
                    </div>
                  )}
                  {job.scheduledDate && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-emerald-100 rounded-lg"><Calendar className="h-5 w-5 text-emerald-600" /></div>
                      <div><p className="text-sm text-slate-500">Preferred Date</p><p className="font-medium text-slate-900">{new Date(job.scheduledDate).toLocaleDateString()}</p></div>
                    </div>
                  )}
                  {job.bidDeadline && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-amber-100 rounded-lg"><Timer className="h-5 w-5 text-amber-600" /></div>
                      <div><p className="text-sm text-slate-500">Bid Deadline</p><p className="font-medium text-slate-900">{new Date(job.bidDeadline).toLocaleDateString()}</p></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Live job tracker (Uber-style) — only when this contractor's bid was accepted */}
            {showTracker && currentUserId && (
              <>
                <JobTracker
                  workOrderId={job.id}
                  lifecycleStatus={lifecycle.status}
                  viewerRole="contractor"
                  escrowAmount={lifecycle.escrowAmount}
                  pmApprovalDeadline={lifecycle.pmApprovalDeadline}
                  scheduledDate={lifecycle.scheduledDate}
                />
                <MilestonesPanel
                  workOrderId={job.id}
                  viewerRole="contractor"
                  totalEscrow={lifecycle.escrowAmount || 0}
                  lifecycleStatus={lifecycle.status}
                />
              </>
            )}

            {/* My Bid Status */}
            {myBid && (
              <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-blue-50/30 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-cyan-700">
                    <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />Your Quote</span>
                    <Badge className={myBid.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : myBid.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                      {myBid.status.charAt(0).toUpperCase() + myBid.status.slice(1)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Headline price */}
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-2 pb-4 border-b border-cyan-100">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Total Quote</p>
                      <p className="text-3xl font-bold text-cyan-700">${parseFloat(myBid.amount).toLocaleString()}</p>
                    </div>
                    {(myBid.laborCost || myBid.materialsCost) && (
                      <div className="text-xs text-slate-600 space-y-0.5">
                        {myBid.laborCost && <div className="flex items-center gap-1.5"><Wrench className="h-3 w-3" />Labor: <span className="font-semibold">${parseFloat(myBid.laborCost).toLocaleString()}</span></div>}
                        {myBid.materialsCost && <div className="flex items-center gap-1.5"><Package className="h-3 w-3" />Materials: <span className="font-semibold">${parseFloat(myBid.materialsCost).toLocaleString()}</span></div>}
                      </div>
                    )}
                  </div>

                  {/* Timeline grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {myBid.estimatedHours && (
                      <div><p className="text-xs text-slate-500">Hours</p><p className="font-semibold text-slate-900">{myBid.estimatedHours}</p></div>
                    )}
                    {myBid.proposedStartDate && (
                      <div><p className="text-xs text-slate-500">Start</p><p className="font-semibold text-slate-900">{new Date(myBid.proposedStartDate).toLocaleDateString()}</p></div>
                    )}
                    {myBid.estimatedCompletionDate && (
                      <div><p className="text-xs text-slate-500">Complete by</p><p className="font-semibold text-slate-900">{new Date(myBid.estimatedCompletionDate).toLocaleDateString()}</p></div>
                    )}
                    {myBid.warrantyDays != null && (
                      <div><p className="text-xs text-slate-500">Warranty</p><p className="font-semibold text-slate-900">{myBid.warrantyDays} days</p></div>
                    )}
                  </div>

                  {/* Scope */}
                  {(myBid.inclusions.length > 0 || myBid.exclusions.length > 0) && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {myBid.inclusions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1.5"><CheckCircle className="h-3 w-3" />Included</p>
                          <ul className="space-y-1">
                            {myBid.inclusions.map((it, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">&bull;</span>{it}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {myBid.exclusions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1.5"><X className="h-3 w-3" />Not included</p>
                          <ul className="space-y-1">
                            {myBid.exclusions.map((it, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5">
                                <span className="text-red-400 mt-0.5">&bull;</span>{it}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Terms row */}
                  {(myBid.paymentTerms || myBid.validUntil || myBid.willPullPermits != null) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {myBid.paymentTerms && (
                        <Badge variant="outline" className="bg-white"><DollarSign className="h-3 w-3 mr-1" />{myBid.paymentTerms}</Badge>
                      )}
                      {myBid.validUntil && (
                        <Badge variant="outline" className="bg-white"><Timer className="h-3 w-3 mr-1" />Valid until {new Date(myBid.validUntil).toLocaleDateString()}</Badge>
                      )}
                      {myBid.willPullPermits === true && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><FileCheck className="h-3 w-3 mr-1" />Pulls permits</Badge>
                      )}
                      {myBid.willPullPermits === false && (
                        <Badge variant="outline" className="bg-slate-50">No permits</Badge>
                      )}
                    </div>
                  )}

                  {/* Cover letter */}
                  {myBid.message && (
                    <div className="p-3 bg-white rounded-lg border border-cyan-200">
                      <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5"><FileText className="h-3 w-3" />Cover Letter</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{myBid.message}</p>
                    </div>
                  )}

                  {myBid.status === 'pending' && (
                    <Button variant="outline" className="border-cyan-300 text-cyan-700 hover:bg-cyan-100" onClick={() => setBidDialogOpen(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />Edit Quote
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Negotiation thread (chat + counter-offers) */}
            {myBid && currentUserId && (
              <BidMessageThread
                workOrderId={job.id}
                bidId={myBid.id}
                currentUserId={currentUserId}
                otherPartyLabel={job.landlord.name}
              />
            )}

            {/* Similar Jobs */}
            {similarJobs.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Similar Jobs</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {similarJobs.map((sj) => (
                    <Link key={sj.id} href={`/contractors/jobs/${sj.id}`}>
                      <div className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div><h4 className="font-medium text-slate-900 hover:text-blue-600">{sj.title}</h4><p className="text-sm text-slate-500 mt-1">{sj.city} • {sj.bidCount} proposals</p></div>
                          <p className="font-semibold text-blue-600">{formatBudget(sj.budgetMin, sj.budgetMax)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>


          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                {!isLoggedIn ? (
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-2">Sign in to Submit a Proposal</h3>
                    <p className="text-sm text-slate-500 mb-4">Create a contractor account to bid on jobs</p>
                    <Link href="/sign-in"><Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500">Sign In</Button></Link>
                    <Link href="/sign-up?role=contractor"><Button variant="outline" className="w-full mt-2">Create Account</Button></Link>
                  </div>
                ) : !isContractor ? (
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-amber-400 mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-2">Contractor Account Required</h3>
                    <p className="text-sm text-slate-500 mb-4">You need a contractor profile to submit proposals</p>
                    <Link href="/sign-up?role=contractor"><Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500">Become a Contractor</Button></Link>
                  </div>
                ) : myBid ? (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-2">Quote Sent</h3>
                    <p className="text-sm text-slate-500 mb-4">Your quote of ${parseFloat(myBid.amount).toLocaleString()} is {myBid.status}</p>
                    {myBid.status === 'pending' && <Button variant="outline" className="w-full" onClick={() => setBidDialogOpen(true)}><Edit2 className="h-4 w-4 mr-2" />Edit Quote</Button>}
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-slate-900 mb-1 text-center">Win This Job</h3>
                    <p className="text-xs text-slate-500 text-center mb-4">Send a detailed custom quote</p>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-cyan-500/30" size="lg" onClick={() => setBidDialogOpen(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />Send Custom Quote
                    </Button>
                    <p className="text-xs text-slate-500 text-center mt-3">$1 platform fee on accepted jobs</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">About the Client</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {job.landlord.logo ? <img src={job.landlord.logo} alt="" className="h-full w-full rounded-full object-cover" /> : job.landlord.name.charAt(0)}
                  </div>
                  <div><p className="font-semibold text-slate-900">{job.landlord.name}</p><p className="text-sm text-slate-500">Member since {memberSince}</p></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-500 flex items-center gap-2"><Briefcase className="h-4 w-4" />Jobs Posted</span><span className="font-medium text-slate-900">{job.landlord.totalJobs}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-500 flex items-center gap-2"><Building2 className="h-4 w-4" />Properties</span><span className="font-medium text-slate-900">{job.landlord.totalProperties}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-500 flex items-center gap-2"><Shield className="h-4 w-4" />Payment Verified</span><Badge className="bg-emerald-100 text-emerald-700">Yes</Badge></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bid / Quote Dialog — Fiverr/Upwork-style multi-section builder */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-300" />
                {myBid ? 'Edit Your Quote' : 'Send a Custom Quote'}
              </DialogTitle>
            </DialogHeader>
            <p className="text-white/90 text-sm mt-1">
              Detailed quotes win 3x more jobs. Be transparent — clients love it.
            </p>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Job summary */}
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100"><Briefcase className="h-4 w-4 text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 truncate">{job.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {job.property.city}, {job.property.state} &middot; Budget {formatBudget(job.budgetMin, job.budgetMax)}
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 1: Pricing */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Pricing</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bidAmount" className="text-sm">Total Quote Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="bidAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-9 text-lg font-semibold h-12"
                    value={bidForm.amount}
                    onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })}
                  />
                </div>
                <p className="text-xs text-slate-500">You receive this amount minus a $1 platform fee.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="laborCost" className="text-xs flex items-center gap-1.5"><Wrench className="h-3 w-3" />Labor Cost</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="laborCost"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-8 text-sm"
                      value={bidForm.laborCost}
                      onChange={(e) => setBidForm({ ...bidForm, laborCost: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="materialsCost" className="text-xs flex items-center gap-1.5"><Package className="h-3 w-3" />Materials Cost</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="materialsCost"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-8 text-sm"
                      value={bidForm.materialsCost}
                      onChange={(e) => setBidForm({ ...bidForm, materialsCost: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              {breakdownMatches === false && (
                <div className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Labor + Materials = ${breakdownSum.toLocaleString()}, but total is ${totalAmount.toLocaleString()}
                </div>
              )}
              {breakdownMatches === true && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />Breakdown matches total &mdash; clients love this
                </p>
              )}
            </section>

            <Separator />

            {/* SECTION 2: Timeline */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center"><CalendarClock className="h-4 w-4 text-blue-600" /></div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Timeline</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="proposedStartDate" className="text-xs">Can Start By</Label>
                  <Input id="proposedStartDate" type="date" value={bidForm.proposedStartDate} onChange={(e) => setBidForm({ ...bidForm, proposedStartDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estimatedCompletionDate" className="text-xs">Completion Date</Label>
                  <Input id="estimatedCompletionDate" type="date" value={bidForm.estimatedCompletionDate} onChange={(e) => setBidForm({ ...bidForm, estimatedCompletionDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estimatedHours" className="text-xs">Estimated Hours</Label>
                <Input id="estimatedHours" type="number" step="0.5" min="0" placeholder="e.g., 4" value={bidForm.estimatedHours} onChange={(e) => setBidForm({ ...bidForm, estimatedHours: e.target.value })} />
              </div>
            </section>

            <Separator />

            {/* SECTION 3: Scope */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center"><FileCheck className="h-4 w-4 text-violet-600" /></div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Scope of Work</h3>
              </div>

              {/* Inclusions */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-600" />What&apos;s Included</Label>
                {bidForm.inclusions.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={idx === 0 ? 'e.g., Replace 3 outlets with GFCI' : 'Add another item'}
                      value={val}
                      onChange={(e) => updateInclusion(idx, e.target.value)}
                      className="text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-500 shrink-0" onClick={() => removeInclusion(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={addInclusion} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" />Add inclusion
                </Button>
              </div>

              {/* Exclusions */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><X className="h-3 w-3 text-red-500" />What&apos;s NOT Included</Label>
                {bidForm.exclusions.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={idx === 0 ? 'e.g., Drywall patching/painting after work' : 'Add another exclusion'}
                      value={val}
                      onChange={(e) => updateExclusion(idx, e.target.value)}
                      className="text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-500 shrink-0" onClick={() => removeExclusion(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={addExclusion} className="text-slate-600 hover:text-slate-700 hover:bg-slate-100 h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" />Add exclusion
                </Button>
              </div>
            </section>

            <Separator />

            {/* SECTION 4: Terms & Trust */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center"><ShieldCheck className="h-4 w-4 text-amber-600" /></div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Terms &amp; Warranty</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="warrantyDays" className="text-xs">Warranty (days)</Label>
                  <Input id="warrantyDays" type="number" min="0" placeholder="e.g., 90" value={bidForm.warrantyDays} onChange={(e) => setBidForm({ ...bidForm, warrantyDays: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="validUntil" className="text-xs">Quote Valid Until</Label>
                  <Input id="validUntil" type="date" value={bidForm.validUntil} onChange={(e) => setBidForm({ ...bidForm, validUntil: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentTerms" className="text-xs">Payment Terms</Label>
                <Input id="paymentTerms" placeholder="e.g., 50% deposit, 50% on completion" value={bidForm.paymentTerms} onChange={(e) => setBidForm({ ...bidForm, paymentTerms: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Will you pull permits?</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={bidForm.willPullPermits === true ? 'default' : 'outline'} size="sm" onClick={() => setBidForm({ ...bidForm, willPullPermits: true })} className={bidForm.willPullPermits === true ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                    Yes
                  </Button>
                  <Button type="button" variant={bidForm.willPullPermits === false ? 'default' : 'outline'} size="sm" onClick={() => setBidForm({ ...bidForm, willPullPermits: false })} className={bidForm.willPullPermits === false ? 'bg-slate-700 hover:bg-slate-800' : ''}>
                    No
                  </Button>
                  <Button type="button" variant={bidForm.willPullPermits === null ? 'default' : 'outline'} size="sm" onClick={() => setBidForm({ ...bidForm, willPullPermits: null })} className={bidForm.willPullPermits === null ? 'bg-slate-400 hover:bg-slate-500' : ''}>
                    N/A
                  </Button>
                </div>
              </div>
            </section>

            <Separator />

            {/* SECTION 5: Cover Letter */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-cyan-100 flex items-center justify-center"><FileText className="h-4 w-4 text-cyan-600" /></div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Cover Letter</h3>
              </div>
              <Textarea
                id="message"
                placeholder="Introduce yourself, mention relevant experience, and explain why you're the best fit for this job..."
                rows={5}
                value={bidForm.message}
                onChange={(e) => setBidForm({ ...bidForm, message: e.target.value })}
              />
              <p className="text-xs text-slate-500">A personalized message increases your chances of being hired by ~40%.</p>
            </section>
          </div>

          {/* Sticky footer */}
          <div className="border-t border-slate-200 bg-slate-50/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {bidForm.amount ? <span className="text-slate-900 font-semibold">${totalAmount.toLocaleString()} total</span> : 'Set a total amount to send'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBidDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitBid} disabled={submitting || !bidForm.amount} className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-cyan-500/30">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                {myBid ? 'Update Quote' : 'Send Quote'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxOpen && job.media.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 p-2 text-white/70 hover:text-white" onClick={() => setLightboxOpen(false)}><X className="h-8 w-8" /></button>
          {job.media.length > 1 && (
            <>
              <button className="absolute left-4 p-2 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft className="h-10 w-10" /></button>
              <button className="absolute right-4 p-2 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight className="h-10 w-10" /></button>
            </>
          )}
          <div className="max-w-5xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            {job.media[lightboxIndex].type === 'video' ? (
              <video src={job.media[lightboxIndex].url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
            ) : (
              <img src={job.media[lightboxIndex].url} alt={job.media[lightboxIndex].caption || ''} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            )}
            {job.media[lightboxIndex].caption && <p className="text-white/80 text-center mt-3">{job.media[lightboxIndex].caption}</p>}
            <p className="text-white/50 text-center text-sm mt-2">{lightboxIndex + 1} / {job.media.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
