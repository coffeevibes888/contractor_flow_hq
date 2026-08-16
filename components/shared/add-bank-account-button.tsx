'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface AddBankAccountButtonProps {
  /** Called when a bank account is successfully linked. Use to refetch the list. */
  onSuccess?: () => void | Promise<void>;
  /** Pre-fill name on the bank account (e.g. user.name). */
  accountHolderName?: string;
  /** Pre-fill email for receipts. */
  accountHolderEmail?: string;
  /** Mark this as the default payment method. */
  setAsDefault?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  label?: string;
}

/**
 * Adds a US bank account via Stripe Financial Connections (pure Stripe — no Plaid).
 *
 * Flow:
 *  1. Server creates a SetupIntent restricted to `us_bank_account` and returns
 *     its client_secret.
 *  2. We call `stripe.collectBankAccountForSetup()` which opens Stripe's hosted
 *     bank-link modal. The user logs into their bank and selects an account.
 *  3. We call `stripe.confirmUsBankAccountSetup()` to finalize.
 *  4. Server reads the SetupIntent, retrieves the PaymentMethod, and persists
 *     it to our `SavedPaymentMethod` table.
 */
export default function AddBankAccountButton({
  onSuccess,
  accountHolderName,
  accountHolderEmail,
  setAsDefault,
  className,
  variant = 'outline',
  size = 'default',
  label = 'Add Bank Account',
}: AddBankAccountButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddBank = async () => {
    setIsLoading(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // 1. Create SetupIntent on the server
      const setupRes = await fetch('/api/payment-methods/bank/setup-intent', {
        method: 'POST',
      });
      const setupData = await setupRes.json();

      if (!setupRes.ok || !setupData.success) {
        throw new Error(setupData.message || 'Failed to start bank setup');
      }

      const { clientSecret, setupIntentId } = setupData;

      // 2. Open Stripe's hosted bank-account collection modal (Financial Connections)
      const collectResult = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              name: accountHolderName || 'Account Holder',
              email: accountHolderEmail || undefined,
            },
          },
        },
      });

      if (collectResult.error) {
        if (collectResult.error.code === 'payment_intent_authentication_failure') {
          // User closed the modal — silent cancel
          return;
        }
        throw new Error(collectResult.error.message || 'Bank linking failed');
      }

      const intent = collectResult.setupIntent;

      // If the user cancelled, the SetupIntent will be in "requires_payment_method"
      if (!intent || intent.status === 'requires_payment_method') {
        return; // user cancelled
      }

      // 3. Confirm the SetupIntent (required to attach the PaymentMethod and
      // mark it as ready for off_session use)
      if (intent.status === 'requires_confirmation') {
        const confirmResult = await stripe.confirmUsBankAccountSetup(clientSecret);
        if (confirmResult.error) {
          throw new Error(confirmResult.error.message || 'Bank confirmation failed');
        }
      }

      // 4. Persist to our DB
      const persistRes = await fetch('/api/payment-methods/bank/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId, isDefault: setAsDefault }),
      });
      const persistData = await persistRes.json();

      if (!persistRes.ok || !persistData.success) {
        throw new Error(persistData.message || 'Failed to save bank account');
      }

      toast({ description: persistData.message });
      await onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add bank account';
      toast({ variant: 'destructive', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type='button'
      variant={variant}
      size={size}
      onClick={handleAddBank}
      disabled={isLoading}
      className={cn(className)}
    >
      {isLoading ? (
        <>
          <Loader2 className='h-4 w-4 mr-1.5 animate-spin' />
          Linking bank...
        </>
      ) : (
        <>
          <Building2 className='h-4 w-4 mr-1.5' />
          {label}
        </>
      )}
    </Button>
  );
}
