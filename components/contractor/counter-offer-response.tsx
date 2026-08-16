'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Calendar,
  MessageSquare,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface CounterOfferResponseProps {
  counterOffer: any;
  originalQuote: any;
  onResponse?: () => void;
}

export function CounterOfferResponse({ counterOffer, originalQuote, onResponse }: CounterOfferResponseProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const priceDifference = counterOffer.totalPrice - originalQuote.totalPrice;
  const priceChangePercent = ((priceDifference / originalQuote.totalPrice) * 100).toFixed(1);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch(`/api/contractor/counter-offers/${counterOffer.id}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to accept counter offer');
      }

      toast({
        title: 'Counter Offer Accepted!',
        description: 'The customer has been notified. Your quote has been updated.',
      });

      onResponse?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept counter offer',
        variant: 'destructive',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const response = await fetch(`/api/contractor/counter-offers/${counterOffer.id}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reject counter offer');
      }

      toast({
        title: 'Counter Offer Rejected',
        description: 'The customer has been notified.',
      });

      onResponse?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject counter offer',
        variant: 'destructive',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const isPending = counterOffer.status === 'pending';
  const isExpired = new Date(counterOffer.validUntil) < new Date();

  return (
    <Card className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              Counter Offer Received
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Customer has proposed changes to your quote
            </p>
          </div>
          <Badge variant={isPending ? 'default' : 'secondary'}>
            {counterOffer.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Comparison */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your Original Quote</span>
            <span className="font-medium">${originalQuote.totalPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-center py-2">
            {priceDifference < 0 ? (
              <div className="flex items-center gap-2 text-red-600">
                <TrendingDown className="h-5 w-5" />
                <span className="font-semibold">
                  -${Math.abs(priceDifference).toFixed(2)} ({priceChangePercent}%)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                <span className="font-semibold">
                  +${priceDifference.toFixed(2)} (+{priceChangePercent}%)
                </span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Counter Offer Price</span>
            <span className="text-xl font-bold text-amber-600">
              ${counterOffer.totalPrice.toFixed(2)}
            </span>
          </div>

          {counterOffer.basePrice !== originalQuote.basePrice && (
            <div className="text-xs text-muted-foreground">
              Base: ${counterOffer.basePrice.toFixed(2)} | Tax: ${counterOffer.tax.toFixed(2)}
            </div>
          )}
        </div>

        {/* Delivery Date */}
        {counterOffer.deliveryDate && (
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-sm">Requested Completion Date</span>
            </div>
            <p className="text-lg">{format(new Date(counterOffer.deliveryDate), 'PPP')}</p>
            {originalQuote.completionDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Original: {format(new Date(originalQuote.completionDate), 'PPP')}
              </p>
            )}
          </div>
        )}

        {/* Description/Notes */}
        {counterOffer.description && (
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Customer's Message</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {counterOffer.description}
            </p>
          </div>
        )}

        {counterOffer.notes && (
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Additional Notes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {counterOffer.notes}
            </p>
          </div>
        )}

        {/* Valid Until */}
        <div className="text-xs text-muted-foreground text-center">
          Valid until: {format(new Date(counterOffer.validUntil), 'PPP p')}
        </div>

        {/* Actions */}
        {isPending && !isExpired && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isAccepting ? 'Accepting...' : 'Accept Counter Offer'}
            </Button>
            <Button
              onClick={handleReject}
              disabled={isRejecting}
              variant="outline"
              className="flex-1 border-2 border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        )}

        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-sm text-red-600 font-medium">This counter offer has expired</p>
          </div>
        )}

        {!isPending && !isExpired && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {counterOffer.status === 'accepted' ? 'You accepted this counter offer' : 'You rejected this counter offer'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
