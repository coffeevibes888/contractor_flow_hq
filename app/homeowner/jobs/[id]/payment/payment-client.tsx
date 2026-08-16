'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle2,
  CreditCard,
  Loader2,
  AlertCircle,
  Info,
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentClientProps {
  workOrder: any;
  bid: any;
  contractor: any;
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}

function PaymentForm({
  workOrder,
  bid,
  contractor,
  clientSecret,
}: {
  workOrder: any;
  bid: any;
  contractor: any;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/homeowner/jobs/${workOrder.id}/payment/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Payment Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: '🎉 Payment Successful!',
          description: 'Your payment has been processed. Funds are held securely in escrow.',
        });
        router.push(`/homeowner/jobs/${workOrder.id}/payment/success`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const bidAmount = Number(bid.amount);
  const platformFee = 1.00; // $1 flat platform fee
  const totalAmount = bidAmount + platformFee;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">Job Amount</span>
            <span className="font-semibold text-slate-900">{formatCurrency(bidAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">Platform Fee</span>
            <span className="font-semibold text-slate-900">{formatCurrency(platformFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="font-bold text-slate-900">Total</span>
            <span className="font-bold text-2xl text-blue-900">{formatCurrency(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Escrow Protection Notice */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-emerald-900">Protected by Escrow</h4>
              <p className="text-sm text-emerald-800 leading-relaxed">
                Your payment is held securely until you approve the completed work. The contractor
                will be paid only after you confirm satisfaction or after 7 days of job completion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Element */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-slate-600" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5 mr-2" />
            Pay {formatCurrency(totalAmount)} Securely
          </>
        )}
      </Button>

      <p className="text-xs text-center text-slate-500">
        By proceeding, you agree to our Terms of Service and acknowledge our Privacy Policy.
        Your payment information is encrypted and secure.
      </p>
    </form>
  );
}

export default function PaymentClient({
  workOrder,
  bid,
  contractor,
  currentUser,
}: PaymentClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create payment intent
    const createPaymentIntent = async () => {
      try {
        const res = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: workOrder.id,
            bidId: bid.id,
            amount: Number(bid.amount),
            contractorId: bid.contractorId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to create payment intent');
        }

        setClientSecret(data.clientSecret);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        router.push(`/homeowner/jobs/${workOrder.id}`);
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [workOrder.id, bid.id, bid.amount, bid.contractorId, router, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-900">Preparing Payment...</h3>
              <p className="text-sm text-slate-600">Setting up secure payment processing</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/homeowner/jobs/${workOrder.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Job
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Secure Payment</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">Complete your payment to start the job</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={options}>
                  <PaymentForm
                    workOrder={workOrder}
                    bid={bid}
                    contractor={contractor}
                    clientSecret={clientSecret}
                  />
                </Elements>
              </CardContent>
            </Card>
          </div>

          {/* Job & Contractor Details */}
          <div className="space-y-6">
            {/* Job Details */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">{workOrder.title}</h4>
                  <p className="text-sm text-slate-600 line-clamp-2">{workOrder.description}</p>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="capitalize">{workOrder.category}</span>
                  </div>
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
                        Starts {new Date(bid.proposedStartDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contractor Details */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">Contractor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                    {contractor?.profilePhoto || contractor?.user?.image ? (
                      <img
                        src={contractor.profilePhoto || contractor.user?.image}
                        alt={contractor.displayName || contractor.businessName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (contractor?.displayName || contractor?.businessName || 'C')[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {contractor?.displayName || contractor?.businessName}
                    </h4>
                    {contractor?.avgRating && (
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-amber-500">★</span>
                        <span className="font-medium">{contractor.avgRating.toFixed(1)}</span>
                        <span className="text-slate-500">
                          ({contractor.completedJobs} jobs)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {contractor?.specialties && contractor.specialties.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {contractor.specialties.slice(0, 3).map((specialty: string) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Features */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-700">Secure payment processing by Stripe</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-700">Funds held in escrow until job completion</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-700">7-day satisfaction guarantee</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-700">Dispute resolution available</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
