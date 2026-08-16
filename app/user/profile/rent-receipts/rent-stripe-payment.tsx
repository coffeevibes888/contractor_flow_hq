'use client';

import { FormEvent, useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Building2, Smartphone, Zap, Clock } from 'lucide-react';
import PaymentMethodSelector, { PaymentMethodType } from './payment-method-selector';
import BankAccountForm from './bank-account-form';
import CardPaymentForm from './card-payment-form';
import { getSavedPaymentMethods } from '@/lib/actions/user.actions';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

export default function RentStripePayment({
  totalInCents,
  clientSecret,
  paymentIntentId,
  rentAmount,
  initialConvenienceFee,
}: {
  totalInCents: number;
  clientSecret: string;
  paymentIntentId?: string | null;
  rentAmount: number;
  initialConvenienceFee: number;
}) {
  const { theme, systemTheme } = useTheme();

  const StripeForm = () => {
    const stripe = useStripe();
    const elements = useElements();

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentMethodType>('card');
    const [achVerificationPaymentIntentId, setAchVerificationPaymentIntentId] = useState<string | null>(null);
    const [achMicrodepositAmount1, setAchMicrodepositAmount1] = useState('');
    const [achMicrodepositAmount2, setAchMicrodepositAmount2] = useState('');
    const [isVerifyingAch, setIsVerifyingAch] = useState(false);
    const [savedAchMethods, setSavedAchMethods] = useState<
      Array<{ id: string; last4: string; brand?: string | null; isVerified: boolean; isDefault: boolean }>
    >([]);
    const [selectedSavedAchId, setSelectedSavedAchId] = useState<string | null>(null);
    const [isPayingWithSavedAch, setIsPayingWithSavedAch] = useState(false);
    
    // No contact info collected here — tenant is authenticated

    useEffect(() => {
      if (selectedPaymentType !== 'ach') return;

      (async () => {
        const result = await getSavedPaymentMethods();
        if (!result.success) return;

        const methods = (result.methods as Array<any>)
          .filter((m) => m.type === 'us_bank_account' && m.isVerified)
          .map((m) => ({
            id: m.id as string,
            last4: m.last4 as string,
            brand: (m.brand as string | null | undefined) ?? null,
            isVerified: !!m.isVerified,
            isDefault: !!m.isDefault,
          }));

        setSavedAchMethods(methods);

        const defaultId = methods.find((m) => m.isDefault)?.id;
        setSelectedSavedAchId(defaultId || methods[0]?.id || null);
      })();
    }, [selectedPaymentType]);

    const handlePaymentMethodChange = (method: PaymentMethodType) => {
      setSelectedPaymentType(method);
      setErrorMessage('');
      if (method !== 'ach') {
        setAchVerificationPaymentIntentId(null);
        setAchMicrodepositAmount1('');
        setAchMicrodepositAmount2('');
        setSavedAchMethods([]);
        setSelectedSavedAchId(null);
      }
    };

    const handlePayWithSavedAch = async () => {
      if (!paymentIntentId || !selectedSavedAchId) return;

      setIsPayingWithSavedAch(true);
      setErrorMessage('');

      try {
        const res = await fetch('/api/rent/confirm-saved-ach-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId,
            savedPaymentMethodId: selectedSavedAchId,
          }),
        });

        const result = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          requiresAction?: boolean;
          status?: string;
        };

        if (!res.ok) {
          setErrorMessage(result.message || 'Failed to process bank payment.');
          return;
        }

        if (result.requiresAction) {
          setErrorMessage(
            result.message ||
              'Additional action is required to complete this bank payment.'
          );
          return;
        }

        if (result.success === false) {
          setErrorMessage(result.message || 'Failed to process bank payment.');
          return;
        }

        window.location.href = '/user/profile/rent-receipts';
      } catch (err) {
        setErrorMessage('Something went wrong while processing your bank payment.');
      } finally {
        setIsPayingWithSavedAch(false);
      }
    };

    const handleVerifyAch = async () => {
      if (!achVerificationPaymentIntentId) return;

      const a1 = Number(achMicrodepositAmount1);
      const a2 = Number(achMicrodepositAmount2);

      if (!Number.isFinite(a1) || !Number.isFinite(a2) || a1 <= 0 || a2 <= 0) {
        setErrorMessage('Enter the two microdeposit amounts (in cents), like 32 and 45.');
        return;
      }

      setIsVerifyingAch(true);
      setErrorMessage('');

      try {
        const res = await fetch('/api/rent/verify-ach-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: achVerificationPaymentIntentId,
            amounts: [a1, a2],
          }),
        });

        const result = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          requiresAction?: boolean;
          status?: string;
          paymentIntentId?: string;
        };

        if (!res.ok) {
          setErrorMessage(result.message || 'Failed to verify bank account.');
          return;
        }

        if (result.requiresAction) {
          setErrorMessage(
            result.message ||
              'Verification is still required. Please double-check the code and try again.'
          );
          return;
        }

        if (result.success === false) {
          setErrorMessage(result.message || 'Failed to verify bank account.');
          return;
        }

        window.location.href = '/user/profile/rent-receipts';
      } catch (err) {
        setErrorMessage('Something went wrong while verifying your bank account.');
      } finally {
        setIsVerifyingAch(false);
      }
    };

    const handleBankAccountSubmit = async (data: {
      accountHolderName: string;
      accountHolderType?: 'individual' | 'company';
      routingNumber: string;
      accountNumber: string;
      accountNumberConfirm: string;
      accountType: 'checking' | 'savings';
      consent: boolean;
    }) => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        // Call your API to create ACH payment intent and confirm
        const res = await fetch('/api/rent/confirm-ach-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntentId,
            accountHolderName: data.accountHolderName,
            accountHolderType: data.accountHolderType,
            routingNumber: data.routingNumber,
            accountNumber: data.accountNumber,
            accountType: data.accountType,
            consent: data.consent,
          }),
        });

        const result = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          requiresAction?: boolean;
          status?: string;
          nextAction?: unknown;
          paymentIntentId?: string;
        };

        if (!res.ok) {
          setErrorMessage(result.message || 'Failed to process ACH payment');
          return;
        }

        if (result.requiresAction) {
          const idFromResponse = result.paymentIntentId;
          const fallbackId = paymentIntentId || null;
          setAchVerificationPaymentIntentId(idFromResponse || fallbackId);
          setErrorMessage(
            result.message ||
              'This bank payment needs additional verification before it can complete.'
          );
          return;
        }

        if (result.success === false) {
          setErrorMessage(result.message || 'Failed to process ACH payment');
          return;
        }

        window.location.href = '/user/profile/rent-receipts';
      } catch (err) {
        setErrorMessage('Something went wrong while processing your payment.');
      } finally {
        setIsLoading(false);
      }
    };

    const handleCardPaymentSubmit = async () => {
      if (!stripe || !elements) return;

      setIsLoading(true);
      setErrorMessage('');

      try {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {},
          redirect: 'if_required',
        });

        if (error) {
          if (error.type === 'card_error' || error.type === 'validation_error') {
            setErrorMessage(error.message ?? 'An unknown error occurred');
          } else {
            setErrorMessage('An unknown error occurred');
          }
          return;
        }

        const intentId = paymentIntent?.id;

        if (intentId) {
          await fetch('/api/rent/mark-paid', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentIntentId: intentId }),
          });
        }

        window.location.href = '/user/profile/rent-receipts';
      } catch (err) {
        setErrorMessage('Something went wrong while processing your payment.');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <form className='space-y-6' onSubmit={(e) => e.preventDefault()}>
        {/* Payment Method Selection */}
        <PaymentMethodSelector
          selectedMethod={selectedPaymentType}
          onMethodChange={handlePaymentMethodChange}
        />

        {/* Payment Method Forms */}
        {selectedPaymentType === 'ach' ? (
          <div className='rounded-lg border border-white/10 bg-slate-800/60 p-6'>
            {achVerificationPaymentIntentId ? (
              <div className='space-y-4'>
                <div className='text-sm text-slate-400'>
                  Your bank requires verification to complete this ACH payment. Enter the two microdeposit amounts (in cents). In test mode you can use <span className='font-semibold'>32</span> and <span className='font-semibold'>45</span>.
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <Input
                    value={achMicrodepositAmount1}
                    onChange={(e) => setAchMicrodepositAmount1(e.target.value)}
                    placeholder='First deposit (cents) e.g. 32'
                    inputMode='numeric'
                    className='bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500'
                  />
                  <Input
                    value={achMicrodepositAmount2}
                    onChange={(e) => setAchMicrodepositAmount2(e.target.value)}
                    placeholder='Second deposit (cents) e.g. 45'
                    inputMode='numeric'
                    className='bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500'
                  />
                </div>
                <Button
                  type='button'
                  onClick={handleVerifyAch}
                  disabled={
                    isVerifyingAch ||
                    isLoading ||
                    achMicrodepositAmount1.trim().length === 0 ||
                    achMicrodepositAmount2.trim().length === 0
                  }
                  className='w-full bg-emerald-600 hover:bg-emerald-700 text-white'
                >
                  {isVerifyingAch ? 'Verifying...' : 'Verify Bank Account'}
                </Button>
              </div>
            ) : savedAchMethods.length > 0 && selectedSavedAchId ? (
              <div className='space-y-4'>
                <div className='text-sm text-slate-400'>
                  Use a saved bank account or enter a new one.
                </div>
                <div className='space-y-2'>
                  <select
                    value={selectedSavedAchId}
                    onChange={(e) => setSelectedSavedAchId(e.target.value)}
                    className='flex h-9 w-full rounded-md border border-white/10 bg-slate-800/60 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
                  >
                    {savedAchMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {(m.brand || 'Bank Account')} •••• {m.last4}
                        {m.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    type='button'
                    onClick={handlePayWithSavedAch}
                    disabled={isPayingWithSavedAch || isLoading}
                    className='w-full bg-emerald-600 hover:bg-emerald-700 text-white'
                  >
                    {isPayingWithSavedAch ? 'Processing...' : 'Pay with Saved Bank Account'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setSavedAchMethods([]);
                      setSelectedSavedAchId(null);
                    }}
                    disabled={isPayingWithSavedAch || isLoading}
                    className='w-full border-white/10 text-slate-300 hover:bg-slate-800'
                  >
                    Use a different bank account
                  </Button>
                </div>
              </div>
            ) : (
              <BankAccountForm
                onSubmit={handleBankAccountSubmit}
                isLoading={isLoading}
              />
            )}
          </div>
        ) : (
          <div className='rounded-lg border border-white/10 bg-slate-800/60 p-6'>
            <CardPaymentForm
              onSubmit={handleCardPaymentSubmit}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Payment Breakdown */}
        <div className='rounded-lg border border-white/10 bg-slate-800/60 p-4 space-y-2.5'>
          <div className='text-sm font-semibold text-white'>Payment Summary</div>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-slate-400'>Rent Amount</span>
              <span className='font-semibold text-white'>{formatCurrency(rentAmount)}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-emerald-400 flex items-center gap-1'>
                <span>✓</span> No fees
              </span>
              <span className='text-emerald-400 font-semibold'>$0.00</span>
            </div>
            <div className='border-t border-white/10 pt-2 flex justify-between font-bold text-base'>
              <span className='text-white'>Total Due</span>
              <span className='text-white'>{formatCurrency(rentAmount)}</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        {errorMessage && (
          <div className='rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm'>
            <p className='text-red-300 font-medium'>{errorMessage}</p>
          </div>
        )}

        <div className='rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm'>
          <div className='flex items-start gap-2'>
            <div className='rounded-full bg-emerald-600 p-1 mt-0.5'>
              <Clock className='h-3 w-3 text-white' />
            </div>
            <div className='flex-1'>
              <p className='font-semibold text-white mb-1'>✓ No fees on any payment method</p>
              <ul className='space-y-1 text-xs text-slate-400'>
                <li className='flex items-start gap-1.5'>
                  <span className='text-emerald-400 font-bold mt-0.5'>•</span>
                  <span><strong>Bank Account:</strong> 1-3 business days</span>
                </li>
                <li className='flex items-start gap-1.5'>
                  <span className='text-emerald-400 font-bold mt-0.5'>•</span>
                  <span><strong>Card/Wallet:</strong> Instant confirmation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className='text-xs text-center text-slate-500'>
          🔒 Secure payment processed by Stripe. Your information is encrypted and protected.
        </p>
      </form>
    );
  };

  return (
    <Elements
      options={{
        clientSecret,
        appearance: {
          theme:
            theme === 'dark'
              ? 'night'
              : theme === 'light'
              ? 'stripe'
              : systemTheme === 'light'
              ? 'stripe'
              : 'night',
          variables: {
            colorPrimary: '#6366f1',
            borderRadius: '8px',
          },
        },
      }}
      stripe={stripePromise}
    >
      <StripeForm />
    </Elements>
  );
}
