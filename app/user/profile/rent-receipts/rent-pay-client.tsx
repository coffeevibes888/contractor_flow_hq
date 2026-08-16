'use client';

import { useState } from 'react';
import RentStripePayment from './rent-stripe-payment';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RentPayClient({
  rentPaymentIds,
}: {
  rentPaymentIds: string[];
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    rentAmount: number;
    convenienceFee: number;
    totalAmount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleStartPayment = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const res = await fetch('/api/rent/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          rentPaymentIds
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})) as { message?: string };
        setErrorMessage(errorData.message || 'Failed to start payment. Please try again.');
        return;
      }

      const data = (await res.json()) as { 
        clientSecret?: string;
        paymentIntentId?: string;
        rentAmount?: number;
        convenienceFee?: number;
        totalAmount?: number;
      };

      if (!data.clientSecret) {
        setErrorMessage('Payment could not be initialized.');
        return;
      }

      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId || null);
      setPaymentData({
        rentAmount: data.rentAmount || 0,
        convenienceFee: data.convenienceFee || 0,
        totalAmount: data.totalAmount || 0,
      });
    } catch (err) {
      setErrorMessage('Something went wrong starting the payment.');
    } finally {
      setIsLoading(false);
    }
  };

  if (clientSecret && paymentData) {
    return (
      <div className='space-y-4'>
        <RentStripePayment 
          totalInCents={Math.round(paymentData.totalAmount * 100)}
          clientSecret={clientSecret}
          paymentIntentId={paymentIntentId}
          rentAmount={paymentData.rentAmount}
          initialConvenienceFee={paymentData.convenienceFee}
        />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {errorMessage && (
        <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg'>
          {errorMessage}
        </div>
      )}
      
      {/* Primary CTA - Link to new Pay page */}
      <Link href='/user/pay'>
        <Button
          className='inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all'
          size='lg'
        >
          Pay Rent Now
          <ArrowRight className='w-4 h-4 ml-2' />
        </Button>
      </Link>

      {/* Legacy quick pay option */}
      <Button
        variant='ghost'
        size='sm'
        onClick={handleStartPayment}
        disabled={isLoading}
        className='text-slate-400 hover:text-white'
      >
        <CreditCard className='w-4 h-4 mr-2' />
        {isLoading ? 'Loading...' : 'Quick pay here'}
      </Button>

      <div className='text-xs text-slate-400 space-y-1'>
        <p>✓ No fees on any payment method</p>
        <p>✓ Bank transfer, debit card, Apple Pay, Google Pay</p>
        <p>✓ Secure payments powered by Stripe</p>
      </div>
    </div>
  );
}
