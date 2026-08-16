'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  XCircle,
  Star,
  MapPin,
  Briefcase,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { CounterOfferForm } from './counter-offer-form';

interface QuoteDetailModalProps {
  quote: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteUpdated?: () => void;
}

export function QuoteDetailModal({ quote, open, onOpenChange, onQuoteUpdated }: QuoteDetailModalProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showCounterOffer, setShowCounterOffer] = useState(false);

  // Mark as viewed when opened
  const markAsViewed = async () => {
    if (quote.status === 'pending' && !quote.viewedAt) {
      try {
        await fetch(`/api/homeowner/quotes/${quote.id}/view`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error marking quote as viewed:', error);
      }
    }
  };

  // Call markAsViewed when modal opens
  if (open && quote.status === 'pending' && !quote.viewedAt) {
    markAsViewed();
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch(`/api/homeowner/quotes/${quote.id}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept quote');
      }

      const data = await response.json();
      
      toast({
        title: 'Quote Accepted!',
        description: 'Your job has been created and the contractor has been notified.',
      });

      onOpenChange(false);
      router.push(`/homeowner/quotes/success?jobId=${data.jobId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept quote',
        variant: 'destructive',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const response = await fetch(`/api/homeowner/quotes/${quote.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Not interested',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject quote');
      }

      toast({
        title: 'Quote Rejected',
        description: 'The contractor has been notified.',
      });

      onOpenChange(false);
      onQuoteUpdated?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject quote',
        variant: 'destructive',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'default', label: 'Pending' },
      viewed: { variant: 'secondary', label: 'Viewed' },
      accepted: { variant: 'default', label: 'Accepted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      expired: { variant: 'outline', label: 'Expired' },
      counterOffered: { variant: 'default', label: 'Counter Offered' },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isExpired = new Date(quote.validUntil) < new Date();
  const canAccept = ['pending', 'viewed', 'counterOffered'].includes(quote.status) && !isExpired;
  const canReject = ['pending', 'viewed', 'counterOffered'].includes(quote.status) && !isExpired;
  const canCounter = ['pending', 'viewed'].includes(quote.status) && !isExpired;

  if (showCounterOffer) {
    return (
      <CounterOfferForm
        quote={quote}
        isOpen={open}
        onClose={() => {
          setShowCounterOffer(false);
          onOpenChange(false);
        }}
        onSuccess={() => {
          setShowCounterOffer(false);
          onOpenChange(false);
          onQuoteUpdated?.();
          toast({
            title: 'Counter Offer Sent!',
            description: 'The contractor will be notified of your counter offer.',
          });
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{quote.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(quote.status)}
                {isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contractor Info */}
          <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-violet-50 border-2 border-blue-100 rounded-lg p-4">
            <div className="flex items-start gap-4">
              {quote.contractor?.logo && (
                <img
                  src={quote.contractor.logo}
                  alt={quote.contractor.businessName}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{quote.contractor?.businessName}</h3>
                <p className="text-sm text-muted-foreground">{quote.contractor?.displayName}</p>
                <div className="flex items-center gap-4 mt-2">
                  {quote.contractor?.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{quote.contractor.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">
                        ({quote.contractor.reviewCount} reviews)
                      </span>
                    </div>
                  )}
                  {quote.contractor?.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {quote.contractor.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-100 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-lg">Pricing</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Price</span>
                <span className="font-medium">${quote.basePrice.toFixed(2)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${quote.discount.toFixed(2)}</span>
                </div>
              )}
              {quote.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">${quote.tax.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-emerald-600">${quote.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quote.startDate && (
              <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-pink-50 border-2 border-violet-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-violet-600" />
                  <h4 className="font-semibold">Start Date</h4>
                </div>
                <p className="text-lg">{format(new Date(quote.startDate), 'PPP')}</p>
              </div>
            )}
            {quote.completionDate && (
              <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold">Completion Date</h4>
                </div>
                <p className="text-lg">{format(new Date(quote.completionDate), 'PPP')}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {quote.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold text-lg">Description</h3>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">{quote.description}</p>
            </div>
          )}

          {/* Project Scope */}
          {quote.projectScope && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold text-lg">Project Scope</h3>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">{quote.projectScope}</p>
            </div>
          )}

          {/* Deliverables */}
          {quote.deliverables && quote.deliverables.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg">Deliverables</h3>
              </div>
              <ul className="space-y-2">
                {quote.deliverables.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Terms */}
          {(quote.paymentTerms || quote.warranty) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Terms & Conditions</h3>
              <div className="space-y-2">
                {quote.paymentTerms && (
                  <div>
                    <span className="font-medium">Payment Terms: </span>
                    <span className="text-muted-foreground">{quote.paymentTerms}</span>
                  </div>
                )}
                {quote.warranty && (
                  <div>
                    <span className="font-medium">Warranty: </span>
                    <span className="text-muted-foreground">{quote.warranty}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Additional Notes</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Valid Until */}
          <div className="text-sm text-muted-foreground">
            Valid until: {format(new Date(quote.validUntil), 'PPP p')}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {canAccept && (
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                size="lg"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {isAccepting ? 'Accepting...' : 'Accept Quote'}
              </Button>
            )}
            
            {canCounter && (
              <Button
                onClick={() => setShowCounterOffer(true)}
                variant="outline"
                className="flex-1 border-2 border-blue-200 hover:bg-blue-50"
                size="lg"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Send Counter Offer
              </Button>
            )}

            {canReject && (
              <Button
                onClick={handleReject}
                disabled={isRejecting}
                variant="outline"
                className="flex-1 border-2 border-red-200 hover:bg-red-50 hover:text-red-600"
                size="lg"
              >
                <XCircle className="h-5 w-5 mr-2" />
                {isRejecting ? 'Rejecting...' : 'Reject Quote'}
              </Button>
            )}
          </div>

          {isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600 font-medium">This quote has expired</p>
              <p className="text-sm text-red-500 mt-1">
                Contact the contractor to request a new quote
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
