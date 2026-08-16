'use client';

import { useState } from 'react';
import { 
  CreditCard, 
  Building2, 
  Smartphone, 
  Wallet,
  CheckCircle2,
  Clock,
  Shield,
  ArrowRight,
  AlertCircle,
  FileSignature,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import PaymentCheckout from './payment-checkout';

interface PayRentClientProps {
  lease: {
    id: string;
    status: string;
    rentAmount: number;
    billingDayOfMonth: number;
    unitName: string;
    propertyName: string;
    landlordName: string;
    tenantSignedAt: string | null;
    landlordSignedAt: string | null;
  } | null;
  pendingPayments: Array<{
    id: string;
    amount: number;
    dueDate: string;
    status: string;
    type: string;
  }>;
  moveInPayments: Array<{
    id: string;
    amount: number;
    type: string;
  }>;
  regularPayments: Array<{
    id: string;
    amount: number;
    dueDate: string;
    status: string;
  }>;
  totalAmount: number;
}

type PaymentMethod = 'card' | 'ach' | 'apple_pay' | 'google_pay';

const paymentMethods = [
  {
    id: 'ach' as PaymentMethod,
    name: 'Bank Transfer',
    description: 'Direct from your bank account',
    icon: Building2,
    badge: 'Recommended',
    badgeColor: 'bg-emerald-500',
    features: ['No fees', '1-3 business days', 'Most secure'],
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'card' as PaymentMethod,
    name: 'Debit Card',
    description: 'Visa, Mastercard, Discover',
    icon: CreditCard,
    badge: 'Instant',
    badgeColor: 'bg-violet-500',
    features: ['2.9% + 30¢ Stripe fee', 'Instant confirmation', 'Widely accepted'],
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    id: 'apple_pay' as PaymentMethod,
    name: 'Apple Pay',
    description: 'Pay with Face ID or Touch ID',
    icon: Smartphone,
    badge: null,
    badgeColor: '',
    features: ['2.9% + 30¢ Stripe fee', 'Instant', 'iPhone & Mac'],
    gradient: 'from-slate-700 to-slate-900',
  },
  {
    id: 'google_pay' as PaymentMethod,
    name: 'Google Pay',
    description: 'Fast checkout with Google',
    icon: Wallet,
    badge: null,
    badgeColor: '',
    features: ['2.9% + 30¢ Stripe fee', 'Instant', 'Android & Web'],
    gradient: 'from-blue-500 to-cyan-500',
  },
];

export default function PayRentClient({
  lease,
  pendingPayments,
  moveInPayments,
  regularPayments,
  totalAmount,
}: PayRentClientProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // No lease state
  if (!lease) {
    return (
      <div className='min-h-screen'>
        <div className='max-w-4xl mx-auto px-4 py-12'>
          <div className='text-center space-y-6'>
            <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-600/50 border border-cyan-500/50'>
              <Wallet className='w-10 h-10 text-slate-400' />
            </div>
            <h1 className='text-3xl font-bold text-slate-800'>No Active Lease</h1>
            <p className='text-slate-600 max-w-md mx-auto'>
              You don't have an active lease yet. Once your lease is set up, you'll be able to make rent payments here.
            </p>
            <div className='flex flex-col sm:flex-row gap-3 justify-center'>
              <Link href='/user/applications'>
                <Button className='bg-indigo-600 hover:bg-indigo-700'>
                  View Applications
                </Button>
              </Link>
              <Link href='/search?category=all'>
                <Button variant='outline' className='border-cyan-600 text-cyan-700 hover:bg-cyan-50'>
                  Browse Properties
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lease pending signature
  if (lease.status === 'pending_signature' && !lease.tenantSignedAt) {
    return (
      <div className='min-h-screen'>
        <div className='max-w-4xl mx-auto px-4 py-12'>
          <div className='rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20 p-8 text-center space-y-6'>
            <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/30'>
              <FileSignature className='w-10 h-10 text-amber-400' />
            </div>
            <h1 className='text-3xl font-bold text-slate-800'>Sign Your Lease First</h1>
            <p className='text-amber-200/80 max-w-md mx-auto'>
              Great news! Your application has been approved. Please sign your lease agreement before making any payments.
            </p>
            <Link href='/user/profile/lease'>
              <Button className='bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8'>
                <FileSignature className='w-4 h-4 mr-2' />
                Sign Lease Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No pending payments
  if (pendingPayments.length === 0) {
    return (
      <div className='min-h-screen'>
        <div className='max-w-4xl mx-auto px-4 py-12'>
          <div className='text-center space-y-6'>
            <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30'>
              <CheckCircle2 className='w-10 h-10 text-emerald-400' />
            </div>
            <h1 className='text-3xl font-bold text-slate-800'>You're All Caught Up!</h1>
            <p className='text-slate-600 max-w-md mx-auto'>
              No payments due right now. Your next rent payment will appear here when it's time.
            </p>
            <div className='rounded-xl border border-white/10 bg-gradient-to-r from-cyan-700 to-cyan-700 p-6 max-w-sm mx-auto'>
              <p className='text-sm text-slate-400'>Next payment due</p>
              <p className='text-lg font-semibold text-white mt-1'>
                Day {lease.billingDayOfMonth} of next month
              </p>
              <p className='text-2xl font-bold text-emerald-400 mt-2'>
                {formatCurrency(lease.rentAmount)}
              </p>
            </div>
            <Link href='/user/profile/rent-receipts'>
              <Button variant='outline' className='border-cyan-600 text-cyan-700 hover:bg-cyan-50'>
                View Payment History
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show checkout flow
  if (showCheckout && selectedMethod) {
    return (
      <PaymentCheckout
        paymentIds={pendingPayments.map(p => p.id)}
        totalAmount={totalAmount}
        selectedMethod={selectedMethod}
        onBack={() => {
          setShowCheckout(false);
          setSelectedMethod(null);
        }}
        lease={lease}
      />
    );
  }

  // Main payment selection view
  return (
    <div className='min-h-screen'>
      <div className='max-w-5xl mx-auto px-4 py-8 space-y-8'>
        {/* Header */}
        <div className='text-center space-y-2'>
          <h1 className='text-3xl md:text-4xl font-bold text-slate-800'>Pay Your Rent</h1>
          <p className='text-slate-400'>
            {lease.propertyName} • {lease.unitName}
          </p>
        </div>

        {/* Amount Due Card */}
        <div className='relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-slate-900/60 to-teal-900/30 p-8'>
          <div className='absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2' />
          <div className='relative'>
            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-6'>
              <div>
                <p className='text-sm font-medium text-indigo-300 uppercase tracking-wider'>Total Amount Due</p>
                <p className='text-5xl md:text-6xl font-bold text-white mt-2'>
                  {formatCurrency(totalAmount)}
                </p>
                <div className='flex items-center gap-2 mt-3'>
                  {pendingPayments.some(p => p.status === 'overdue') && (
                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-medium'>
                      <AlertCircle className='w-3 h-3' />
                      Overdue
                    </span>
                  )}
                  <span className='text-sm text-slate-400'>
                    {pendingPayments.length} payment{pendingPayments.length !== 1 ? 's' : ''} due
                  </span>
                </div>
              </div>
              <div className='flex flex-col gap-2 text-sm'>
                {moveInPayments.length > 0 && (
                  <div className='flex items-center justify-between gap-8 text-slate-300'>
                    <span>Move-in costs</span>
                    <span className='font-semibold text-white'>
                      {formatCurrency(moveInPayments.reduce((s, p) => s + p.amount, 0))}
                    </span>
                  </div>
                )}
                {regularPayments.length > 0 && (
                  <div className='flex items-center justify-between gap-8 text-slate-300'>
                    <span>Monthly rent</span>
                    <span className='font-semibold text-white'>
                      {formatCurrency(regularPayments.reduce((s, p) => s + p.amount, 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold text-white'>Choose Payment Method</h2>
            <div className='flex items-center gap-2 text-sm text-emerald-400'>
              <CheckCircle2 className='w-4 h-4' />
              <span>No platform fees</span>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`relative group text-left rounded-xl border-2 p-5 transition-all duration-200 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
                      : 'border-white/10 bg-gradient-to-r from-cyan-700 to-cyan-700 hover:border-indigo-400/40 hover:opacity-90'
                  }`}
                >
                  {method.badge && (
                    <span className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${method.badgeColor}`}>
                      {method.badge}
                    </span>
                  )}
                  
                  <div className='flex items-start gap-4'>
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${method.gradient} flex items-center justify-center`}>
                      <Icon className='w-6 h-6 text-white' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-white'>{method.name}</h3>
                      <p className='text-sm text-slate-400 mt-0.5'>{method.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className='w-5 h-5 text-indigo-400 flex-shrink-0' />
                    )}
                  </div>
                  
                  <div className='flex flex-wrap gap-2 mt-4'>
                    {method.features.map((feature, i) => (
                      <span
                        key={i}
                        className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-400/20 via-sky-200/20 to-cyan-500/20 text-xs text-slate-200'
                      >
                        <CheckCircle2 className='w-3 h-3 text-emerald-400' />
                        {feature}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue Button */}
        <div className='flex flex-col items-center gap-4 pt-4'>
          <Button
            size='lg'
            disabled={!selectedMethod}
            onClick={() => setShowCheckout(true)}
            className='w-full max-w-md bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-semibold py-6 text-lg rounded-xl shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Continue to Payment
            <ArrowRight className='w-5 h-5 ml-2' />
          </Button>
          
          <div className='flex items-center gap-6 text-sm text-slate-500'>
            <div className='flex items-center gap-1.5'>
              <Shield className='w-4 h-4' />
              <span>256-bit encryption</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <Clock className='w-4 h-4' />
              <span>Instant confirmation</span>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className='rounded-xl border border-white/10 bg-gradient-to-r from-cyan-700 to-cyan-700 p-6'>
          <div className='flex flex-col md:flex-row items-center justify-center gap-6 text-center'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center'>
                <Shield className='w-5 h-5 text-emerald-400' />
              </div>
              <div className='text-left'>
                <p className='font-medium text-white text-sm'>Secure Payments</p>
                <p className='text-xs text-slate-400'>Powered by Stripe</p>
              </div>
            </div>
            <div className='hidden md:block w-px h-10 bg-slate-700' />
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center'>
                <CheckCircle2 className='w-5 h-5 text-indigo-400' />
              </div>
              <div className='text-left'>
                <p className='font-medium text-white text-sm'>No Platform Fees</p>
                <p className='text-xs text-slate-400'>Stripe processing fees apply</p>
              </div>
            </div>
            <div className='hidden md:block w-px h-10 bg-slate-700' />
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center'>
                <Clock className='w-5 h-5 text-blue-400' />
              </div>
              <div className='text-left'>
                <p className='font-medium text-white text-sm'>Instant Receipt</p>
                <p className='text-xs text-slate-400'>Email confirmation sent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
