'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Star,
  Award,
  TrendingUp,
  Zap,
  Shield,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { JobApprovalCard } from '@/components/homeowner/job-approval-card';
import { JobChatWidget } from '@/components/shared/job-chat-widget';

interface Contractor {
  id: string;
  businessName: string;
  displayName: string | null;
  profilePhoto: string | null;
  avgRating: number | null;
  completedJobs: number;
  responseRate: number;
  specialties: string[];
  hourlyRate: number | null;
  yearsExperience: number | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  } | null;
}

interface Bid {
  id: string;
  amount: string;
  estimatedHours: string | null;
  proposedStartDate: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  contractor: Contractor | null;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  budgetMin: string | null;
  budgetMax: string | null;
  agreedPrice: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  contractorId: string | null;
  images: string[];
  createdAt: string;
  bids: Bid[];
}

interface JobDetailClientProps {
  workOrder: WorkOrder;
  currentUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  escrowHold: {
    id: string;
    amount: string;
    releaseAt: string;
    status: string;
  } | null;
  assignedContractor: Contractor | null;
}

const priorityConfig = {
  low: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock },
  medium: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle },
  urgent: { color: 'bg-red-100 text-red-700 border-red-200', icon: Zap },
};

const statusConfig = {
  open: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Open for Bids' },
  assigned: { color: 'bg-violet-100 text-violet-700 border-violet-200', label: 'Assigned' },
  in_progress: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'In Progress' },
  completed: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Completed' },
  cancelled: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Cancelled' },
};

