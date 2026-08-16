'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { 
  ArrowLeft, 
  CreditCard, 
  Building2, 
  Smartphone, 
  Wallet,
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

type PaymentMethod = 'card' | 'ach' | 'apple_pay' | 'google_pay';

interface PaymentCheckoutProps {
  paymentIds: string[];
  totalAmount: number;
  selectedMethod: PaymentMethod;
  onBack: () => void;
  lease: {
    propertyName: string;
    unitName: string;
    landlordName: string;
  };
}

const methodInfo: Record<PaymentMethod, { name: string; icon: typeof CreditCard; color: string }> = {
  card: { name: 'Debit Card', icon: CreditCard, color: 'violet' },
  ach: { name: 'Bank Transfer', icon: Building2, color: 'emerald' },
  apple_pay: { name: 'Apple Pay', icon: Smartphone, color: 'slate' },
  google_pay: { name: 'Google Pay', icon: Wallet, color: 'blue' },
};

export default function PaymentCheckout({
  paymentIds,
  totalAmount,
  selectedMethod,
  onBack,
  lease,
}: PaymentCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initPayment = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/rent/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rentPaymentIds: paymentIds }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to initialize payment');
        }

        const data = await res.json();
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };

    initPayment();
  }, [paymentIds]);

  const MethodIcon = methodInfo[selectedMethod].icon;

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <Loader2 className='w-12 h-12 text-violet-400 animate-spin mx-auto' />
          <p className='text-slate-400'>Preparing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen'>
        <div className='max-w-lg mx-auto px-4 py-12'>
          <div className='rounded-2xl border border-red-500/30 bg-red-900/20 p-8 text-center space-y-4'>
            <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20'>
              <AlertCircle className='w-8 h-8 text-red-400' />
            </div>
            <h2 className='text-xl font-semibold text-white'>Payment Error</h2>
            <p className='text-red-300'>{error}</p>
            <Button onClick={onBack} variant='outline' className='border-red-500/50 text-red-300 hover:bg-red-500/10'>
              <ArrowLeft className='w-4 h-4 mr-2' />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <div className='min-h-screen'>
      <div className='max-w-2xl mx-auto px-4 py-8 space-y-6'>
        {/* Back Button */}
        <button
          onClick={onBack}
          className='inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors'
        >
          <ArrowLeft className='w-4 h-4' />
          <span>Change payment method</span>
        </button>

        {/* Header */}
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold text-white'>Complete Payment</h1>
          <p className='text-slate-400'>
            {lease.propertyName} • {lease.unitName}
          </p>
        </div>

        {/* Payment Method Badge */}
        <div className='inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-800 border border-slate-700'>
          <MethodIcon className='w-5 h-5 text-violet-400' />
          <span className='text-white font-medium'>{methodInfo[selectedMethod].name}</span>
          <span className='px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium'>
            No fees
          </span>
        </div>

        {/* Amount Card */}
        <div className='rounded-xl border border-slate-700 bg-slate-800/50 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-slate-400'>Amount to pay</p>
              <p className='text-3xl font-bold text-white mt-1'>{formatCurrency(totalAmount)}</p>
            </div>
            <div className='text-right'>
              <p className='text-sm text-slate-400'>Paying to</p>
              <p className='text-white font-medium mt-1'>{lease.landlordName}</p>
            </div>
          </div>
        </div>

        {/* Stripe Elements */}
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#8b5cf6',
                colorBackground: '#1e293b',
                colorText: '#f8fafc',
                colorDanger: '#ef4444',
                borderRadius: '12px',
                fontFamily: 'system-ui, sans-serif',
              },
              rules: {
                '.Input': {
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                },
                '.Input:focus': {
                  border: '1px solid #8b5cf6',
                  boxShadow: '0 0 0 1px #8b5cf6',
                },
                '.Label': {
                  color: '#94a3b8',
                },
              },
            },
          }}
        >
          <CheckoutForm 
            paymentIntentId={paymentIntentId}
            selectedMethod={selectedMethod}
          />
        </Elements>

        {/* Security Badge */}
        <div className='flex items-center justify-center gap-2 text-sm text-slate-500'>
          <Shield className='w-4 h-4' />
          <span>Secured by Stripe • 256-bit SSL encryption</span>
        </div>
      </div>
    </div>
  );
}

function CheckoutForm({ 
  paymentIntentId,
  selectedMethod,
}: { 
  paymentIntentId: string | null;
  selectedMethod: PaymentMethod;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/user/pay/success`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        setIsComplete(true);
        // Mark payment as paid
        if (paymentIntentId) {
          await fetch('/api/rent/mark-paid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId }),
          });
        }
        window.location.href = '/user/pay/success';
      } else if (paymentIntent?.status === 'processing') {
        // ACH payments may be processing
        window.location.href = '/user/pay/success?status=processing';
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isComplete) {
    return (
      <div className='rounded-xl border border-emerald-500/30 bg-emerald-900/20 p-8 text-center space-y-4'>
        <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20'>
          <CheckCircle2 className='w-8 h-8 text-emerald-400' />
        </div>
        <h2 className='text-xl font-semibold text-white'>Payment Successful!</h2>
        <p className='text-emerald-300'>Redirecting...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='rounded-xl border border-slate-700 bg-slate-800/50 p-6'>
        <PaymentElement 
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                address: {
                  country: 'US',
                },
              },
            },
          }}
        />
      </div>

      {error && (
        <div className='rounded-lg border border-red-500/30 bg-red-900/20 p-4 flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
          <p className='text-red-300 text-sm'>{error}</p>
        </div>
      )}

      <Button
        type='submit'
        disabled={!stripe || isProcessing}
        className='w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-6 text-lg rounded-xl shadow-lg shadow-violet-500/25 disabled:opacity-50'
      >
        {isProcessing ? (
          <>
            <Loader2 className='w-5 h-5 mr-2 animate-spin' />
            Processing...
          </>
        ) : (
          <>
            <Shield className='w-5 h-5 mr-2' />
            Pay Now
          </>
        )}
      </Button>

      {selectedMethod === 'ach' && (
        <p className='text-xs text-center text-slate-500'>
          Bank transfers typically take 1-3 business days to process. You'll receive a confirmation email once complete.
        </p>
      )}
    </form>
  );
}
