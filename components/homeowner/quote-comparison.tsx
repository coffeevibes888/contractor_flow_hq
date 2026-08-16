'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  Star, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Award,
  MapPin,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface QuoteComparisonProps {
  quotes: any[];
  onClose?: () => void;
}

export function QuoteComparison({ quotes: initialQuotes, onClose }: QuoteComparisonProps) {
  const router = useRouter();
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);

  // Filter only pending/viewed quotes
  const availableQuotes = initialQuotes.filter(q => 
    ['pending', 'viewed', 'counterOffered'].includes(q.status) &&
    new Date(q.validUntil) > new Date()
  );

  const selectedQuotes = availableQuotes.filter(q => selectedQuoteIds.includes(q.id));

  const toggleQuote = (quoteId: string) => {
    setSelectedQuoteIds(prev => {
      if (prev.includes(quoteId)) {
        return prev.filter(id => id !== quoteId);
      }
      if (prev.length >= 4) {
        toast({
          title: 'Maximum Reached',
          description: 'You can compare up to 4 quotes at a time',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, quoteId];
    });
  };

  const handleAcceptQuote = async (quoteId: string) => {
    setIsAccepting(true);
    try {
      const response = await fetch(`/api/homeowner/quotes/${quoteId}/accept`, {
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

  // Calculate comparison metrics
  const getComparisonMetrics = () => {
    if (selectedQuotes.length === 0) return null;

    const prices = selectedQuotes.map(q => q.totalPrice);
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const ratings = selectedQuotes
      .filter(q => q.contractor?.rating)
      .map(q => q.contractor.rating);
    const avgRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    return { lowestPrice, highestPrice, avgPrice, avgRating };
  };

  const metrics = getComparisonMetrics();

  const getPriceIndicator = (price: number) => {
    if (!metrics) return null;
    if (price === metrics.lowestPrice) {
      return <Badge className="bg-green-500"><TrendingDown className="w-3 h-3 mr-1" />Lowest</Badge>;
    }
    if (price === metrics.highestPrice) {
      return <Badge variant="destructive"><TrendingUp className="w-3 h-3 mr-1" />Highest</Badge>;
    }
    return null;
  };

  if (availableQuotes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No quotes available for comparison</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Compare Quotes</h2>
          <p className="text-muted-foreground">
            Select up to 4 quotes to compare side by side
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Comparison Metrics */}
      {metrics && selectedQuotes.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparison Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Lowest Price</p>
                <p className="text-2xl font-bold text-green-600">
                  ${metrics.lowestPrice.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Highest Price</p>
                <p className="text-2xl font-bold text-red-600">
                  ${metrics.highestPrice.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Price</p>
                <p className="text-2xl font-bold">
                  ${metrics.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {metrics.avgRating.toFixed(1)}
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quote Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {availableQuotes.map((quote) => {
          const isSelected = selectedQuoteIds.includes(quote.id);
          const isLowestPrice = metrics && quote.totalPrice === metrics.lowestPrice;
          
          return (
            <Card 
              key={quote.id}
              className={`relative cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-primary shadow-lg' : ''
              } ${isLowestPrice ? 'border-green-500' : ''}`}
              onClick={() => toggleQuote(quote.id)}
            >
              {isLowestPrice && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-green-500">
                    <Award className="w-3 h-3 mr-1" />
                    Best Value
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => toggleQuote(quote.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {getPriceIndicator(quote.totalPrice)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Contractor Info */}
                <div>
                  <h3 className="font-semibold text-lg">
                    {quote.contractor?.businessName || 'Contractor'}
                  </h3>
                  {quote.contractor?.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{quote.contractor.rating}</span>
                      <span className="text-muted-foreground">
                        ({quote.contractor.reviewCount || 0} reviews)
                      </span>
                    </div>
                  )}
                  {quote.contractor?.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {quote.contractor.location}
                    </div>
                  )}
                </div>

                {/* Price */}
                <div>
                  <p className="text-sm text-muted-foreground">Total Price</p>
                  <p className="text-3xl font-bold">${quote.totalPrice.toLocaleString()}</p>
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Start: {format(new Date(quote.estimatedStartDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{quote.estimatedDuration} days</span>
                  </div>
                </div>

                {/* Status Badge */}
                <Badge variant={quote.status === 'counterOffered' ? 'secondary' : 'default'}>
                  {quote.status === 'counterOffered' ? 'Counter Offered' : 'Available'}
                </Badge>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptQuote(quote.id);
                    }}
                    disabled={isAccepting}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/homeowner/quotes/${quote.id}`);
                    }}
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Quotes Summary */}
      {selectedQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Quotes ({selectedQuotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedQuotes.map((quote) => (
                <div 
                  key={quote.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {quote.contractor?.businessName || 'Contractor'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${quote.totalPrice.toLocaleString()} • {quote.estimatedDuration} days
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleQuote(quote.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 