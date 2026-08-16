'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Loader2,
  Star,
  MessageCircle,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface JobApprovalCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    status: string;
    completedAt: string | null;
    agreedPrice: string | null;
    images: string[];
  };
  contractor: {
    id: string;
    displayName: string | null;
    businessName: string;
    profilePhoto: string | null;
    avgRating: number | null;
    completedJobs: number;
  } | null;
  escrowHold: {
    id: string;
    amount: string;
    releaseAt: string;
    status: string;
  } | null;
}

export function JobApprovalCard({ job, contractor, escrowHold }: JobApprovalCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [disputeReason, setDisputeReason] = useState('');

  // Only show if job is completed and escrow is held
  if (job.status !== 'completed' || !escrowHold || escrowHold.status !== 'held') {
    return null;
  }

  const daysUntilRelease = Math.ceil(
    (new Date(escrowHold.releaseAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/homeowner/jobs/${job.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          review: review.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve job');
      }

      toast({
        title: '🎉 Job Approved!',
        description: 'Payment has been released to the contractor. Thank you for your review!',
      });

      setShowApproveDialog(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for the dispute',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/homeowner/jobs/${job.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: disputeReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to file dispute');
      }

      toast({
        title: 'Dispute Filed',
        description: 'Our team will review your dispute within 24 hours.',
      });

      setShowDisputeDialog(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-300 shadow-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Job Completed - Awaiting Your Approval
                </CardTitle>
                <p className="text-sm text-slate-700 mt-1">
                  Review the work and approve payment release
                </p>
              </div>
            </div>
            <Badge className="bg-amber-500 text-white border-0 text-sm px-3 py-1">
              Action Required
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contractor Info */}
          {contractor && (
            <div className="flex items-center gap-4 p-4 bg-white/80 rounded-lg border border-amber-200">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0">
                {contractor.profilePhoto ? (
                  <img
                    src={contractor.profilePhoto}
                    alt={contractor.displayName || contractor.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (contractor.displayName || contractor.businessName)[0].toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">
                  {contractor.displayName || contractor.businessName}
                </h4>
                {contractor.avgRating && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-900">
                        {contractor.avgRating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-sm text-slate-600">
                      ({contractor.completedJobs} jobs)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completion Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/80 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 text-slate-700 mb-1">
                <Calendar className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <p className="text-slate-900 font-semibold">
                {job.completedAt
                  ? new Date(job.completedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recently'}
              </p>
            </div>
            <div className="p-4 bg-white/80 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 text-slate-700 mb-1">
                <DollarSign className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Payment Amount</span>
              </div>
              <p className="text-slate-900 font-semibold text-xl">
                {formatCurrency(Number(escrowHold.amount))}
              </p>
            </div>
          </div>

          {/* Completion Photos */}
          {job.images && job.images.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-amber-600" />
                Completion Photos
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {job.images.slice(-8).map((image, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 border-amber-200 hover:border-amber-400 transition-colors cursor-pointer group"
                  >
                    <img
                      src={image}
                      alt={`Completion photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Escrow Timer */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-blue-900">Escrow Protection Active</h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    Payment is held securely in escrow. You have{' '}
                    <span className="font-bold">{daysUntilRelease} day{daysUntilRelease !== 1 ? 's' : ''}</span>{' '}
                    to review the work. If no action is taken, payment will be automatically released to the contractor.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Clock className="h-4 w-4" />
                    <span>
                      Auto-release on{' '}
                      {new Date(escrowHold.releaseAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowApproveDialog(true)}
              className="flex-1 h-12 text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Approve & Release Payment
            </Button>
            <Button
              onClick={() => setShowDisputeDialog(true)}
              variant="outline"
              className="flex-1 h-12 text-base border-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              File a Dispute
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              // Trigger chat widget open
              const chatButton = document.querySelector('[data-job-chat-trigger]') as HTMLButtonElement;
              if (chatButton) {
                chatButton.click();
              }
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Message Contractor
          </Button>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              Approve Work & Release Payment
            </DialogTitle>
            <DialogDescription>
              Confirm that the work has been completed to your satisfaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Rating */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Rate the Contractor</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-lg font-semibold text-slate-900">
                  {rating}.0
                </span>
              </div>
            </div>

            {/* Review */}
            <div className="space-y-3">
              <Label htmlFor="review" className="text-base font-semibold">
                Write a Review (Optional)
              </Label>
              <Textarea
                id="review"
                placeholder="Share your experience with this contractor..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Payment Info */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-900">
                    Payment to be released:
                  </span>
                  <span className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(Number(escrowHold.amount))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
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
                  Approve & Release Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              File a Dispute
            </DialogTitle>
            <DialogDescription>
              Explain the issue with the completed work. Our team will review and mediate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label htmlFor="dispute" className="text-base font-semibold">
                Reason for Dispute *
              </Label>
              <Textarea
                id="dispute"
                placeholder="Describe the issue in detail (e.g., work not completed as agreed, quality issues, damage, etc.)"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={6}
                className="resize-none"
                required
              />
            </div>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4 space-y-2 text-sm text-blue-900">
                <p className="font-semibold">What happens next?</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Payment remains in escrow during review</li>
                  <li>Our team will contact you within 24 hours</li>
                  <li>We'll mediate between you and the contractor</li>
                  <li>Resolution typically takes 3-5 business days</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisputeDialog(false);
                setDisputeReason('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispute}
              disabled={isProcessing}
              variant="destructive"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Filing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  File Dispute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
