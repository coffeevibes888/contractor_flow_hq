/**
 * Stripe Payout Service
 * 
 * NOTE: With the direct payment model, manual payouts are no longer needed.
 * Stripe automatically handles payouts from Connect accounts to landlord banks.
 * This service is kept for reference but most functions are deprecated.
 */

import Stripe from 'stripe';
import { STRIPE_LIMITS } from '@/lib/config/stripe-constants';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

// Default payout limits (Stripe's standard limits)
const INSTANT_PAYOUT_DAILY_LIMIT = 10000;
const INSTANT_PAYOUT_MONTHLY_LIMIT = 50000;
const INSTANT_PAYOUT_FEE = 0.50;

// ============= PAYOUT CREATION =============

/**
 * @deprecated - With direct payments, Stripe handles payouts automatically
 */
export async function createInstantPayoutToDebitCard(
  connectedAccountId: string,
  amountInCents: number,
  paymentMethodId: string,
  metadata?: Record<string, string>
): Promise<{
  success: boolean;
  payout?: Stripe.Payout;
  error?: string;
  details?: {
    amount: number;
    fee: number;
    net: number;
    timeline: string;
    dailyRemaining: number;
    monthlyRemaining: number;
  };
}> {
  try {
    if (amountInCents < 100) {
      return { success: false, error: 'Minimum instant payout is $1.00' };
    }

    if (amountInCents / 100 > INSTANT_PAYOUT_DAILY_LIMIT) {
      return {
        success: false,
        error: `Daily limit of $${INSTANT_PAYOUT_DAILY_LIMIT} exceeded`,
      };
    }

    const payout = await stripe.payouts.create(
      {
        amount: amountInCents,
        currency: 'usd',
        method: 'instant',
        destination: paymentMethodId,
        description: 'Instant payout to debit card',
        metadata: { ...metadata, type: 'instant_debit_payout' },
      },
      { stripeAccount: connectedAccountId }
    );

    return {
      success: true,
      payout,
      details: {
        amount: amountInCents / 100,
        fee: INSTANT_PAYOUT_FEE,
        net: (amountInCents / 100) - INSTANT_PAYOUT_FEE,
        timeline: '30 minutes to 2 hours',
        dailyRemaining: INSTANT_PAYOUT_DAILY_LIMIT - (amountInCents / 100),
        monthlyRemaining: INSTANT_PAYOUT_MONTHLY_LIMIT - (amountInCents / 100),
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create payout' };
  }
}

/**
 * @deprecated - With direct payments, Stripe handles payouts automatically
 */
export async function createAchPayout(
  connectedAccountId: string,
  amountInCents: number,
  bankAccountId: string,
  metadata?: Record<string, string>
): Promise<{
  success: boolean;
  payout?: Stripe.Payout;
  error?: string;
  details?: { amount: number; fee: number; net: number; timeline: string };
}> {
  try {
    if (amountInCents < STRIPE_LIMITS.ACH_MIN * 100) {
      return { success: false, error: `Minimum ACH payout is $${STRIPE_LIMITS.ACH_MIN}` };
    }

    const payout = await stripe.payouts.create(
      {
        amount: amountInCents,
        currency: 'usd',
        method: 'standard',
        destination: bankAccountId,
        description: 'Standard ACH payout',
        metadata: { ...metadata, type: 'ach_payout' },
      },
      { stripeAccount: connectedAccountId }
    );

    return {
      success: true,
      payout,
      details: {
        amount: amountInCents / 100,
        fee: 0,
        net: amountInCents / 100,
        timeline: '1-3 business days',
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create payout' };
  }
}

/**
 * Get payout limit usage for a connected account
 */
export async function getPayoutLimitUsage(
  connectedAccountId: string
): Promise<{
  success: boolean;
  dailyUsed?: number;
  dailyRemaining?: number;
  monthlyUsed?: number;
  monthlyRemaining?: number;
  error?: string;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const todayPayouts = await stripe.payouts.list(
      { created: { gte: Math.floor(today.getTime() / 1000) }, limit: 100 },
      { stripeAccount: connectedAccountId }
    );

    const monthPayouts = await stripe.payouts.list(
      { created: { gte: Math.floor(monthStart.getTime() / 1000) }, limit: 100 },
      { stripeAccount: connectedAccountId }
    );

    const dailyInstant = todayPayouts.data
      .filter((p) => p.method === 'instant')
      .reduce((sum, p) => sum + p.amount, 0) / 100;

    const monthlyInstant = monthPayouts.data
      .filter((p) => p.method === 'instant')
      .reduce((sum, p) => sum + p.amount, 0) / 100;

    return {
      success: true,
      dailyUsed: dailyInstant,
      dailyRemaining: Math.max(0, INSTANT_PAYOUT_DAILY_LIMIT - dailyInstant),
      monthlyUsed: monthlyInstant,
      monthlyRemaining: Math.max(0, INSTANT_PAYOUT_MONTHLY_LIMIT - monthlyInstant),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get payout limits' };
  }
}

/**
 * Check if account is eligible for instant payouts
 */
export async function checkInstantPayoutEligibility(
  connectedAccountId: string
): Promise<{
  success: boolean;
  eligible?: boolean;
  requirements?: string[];
  error?: string;
}> {
  try {
    const account = await stripe.accounts.retrieve(connectedAccountId);

    const eligible =
      account.payouts_enabled &&
      account.charges_enabled &&
      (!account.requirements?.past_due || account.requirements.past_due.length === 0);

    return {
      success: true,
      eligible,
      requirements: account.requirements?.past_due || [],
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to check eligibility' };
  }
}