export default function JobDetailClient({ workOrder, currentUser, escrowHold, assignedContractor }: JobDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'date'>('price');

  const PriorityIcon = priorityConfig[workOrder.priority as keyof typeof priorityConfig]?.icon || Clock;
  const priorityColor = priorityConfig[workOrder.priority as keyof typeof priorityConfig]?.color || 'bg-slate-100';
  const statusColor = statusConfig[workOrder.status as keyof typeof statusConfig]?.color || 'bg-slate-100';
  const statusLabel = statusConfig[workOrder.status as keyof typeof statusConfig]?.label || workOrder.status;

  // Sort bids
  const sortedBids = [...workOrder.bids].sort((a, b) => {
    if (sortBy === 'price') {
      return Number(a.amount) - Number(b.amount);
    } else if (sortBy === 'rating') {
      const ratingA = a.contractor?.avgRating || 0;
      const ratingB = b.contractor?.avgRating || 0;
      return ratingB - ratingA;
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleAcceptBid = async () => {
    if (!selectedBid) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/homeowner/jobs/${workOrder.id}/accept-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidId: selectedBid.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept bid');
      }

      toast({
        title: '🎉 Bid Accepted!',
        description: `You've accepted ${selectedBid.contractor?.displayName || selectedBid.contractor?.businessName}'s bid. Proceeding to payment...`,
      });

      // Redirect to payment page
      router.push(`/homeowner/jobs/${workOrder.id}/payment?bidId=${selectedBid.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setShowAcceptDialog(false);
    }
  };

  const handleRejectBid = async () => {
    if (!selectedBid) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/homeowner/jobs/${workOrder.id}/reject-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bidId: selectedBid.id,
          reason: rejectReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject bid');
      }

      toast({
        title: 'Bid Rejected',
        description: 'The contractor has been notified.',
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setShowRejectDialog(false);
      setRejectReason('');
    }
  };

  const openAcceptDialog = (bid: Bid) => {
    setSelectedBid(bid);
    setShowAcceptDialog(true);
  };

  const openRejectDialog = (bid: Bid) => {
    setSelectedBid(bid);
    setShowRejectDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/homeowner/jobs">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Jobs
            </Button>
          </Link>
        </div>

        {/* Approval Card - Show if job is completed and escrow is held */}
        {escrowHold && assignedContractor && (
          <JobApprovalCard
            job={{
              id: workOrder.id,
              title: workOrder.title,
              description: workOrder.description,
              status: workOrder.status,
              completedAt: workOrder.completedAt,
              agreedPrice: workOrder.agreedPrice,
              images: workOrder.images,
            }}
            contractor={{
              id: assignedContractor.id,
              displayName: assignedContractor.displayName,
              businessName: assignedContractor.businessName,
              profilePhoto: assignedContractor.profilePhoto,
              avgRating: assignedContractor.avgRating,
              completedJobs: assignedContractor.completedJobs,
            }}
            escrowHold={escrowHold}
          />
        )}

        {/* Job Details Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-slate-900">{workOrder.title}</h1>
                  <Badge className={`${statusColor} border`}>
                    {statusLabel}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <Badge variant="outline" className={`${priorityColor} border gap-1.5`}>
                    <PriorityIcon className="h-3.5 w-3.5" />
                    {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)} Priority
                  </Badge>
                  <span className="text-slate-600 capitalize flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {workOrder.category}
                  </span>
                  <span className="text-slate-500">
                    Posted {new Date(workOrder.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              {workOrder.budgetMin && workOrder.budgetMax && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-center min-w-[160px]">
                  <div className="text-xs font-medium text-emerald-700 mb-1">Budget Range</div>
                  <div className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(Number(workOrder.budgetMin))}
                  </div>
                  <div className="text-xs text-emerald-600">to {formatCurrency(Number(workOrder.budgetMax))}</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{workOrder.description}</p>
            </div>

            {workOrder.images && workOrder.images.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Photos ({workOrder.images.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {workOrder.images.map((image, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer group"
                    >
                      <img
                        src={image}
                        alt={`Job photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bids Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-violet-500" />
                Bids Received
                <span className="text-lg font-normal text-slate-500">({workOrder.bids.length})</span>
              </h2>
              <p className="text-slate-600 text-sm mt-1">Compare and select the best contractor for your job</p>
            </div>
            {workOrder.bids.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Sort by:</span>
                <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1">
                  <Button
                    size="sm"
                    variant={sortBy === 'price' ? 'default' : 'ghost'}
                    onClick={() => setSortBy('price')}
                    className="text-xs"
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Price
                  </Button>
                  <Button
                    size="sm"
                    variant={sortBy === 'rating' ? 'default' : 'ghost'}
                    onClick={() => setSortBy('rating')}
                    className="text-xs"
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Rating
                  </Button>
                  <Button
                    size="sm"
                    variant={sortBy === 'date' ? 'default' : 'ghost'}
                    onClick={() => setSortBy('date')}
                    className="text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Recent
                  </Button>
                </div>
              </div>
            )}
          </div>

          {workOrder.bids.length === 0 ? (
            <Card className="bg-white/60 backdrop-blur-sm border-dashed border-2 border-slate-300">
              <CardContent className="py-16">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No bids yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Contractors will start submitting bids soon. We'll notify you when new bids arrive.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sortedBids.map((bid, index) => {
                const contractor = bid.contractor;
                const isLowestBid = sortBy === 'price' && index === 0;
                const isHighestRated = sortBy === 'rating' && index === 0 && (contractor?.avgRating || 0) > 0;

                return (
                  <Card
                    key={bid.id}
                    className={`bg-white/90 backdrop-blur-sm border-2 transition-all hover:shadow-lg ${
                      bid.status === 'accepted'
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : bid.status === 'declined'
                        ? 'border-slate-200 opacity-60'
                        : isLowestBid || isHighestRated
                        ? 'border-violet-300 shadow-md'
                        : 'border-white/20 hover:border-blue-300'
                    }`}
                  >
                    <CardContent className="p-6">
                      {(isLowestBid || isHighestRated) && bid.status === 'pending' && (
                        <div className="mb-4">
                          <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0">
                            <Award className="h-3 w-3 mr-1" />
                            {isLowestBid ? 'Lowest Bid' : 'Highest Rated'}
                          </Badge>
                        </div>
                      )}

                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Contractor Info */}
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                                {contractor?.profilePhoto || contractor?.user?.image ? (
                                  <img
                                    src={contractor.profilePhoto || contractor.user?.image || ''}
                                    alt={contractor.displayName || contractor.businessName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  (contractor?.displayName || contractor?.businessName || 'C')[0].toUpperCase()
                                )}
                              </div>
                              {contractor && contractor.completedJobs > 10 && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                                  <BadgeCheck className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-slate-900">
                                {contractor?.displayName || contractor?.businessName || 'Contractor'}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {contractor?.avgRating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    <span className="font-semibold text-slate-900">
                                      {contractor.avgRating.toFixed(1)}
                                    </span>
                                  </div>
                                )}
                                <span className="text-slate-500 text-sm">
                                  {contractor?.completedJobs || 0} jobs completed
                                </span>
                                {contractor?.responseRate && contractor.responseRate > 90 && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {contractor.responseRate}% response rate
                                  </Badge>
                                )}
                              </div>
                              {contractor?.specialties && contractor.specialties.length > 0 && (
                                <div className="flex gap-1.5 mt-2 flex-wrap">
                                  {contractor.specialties.slice(0, 3).map((specialty) => (
                                    <Badge key={specialty} variant="outline" className="text-xs">
                                      {specialty}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {bid.message && (
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <p className="text-sm text-slate-700 leading-relaxed">{bid.message}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {bid.estimatedHours && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span>{bid.estimatedHours} hours estimated</span>
                              </div>
                            )}
                            {bid.proposedStartDate && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>
                                  Start: {new Date(bid.proposedStartDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bid Amount & Actions */}
                        <div className="lg:w-64 flex flex-col justify-between gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 text-center">
                            <div className="text-xs font-medium text-blue-700 mb-1">Bid Amount</div>
                            <div className="text-3xl font-bold text-blue-900">
                              {formatCurrency(Number(bid.amount))}
                            </div>
                            {bid.estimatedHours && (
                              <div className="text-xs text-blue-600 mt-1">
                                ~{formatCurrency(Number(bid.amount) / Number(bid.estimatedHours))}/hr
                              </div>
                            )}
                          </div>

                          {bid.status === 'pending' && workOrder.status === 'open' && (
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={() => openAcceptDialog(bid)}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Accept Bid
                              </Button>
                              <Button
                                onClick={() => openRejectDialog(bid)}
                                variant="outline"
                                className="w-full"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                              <Button variant="ghost" className="w-full" size="sm">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Message
                              </Button>
                            </div>
                          )}

                          {bid.status === 'accepted' && (
                            <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-3 text-center">
                              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                              <div className="text-sm font-semibold text-emerald-900">Accepted</div>
                            </div>
                          )}

                          {bid.status === 'declined' && (
                            <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-center">
                              <XCircle className="h-6 w-6 text-slate-500 mx-auto mb-1" />
                              <div className="text-sm font-semibold text-slate-700">Declined</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Job Chat Widget - Show if contractor is assigned */}
      {workOrder.contractorId && assignedContractor && (
        <JobChatWidget
          jobId={workOrder.id}
          jobTitle={workOrder.title}
          currentUser={{
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          }}
          otherParty={{
            id: assignedContractor.user?.id || assignedContractor.id,
            name: assignedContractor.displayName || assignedContractor.businessName,
            image: assignedContractor.profilePhoto || assignedContractor.user?.image,
            role: 'contractor',
          }}
        />
      )}

      {/* Accept Bid Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Accept This Bid?
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                You're about to accept{' '}
                <span className="font-semibold text-slate-900">
                  {selectedBid?.contractor?.displayName || selectedBid?.contractor?.businessName}
                </span>
                's bid for{' '}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(Number(selectedBid?.amount || 0))}
                </span>
                .
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-900">
                    <div className="font-semibold mb-1">Payment Protection</div>
                    <p className="text-blue-700">
                      Your payment will be held securely in escrow and released only after you approve the completed work.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm">
                After accepting, you'll be directed to complete the payment. Other bids will be automatically declined.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAcceptDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptBid}
              disabled={isProcessing}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept & Continue to Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Bid Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-slate-500" />
              Decline This Bid?
            </DialogTitle>
            <DialogDescription>
              Let the contractor know why you're declining their bid (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="e.g., Found a better match, budget constraints, timeline doesn't work..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectBid}
              disabled={isProcessing}
              variant="destructive"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline Bid
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
