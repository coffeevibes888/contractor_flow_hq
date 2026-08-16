'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  DollarSign, 
  Shield, 
  Lock, 
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type EscrowSummary = {
  jobId: string;
  jobTitle: string;
  contractorName: string;
  totalAmount: number;
  platformFee: number;
  contractorAmount: number;
  milestones: {
    title: string;
    percentage: number;
    amount: number;
  }[];
};

interface EscrowFundingFormProps {
  escrow: EscrowSummary;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

export function EscrowFundingForm({
  escrow,
  onSuccess,
  onCancel
}: EscrowFundingFormProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast({
        variant: 'destructive',
        description: 'Please agree to the terms and conditions'
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const response = await fetch(`/api/jobs/${escrow.jobId}/escrow/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: escrow.totalAmount,
          paymentMethod
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      toast({
        description: '✅ Escrow funded successfully!'
      });

      onSuccess(data.paymentIntentId);
    } catch (error) {
      console.error('Funding error:', error);
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to fund escrow'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Fund Escrow Account
        </h2>
        <p className="text-gray-600">
          Secure your payment in escrow. Funds will be released to the contractor as milestones are completed.
        </p>
      </div>

      {/* Job Summary */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Job:</span>
            <span className="font-semibold">{escrow.jobTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Contractor:</span>
            <span className="font-semibold">{escrow.contractorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Milestones:</span>
            <span className="font-semibold">{escrow.milestones.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Breakdown */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {escrow.milestones.map((milestone, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    #{index + 1}
                  </Badge>
                  <span className="font-medium">{milestone.title}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    ${milestone.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">{milestone.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Amount Breakdown */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Payment Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">Job Amount:</span>
            <span className="font-semibold">
              ${escrow.contractorAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">Platform Fee (10%):</span>
            <span className="font-semibold">
              ${escrow.platformFee.toLocaleString()}
            </span>
          </div>
          <div className="border-t-2 border-gray-200 pt-3">
            <div className="flex justify-between text-2xl">
              <span className="font-bold text-gray-900">Total to Pay:</span>
              <span className="font-bold text-blue-600">
                ${escrow.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              paymentMethod === 'card'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setPaymentMethod('card')}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-600" />
              <div className="flex-1">
                <p className="font-semibold">Credit/Debit Card</p>
                <p className="text-sm text-gray-600">Instant processing</p>
              </div>
              {paymentMethod === 'card' && (
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              )}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              paymentMethod === 'bank'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setPaymentMethod('bank')}
          >
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gray-600" />
              <div className="flex-1">
                <p className="font-semibold">Bank Transfer (ACH)</p>
                <p className="text-sm text-gray-600">2-3 business days</p>
              </div>
              {paymentMethod === 'bank' && (
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card className="border-2 border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-900">
                <strong>Secure Escrow:</strong> Your funds are held safely until work is completed
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-900">
                <strong>Protected Payment:</strong> Encrypted with bank-level security
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-900">
                <strong>Milestone Release:</strong> Pay only as work is verified and approved
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms Agreement */}
      <Card className="border-2 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="terms" className="cursor-pointer">
                <p className="text-sm text-gray-700">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                  . I understand that:
                </p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Funds will be held in escrow until milestones are completed</li>
                  <li>Payments are released upon milestone verification and approval</li>
                  <li>A 10% platform fee is included in the total amount</li>
                  <li>Disputes can be filed if work is not satisfactory</li>
                  <li>Refunds are available if the job is cancelled before work begins</li>
                </ul>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      {!agreedToTerms && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                Please read and agree to the terms and conditions before proceeding
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="border-2 border-gray-300"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!agreedToTerms || isProcessing}
          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white min-w-[200px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Fund Escrow - ${escrow.totalAmount.toLocaleString()}
            </>
          )}
        </Button>
      </div>

      {/* Powered by Stripe */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Powered by{' '}
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Stripe
          </a>
          {' '}• Secure payment processing
        </p>
      </div>
    </form>
  );
}
