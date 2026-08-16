/**
 * Payout Management Actions
 * 
 * NOTE: With the direct payment model, most payout actions are deprecated.
 * Stripe automatically handles payouts from Connect accounts to landlord banks.
 * These actions are kept for backward compatibility.
 */

'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { formatError } from '@/lib/utils';
import Stripe from 'stripe';
import {
  createInstantPayoutToDebitCard,
  createAchPayout,
  getPayoutLimitUsage,
  checkInstantPayoutEligibility,
} from '@/lib/services/stripe-payout-service';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { PLATFORM_FEES, STRIPE_LIMITS } from '@/lib/config/stripe-constants';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// ============= ADD PAYOUT METHOD =============

const addPayoutMethodSchema = z.object({
  type: z.enum(['bank_account', 'card']),
  accountHolderName: z.string().min(2),
  last4: z.string().length(4),
  bankName: z.string().optional(),
  accountType: z.enum(['checking', 'savings']).optional(),
  routingNumber: z.string().optional(),
  stripePaymentMethodId: z.string(),
  isDefault: z.boolean().optional().default(false),
});

/**
 * Add a new payout method (bank account or debit card)
 * For landlords to receive payouts
 */
export async function addPayoutMethod(
  data: z.infer<typeof addPayoutMethodSchema>
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    // Validate Stripe payment method exists
    if (!data.stripePaymentMethodId.startsWith('pm_')) {
      return { success: false, message: 'Invalid payment method ID' };
    }

    const validatedData = addPayoutMethodSchema.parse(data);

    // If setting as default, unset others
    if (validatedData.isDefault) {
      await prisma.savedPayoutMethod.updateMany({
        where: { landlordId: landlord.id },
        data: { isDefault: false },
      });
    }

    // Create the saved payout method
    const payoutMethod = await prisma.savedPayoutMethod.create({
      data: {
        landlordId: landlord.id,
        stripePaymentMethodId: validatedData.stripePaymentMethodId,
        type: validatedData.type,
        accountHolderName: validatedData.accountHolderName,
        last4: validatedData.last4,
        bankName: validatedData.bankName,
        accountType: validatedData.accountType,
        routingNumber: validatedData.routingNumber,
        isDefault: validatedData.isDefault,
        isVerified: validatedData.type === 'card', // Cards are instant, bank needs verification
      },
    });

    return {
      success: true,
      message: validatedData.type === 'card'
        ? 'Debit card saved successfully! Ready for instant payouts.'
        : 'Bank account added. Complete verification to enable payouts.',
      payoutMethodId: payoutMethod.id,
    };
  } catch (error) {
    console.error('Error adding payout method:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= GET PAYOUT METHODS =============

/**
 * Get all payout methods for current landlord
 */
export async function getPayoutMethods() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', methods: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, methods: [] };
    }

    const landlord = landlordResult.landlord;

    const methods = await prisma.savedPayoutMethod.findMany({
      where: { landlordId: landlord.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      methods: methods.map((method) => ({
        id: method.id,
        type: method.type,
        name: method.type === 'card'
          ? `Debit Card ending in ${method.last4}`
          : `${method.bankName || 'Bank Account'} ending in ${method.last4}`,
        last4: method.last4,
        bankName: method.bankName,
        accountType: method.accountType,
        isDefault: method.isDefault,
        isVerified: method.isVerified,
        createdAt: method.createdAt,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), methods: [] };
  }
}

// ============= REQUEST INSTANT PAYOUT =============

const requestPayoutSchema = z.object({
  payoutMethodId: z.string(),
  amountInDollars: z.number().positive(),
  isInstant: z.boolean().optional().default(false),
});

/**
 * Request a payout to selected method
 * For instant payouts, validates daily/monthly limits and $2,500 transaction cap
 * Free tier: $2.00 platform fee on cashouts
 * Growth/Professional/Enterprise: NO platform fees (only Stripe's fees)
 */
export async function requestPayout(data: z.infer<typeof requestPayoutSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    if (!landlord.stripeConnectAccountId) {
      return {
        success: false,
        message: 'Stripe account not connected. Complete onboarding first.',
      };
    }

    const validatedData = requestPayoutSchema.parse(data);

    // Get the payout method
    const payoutMethod = await prisma.savedPayoutMethod.findUnique({
      where: { id: validatedData.payoutMethodId },
    });

    if (!payoutMethod || payoutMethod.landlordId !== landlord.id) {
      return { success: false, message: 'Payout method not found' };
    }

    if (!payoutMethod.isVerified) {
      return {
        success: false,
        message: 'Payout method not verified. Complete verification first.',
      };
    }

    // Validate instant payout transaction cap ($2,500 max per request)
    if (validatedData.isInstant && payoutMethod.type === 'card') {
      if (validatedData.amountInDollars > 2500) {
        return {
          success: false,
          message: `Instant cashout is limited to $2,500 per request. You requested $${validatedData.amountInDollars.toFixed(2)}. Use Bank Transfer for larger amounts.`,
        };
      }
    }

    // Basic validation
    if (validatedData.amountInDollars < STRIPE_LIMITS.ACH_MIN) {
      return { success: false, message: `Minimum payout is $${STRIPE_LIMITS.ACH_MIN}` };
    }

    // For instant payouts, check daily/monthly limits
    if (validatedData.isInstant && payoutMethod.type === 'card') {
      const limitUsage = await getPayoutLimitUsage(landlord.stripeConnectAccountId);

      if (!limitUsage.success) {
        return {
          success: false,
          message: 'Could not check payout limits. Try again later.',
        };
      }

      if (!limitUsage.dailyRemaining || validatedData.amountInDollars > limitUsage.dailyRemaining) {
        return {
          success: false,
          message: `Daily limit: $${limitUsage.dailyRemaining?.toFixed(2)} remaining. You requested $${validatedData.amountInDollars.toFixed(2)}.`,
        };
      }

      if (!limitUsage.monthlyRemaining || validatedData.amountInDollars > limitUsage.monthlyRemaining) {
        return {
          success: false,
          message: `Monthly limit: $${limitUsage.monthlyRemaining?.toFixed(2)} remaining. You requested $${validatedData.amountInDollars.toFixed(2)}.`,
        };
      }
    }

    const amountInCents = Math.round(validatedData.amountInDollars * 100);

    // Create payout
    let payoutResult;
    if (validatedData.isInstant && payoutMethod.type === 'card') {
      payoutResult = await createInstantPayoutToDebitCard(
        landlord.stripeConnectAccountId,
        amountInCents,
        payoutMethod.stripePaymentMethodId,
        { landlordId: landlord.id }
      );
    } else {
      payoutResult = await createAchPayout(
        landlord.stripeConnectAccountId,
        amountInCents,
        payoutMethod.stripePaymentMethodId,
        { landlordId: landlord.id }
      );
    }

    if (!payoutResult.success || !payoutResult.payout) {
      return { success: false, message: payoutResult.error };
    }

    // Get landlord's subscription tier to determine if platform fees apply
    const landlordWithSub = await prisma.landlord.findUnique({
      where: { id: landlord.id },
      include: { subscription: true },
    });
    
    // Import normalizeTier at top of file if not already
    const tierValue = landlordWithSub?.subscription?.tier || landlordWithSub?.subscriptionTier || 'free';
    // Normalize legacy tiers (growth, professional) to new structure (pro)
    const currentTier: SubscriptionTier = 
      tierValue === 'growth' || tierValue === 'professional' ? 'pro' : 
      (tierValue as SubscriptionTier) || 'free';
    const noPlatformFees = hasNoCashoutFees(currentTier);

    // Calculate fees for response messaging
    // Stripe fees always apply, platform fees only for free tier
    const stripeFee = validatedData.isInstant ? 0.50 : Math.min(validatedData.amountInDollars * 0.008, 5.0);
    const platformFee = noPlatformFees ? 0 : PLATFORM_FEES.CASHOUT_INSTANT;
    const totalFee = stripeFee + platformFee;
    const netReceived = validatedData.amountInDollars - totalFee;

    // Build fee breakdown message based on tier
    let feeBreakdown: string;
    if (noPlatformFees) {
      feeBreakdown = validatedData.isInstant
        ? `Stripe: $${stripeFee.toFixed(2)} (no platform fee on ${currentTier} plan)`
        : `Stripe: $${(Math.round(stripeFee * 100) / 100).toFixed(2)} (0.8% capped at $5, no platform fee on ${currentTier} plan)`;
    } else {
      feeBreakdown = validatedData.isInstant
        ? `Stripe: $${stripeFee.toFixed(2)} + Platform: $${platformFee.toFixed(2)} = $${totalFee.toFixed(2)} total fee`
        : `Stripe: $${(Math.round(stripeFee * 100) / 100).toFixed(2)} (0.8% capped at $5) + Platform: $${platformFee.toFixed(2)} = $${(Math.round(totalFee * 100) / 100).toFixed(2)} total fee`;
    }

    return {
      success: true,
      message: validatedData.isInstant
        ? `🚀 GET YOUR MONEY in 30 min! Instant payout of $${validatedData.amountInDollars.toFixed(2)} initiated. Should arrive in 30 min-2 hours.`
        : `💰 Bank Transfer initiated! ACH payout of $${validatedData.amountInDollars.toFixed(2)} initiated. Should arrive in 1-3 business days.`,
      payoutId: payoutResult.payout.id,
      details: {
        ...payoutResult.details,
        amountRequested: validatedData.amountInDollars,
        stripeFee: Math.round(stripeFee * 100) / 100,
        platformFee,
        totalFee: Math.round(totalFee * 100) / 100,
        landlordReceives: Math.round(netReceived * 100) / 100,
        feeBreakdown,
        subscriptionTier: currentTier,
        noPlatformFees,
      },
    };
  } catch (error) {
    console.error('Error requesting payout:', error);
    return { success: false, message: formatError(error) };
  }
}


// ============= DELETE PAYOUT METHOD =============

/**
 * Delete a saved payout method
 */
export async function deletePayoutMethod(payoutMethodId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    const method = await prisma.savedPayoutMethod.findUnique({
      where: { id: payoutMethodId },
    });

    if (!method || method.landlordId !== landlord.id) {
      return { success: false, message: 'Payout method not found' };
    }

    await prisma.savedPayoutMethod.delete({
      where: { id: payoutMethodId },
    });

    return { success: true, message: 'Payout method deleted' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= SET DEFAULT PAYOUT METHOD =============

/**
 * Set which payout method is used by default
 */
export async function setDefaultPayoutMethod(payoutMethodId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    const method = await prisma.savedPayoutMethod.findUnique({
      where: { id: payoutMethodId },
    });

    if (!method || method.landlordId !== landlord.id) {
      return { success: false, message: 'Payout method not found' };
    }

    // Unset all others, set this one
    await prisma.savedPayoutMethod.updateMany({
      where: { landlordId: landlord.id },
      data: { isDefault: false },
    });

    await prisma.savedPayoutMethod.update({
      where: { id: payoutMethodId },
      data: { isDefault: true },
    });

    return { success: true, message: 'Default payout method updated' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= GET PAYOUT STATUS =============

/**
 * Check status of a specific payout
 */
export async function getPayoutStatus(payoutId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    if (!landlord.stripeConnectAccountId) {
      return { success: false, message: 'Stripe account not connected' };
    }

    const payout = await stripe.payouts.retrieve(payoutId, {
      stripeAccount: landlord.stripeConnectAccountId,
    });

    return {
      success: true,
      payout: {
        id: payout.id,
        status: payout.status,
        amount: (payout.amount / 100).toFixed(2),
        created: new Date(payout.created * 1000).toISOString(),
        arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
        method: payout.method,
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
