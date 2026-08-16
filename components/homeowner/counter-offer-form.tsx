'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Calendar,
  MessageSquare,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface CounterOfferFormProps {
  quote: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CounterOfferForm({
  quote,
  isOpen,
  onClose,
  onSuccess,
}: CounterOfferFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    basePrice: quote.totalPrice.toString(),
    completionDate: quote.completionDate
      ? new Date(quote.completionDate).toISOString().split('T')[0]
      : '',
    notes: '',
  });

  const calculateTotal = () => {
    const base = Number(formData.basePrice) || 0;
    const tax = (base * (Number(quote.tax) / Number(quote.basePrice))) || 0;
    return base + tax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const counterPrice = Number(formData.basePrice);
    const originalPrice = Number(quote.totalPrice);

    if (counterPrice >= originalPrice) {
      toast({
        title: 'Invalid Counter-Offer',
        description: 'Counter-offer must be lower than the original quote',
        variant: 'destructive',
      });
      return;
    }

    if (counterPrice < originalPrice * 0.5) {
      toast({
        title: 'Counter-Offer Too Low',
        description: 'Counter-offer must be at least 50% of the original quote',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/homeowner/quotes/${quote.id}/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePrice: counterPrice,
          totalPrice: calculateTotal(),
          completionDate: formData.completionDate || null,
          notes: formData.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send counter-offer');
      }

      toast({
        title: '🎯 Counter-Offer Sent!',
        description: 'The contractor will review your counter-offer',
      });

      if (onSuccess) onSuccess();
      onClose();
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = calculateTotal();
  const savings = Number(quote.totalPrice) - total;
  const savingsPercent = ((savings / Number(quote.totalPrice)) * 100).toFixed(0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ArrowLeftRight className="h-6 w-6 text-violet-500" />
            Send Counter-Offer
          </DialogTitle>
          <DialogDescription>
            Negotiate the price and terms with the contractor
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Original Quote */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm">Original Quote</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(Number(quote.totalPrice))}
              </p>
            </CardContent>
          </Card>

          {/* Counter-Offer Price */}
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-violet-600" />
                Your Counter-Offer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="basePrice">Proposed Price *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Must be between 50% and 100% of original quote
                </p>
              </div>

              {savings > 0 && (
                <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-3">
                  <p className="text-sm font-semibold text-emerald-900">
                    💰 You'll save {formatCurrency(savings)} ({savingsPercent}%)
                  </p>
                </div>
              )}

              <div className="bg-white rounded-lg p-4 border-2 border-violet-300">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-900">
                    Counter-Offer Total
                  </span>
                  <span className="text-3xl font-bold text-violet-900">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completion Date */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Proposed Completion Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                id="completionDate"
                type="date"
                value={formData.completionDate}
                onChange={(e) =>
                  setFormData({ ...formData, completionDate: e.target.value })
                }
              />
              <p className="text-xs text-slate-500 mt-1">
                Optional: Suggest a different completion date
              </p>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-600" />
                Message to Contractor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Explain why you're proposing this counter-offer..."
                rows={4}
              />
            </CardContent>
          </Card>
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Send Counter-Offer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
