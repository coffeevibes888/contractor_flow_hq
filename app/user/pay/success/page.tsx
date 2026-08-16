import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock, ArrowRight, Home, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaymentSuccessClient from './success-client';

export const metadata: Metadata = {
  title: 'Payment Successful',
};

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { status?: string; payment_intent?: string };
}) {
  const isProcessing = searchParams.status === 'processing';
  const paymentIntentId = searchParams.payment_intent || null;

  return (
    <div className='min-h-screen flex items-center justify-center px-4'>
      <PaymentSuccessClient paymentIntentId={paymentIntentId} />
      <div className='max-w-md w-full text-center space-y-8'>
        {/* Success Icon */}
        <div className='relative'>
          <div className='absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl' />
          <div className='relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30'>
            {isProcessing ? (
              <Clock className='w-12 h-12 text-white' />
            ) : (
              <CheckCircle2 className='w-12 h-12 text-white' />
            )}
          </div>
        </div>

        {/* Message */}
        <div className='space-y-3'>
          <h1 className='text-3xl font-bold text-white'>
            {isProcessing ? 'Payment Processing' : 'Payment Successful!'}
          </h1>
          <p className='text-slate-400'>
            {isProcessing
              ? 'Your bank transfer is being processed. This typically takes 1-3 business days. We\'ll send you an email once it\'s complete.'
              : 'Your rent payment has been received. A confirmation email has been sent to your inbox.'}
          </p>
        </div>

        {/* Status Card */}
        <div className='rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4'>
          <div className='flex items-center justify-center gap-2'>
            <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className={`font-medium ${isProcessing ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isProcessing ? 'Processing' : 'Confirmed'}
            </span>
          </div>
          <p className='text-sm text-slate-400'>
            {isProcessing
              ? 'Your payment is being verified by your bank.'
              : 'Your landlord has been notified of your payment.'}
          </p>
        </div>

        {/* Actions */}
        <div className='flex flex-col gap-3'>
          <Link href='/user/profile/rent-receipts'>
            <Button className='w-full bg-indigo-600 hover:bg-indigo-700'>
              <ReceiptText className='w-4 h-4 mr-2' />
              View Payment History
              <ArrowRight className='w-4 h-4 ml-2' />
            </Button>
          </Link>
          <Link href='/user/dashboard'>
            <Button variant='outline' className='w-full border-slate-600 text-slate-300 hover:bg-slate-800'>
              <Home className='w-4 h-4 mr-2' />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <p className='text-xs text-slate-500'>
          Questions about your payment? Contact your property manager or{' '}
          <Link href='/contact' className='text-indigo-400 hover:underline'>
            reach out to support
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
