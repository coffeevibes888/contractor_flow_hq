/**
 * Stripe Transparency & Fee Display
 * Shows tenants and landlords exactly what's happening with their money
 */

import {
  TENANT_PAYMENT_METHODS,
  LANDLORD_PAYOUT_METHODS,
  STRIPE_PROCESSING_FEES,
  PLATFORM_FEES,
  STRIPE_LIMITS,
} from '@/lib/config/stripe-constants';
import { SubscriptionTier, hasNoCashoutFees } from '@/lib/config/subscription-tiers';

// ============= TENANT PAYMENT TRANSPARENCY =============

/**
 * Show tenant exactly what they'll pay for rent
 * Breaks down: rent amount, convenience fee, total
 */
export function getTenantPaymentTransparency(
  rentAmountInDollars: number,
  paymentMethodType: string = 'CARD'
): {
  rentAmount: number;
  platformFee: number;
  stripeFee: number;
  totalFees: number;
  totalToPay: number;
  breakdown: string;
  paymentMethod: string;
  timeline: string;
  processingTime: string;
} {
  // Normalize to uppercase (CARD, ACH, etc)
  const normalizedType = paymentMethodType.toUpperCase();
  const method = TENANT_PAYMENT_METHODS[normalizedType as keyof typeof TENANT_PAYMENT_METHODS];
  
  if (!method) {
    throw new Error(`Unknown payment method: ${paymentMethodType}`);
  }

  const platformFee = method.fee > 0 
    ? method.fee * 0.01 * rentAmountInDollars + method.feeFixed
    : 0;

  // Stripe takes their cut too (2.9% + $0.30 for cards, 0.8% for ACH)
  let stripeFee = 0;
  if (normalizedType === 'CARD' || normalizedType === 'APPLE_PAY' || normalizedType === 'GOOGLE_PAY') {
    stripeFee = (STRIPE_PROCESSING_FEES.CARD * rentAmountInDollars) + STRIPE_PROCESSING_FEES.CARD_FIXED;
  } else if (normalizedType === 'ACH') {
    stripeFee = STRIPE_PROCESSING_FEES.ACH * rentAmountInDollars;
    // ACH has min/max
    stripeFee = Math.max(STRIPE_PROCESSING_FEES.ACH_MIN, Math.min(stripeFee, STRIPE_PROCESSING_FEES.ACH_MAX));
  }

  const totalFees = platformFee + stripeFee;
  const totalToPay = rentAmountInDollars + totalFees;

  return {
    rentAmount: rentAmountInDollars,
    platformFee: Math.round(platformFee * 100) / 100,
    stripeFee: Math.round(stripeFee * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalToPay: Math.round(totalToPay * 100) / 100,
    breakdown: `Rent ($${rentAmountInDollars}) + Platform Fee ($${(Math.round(platformFee * 100) / 100).toFixed(2)}) + Processing ($${(Math.round(stripeFee * 100) / 100).toFixed(2)}) = $${(Math.round(totalToPay * 100) / 100).toFixed(2)}`,
    paymentMethod: method.name,
    timeline: method.timeline,
    processingTime: method.processingTime,
  };
}

/**
 * Detailed tenant payment method comparison
 * Help tenants choose the best payment method
 */
export function compareTenantPaymentMethods(rentAmountInDollars: number): Array<{
  name: string;
  type: string;
  fee: number;
  total: number;
  savings: number;
  timeline: string;
  description: string;
  recommended: boolean;
}> {
  const methods = Object.entries(TENANT_PAYMENT_METHODS)
    .filter(([, method]) => method.supported)
    .map(([key, method]) => {
      const transparency = getTenantPaymentTransparency(rentAmountInDollars, key);
      return {
        name: method.name,
        type: method.type,
        fee: transparency.totalFees,
        total: transparency.totalToPay,
        savings: method.type === 'us_bank_account' ? transparency.platformFee + transparency.stripeFee : 0,
        timeline: method.timeline,
        description: method.description,
        recommended: method.type === 'us_bank_account', // ACH is best value
      };
    })
    .sort((a, b) => a.total - b.total);

  return methods;
}

/**
 * Format tenant payment info for UI display
 */
export function formatTenantPaymentInfo(
  rentAmountInDollars: number,
  paymentMethodType: string
): {
  displayName: string;
  icon: string;
  rentAmount: string;
  platformFee: string;
  totalPay: string;
  timeline: string;
  feeBreakdown: string;
  processingTime: string;
} {
  const normalizedType = paymentMethodType.toUpperCase();
  const transparency = getTenantPaymentTransparency(rentAmountInDollars, paymentMethodType);
  const method = TENANT_PAYMENT_METHODS[normalizedType as keyof typeof TENANT_PAYMENT_METHODS];

  return {
    displayName: method?.name || 'Unknown',
    icon: method?.icon || 'payment',
    rentAmount: `$${rentAmountInDollars.toFixed(2)}`,
    platformFee: `$${transparency.platformFee.toFixed(2)}`,
    totalPay: `$${transparency.totalToPay.toFixed(2)}`,
    timeline: transparency.timeline,
    feeBreakdown: `Platform: $${transparency.platformFee.toFixed(2)} + Processing: $${transparency.stripeFee.toFixed(2)}`,
    processingTime: transparency.processingTime,
  };
}

// ============= LANDLORD PAYOUT TRANSPARENCY =============

/**
 * Show landlord exactly what they'll receive for rent
 * Accounts for Stripe Connect fees and platform fees
 */
export function getLandlordPayoutTransparency(
  rentAmountInDollars: number,
  stripePaymentMethodUsedByTenant: string = 'card'
): {
  rentAmount: number;
  platformFees: number;
  stripeProcessingFees: number;
  totalDeductions: number;
  landlordReceives: number;
  breakdown: string;
  estimatedTimeline: string;
} {
  // What tenant paid (includes their fees)
  const tenantTransparency = getTenantPaymentTransparency(rentAmountInDollars, stripePaymentMethodUsedByTenant);
  
  // Platform fee (Stripe app takes this from tenant)
  const platformFee = PLATFORM_FEES[stripePaymentMethodUsedByTenant as keyof typeof PLATFORM_FEES] || PLATFORM_FEES.DEFAULT;

  // Stripe's processing fee (Stripe takes this from the total)
  let stripeFee = 0;
  if (stripePaymentMethodUsedByTenant === 'card' || stripePaymentMethodUsedByTenant === 'apple_pay' || stripePaymentMethodUsedByTenant === 'google_pay') {
    stripeFee = (STRIPE_PROCESSING_FEES.CARD * rentAmountInDollars) + STRIPE_PROCESSING_FEES.CARD_FIXED;
  } else if (stripePaymentMethodUsedByTenant === 'us_bank_account') {
    stripeFee = Math.max(
      STRIPE_PROCESSING_FEES.ACH_MIN,
      Math.min(STRIPE_PROCESSING_FEES.ACH * rentAmountInDollars, STRIPE_PROCESSING_FEES.ACH_MAX)
    );
  }

  // Landlord receives the rent minus Stripe's fees
  // Platform fee is charged to tenant, not landlord
  const landlordReceives = rentAmountInDollars - stripeFee;

  return {
    rentAmount: rentAmountInDollars,
    platformFees: platformFee, // What tenant paid as convenience fee
    stripeProcessingFees: Math.round(stripeFee * 100) / 100,
    totalDeductions: Math.round(stripeFee * 100) / 100,
    landlordReceives: Math.round(landlordReceives * 100) / 100,
    breakdown: `Tenant pays $${tenantTransparency.totalToPay.toFixed(2)} → Platform fee $${platformFee.toFixed(2)} to app → Stripe fee $${stripeFee.toFixed(2)} → You receive $${(Math.round(landlordReceives * 100) / 100).toFixed(2)}`,
    estimatedTimeline: stripePaymentMethodUsedByTenant === 'us_bank_account' 
      ? '1-3 business days' 
      : '1-2 business days',
  };
}

/**
 * Show landlord payout options with their costs (legacy - use getLandlordCashoutOptions instead)
 */
export function comparePayoutMethods(amountInDollars: number): Array<{
  name: string;
  type: string;
  stripeFee: number;
  platformFee: number;
  totalFee: number;
  netReceived: number;
  timeline: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  recommendedFor: string;
  noPlatformFee?: boolean;
}> {
  // Check if this tier has no platform fees (Growth/Professional/Enterprise)
  const noPlatformFee = hasNoCashoutFees(subscriptionTier);
  
  // Instant card payout (capped at $2,500)
  const instantAmount = Math.min(amountInDollars, 2500);
  const instantStripeFee = 0.50;
  const instantPlatformFee = noPlatformFee ? 0 : 2.0;
  const instantTotalFee = instantStripeFee + instantPlatformFee;

  // ACH bank transfer (any amount)
  const achStripeFeeCents = Math.round(amountInDollars * 0.008 * 100);
  const achStripeFee = Math.min(achStripeFeeCents / 100, 5.0);
  const achPlatformFee = noPlatformFee ? 0 : 2.0;
  const achTotalFee = achStripeFee + achPlatformFee;

  return [
    {
      name: `${LANDLORD_PAYOUT_METHODS.STANDARD_ACH.emoji} ${LANDLORD_PAYOUT_METHODS.STANDARD_ACH.name}`,
      type: 'bank_account',
      stripeFee: Math.round(achStripeFee * 100) / 100,
      platformFee: achPlatformFee,
      totalFee: Math.round(achTotalFee * 100) / 100,
      netReceived: Math.round((amountInDollars - achTotalFee) * 100) / 100,
      timeline: LANDLORD_PAYOUT_METHODS.STANDARD_ACH.timeline,
      recommendedFor: noPlatformFee 
        ? 'Large amounts, no rush - no platform fees on your plan!' 
        : 'Large amounts, no rush, want to minimize fees',
      noPlatformFee,
    },
    {
      name: `${LANDLORD_PAYOUT_METHODS.INSTANT_CARD.emoji} ${LANDLORD_PAYOUT_METHODS.INSTANT_CARD.name}`,
      type: 'card',
      stripeFee: instantStripeFee,
      platformFee: instantPlatformFee,
      totalFee: instantTotalFee,
      netReceived: instantAmount - instantTotalFee,
      timeline: LANDLORD_PAYOUT_METHODS.INSTANT_CARD.timeline,
      dailyLimit: STRIPE_LIMITS.INSTANT_PAYOUT_DAILY_LIMIT,
      monthlyLimit: STRIPE_LIMITS.INSTANT_PAYOUT_MONTHLY_LIMIT,
      recommendedFor: noPlatformFee 
        ? 'Need cash quickly - no platform fees on your plan!' 
        : 'Need cash quickly, amounts under $2,500',
      noPlatformFee,
    },
  ];
}

/**
 * Format payout option for UI display
 */
export function formatPayoutMethodInfo(
  methodType: string,
  amountInDollars: number
): {
  name: string;
  icon: string;
  amount: string;
  stripeFee: string;
  platformFee: string;
  totalFee: string;
  netReceived: string;
  timeline: string;
  description: string;
  warning?: string;
} {
  const method = methodType === 'card' 
    ? LANDLORD_PAYOUT_METHODS.INSTANT_CARD
    : LANDLORD_PAYOUT_METHODS.STANDARD_ACH;

  if (!method) {
    throw new Error(`Unknown payout method: ${methodType}`);
  }

  let stripeFee = 0;
  let totalFee = 0;
  let warning = undefined;

  if (methodType === 'card') {
    // Instant card payout
    stripeFee = STRIPE_LIMITS.INSTANT_PAYOUT_FEE;
    totalFee = stripeFee + PLATFORM_FEES.CASHOUT_INSTANT;
    
    if (amountInDollars > STRIPE_LIMITS.INSTANT_PAYOUT_MAX_PER_TRANSACTION) {
      warning = `Instant cashout limited to $${STRIPE_LIMITS.INSTANT_PAYOUT_MAX_PER_TRANSACTION}. Use Bank Transfer for larger amounts.`;
    }
    if (amountInDollars > STRIPE_LIMITS.INSTANT_PAYOUT_DAILY_LIMIT) {
      warning = `Exceeds daily limit of $${STRIPE_LIMITS.INSTANT_PAYOUT_DAILY_LIMIT}`;
    }
  } else {
    // ACH bank transfer
    stripeFee = Math.min(amountInDollars * 0.008, STRIPE_PROCESSING_FEES.ACH_MAX);
    totalFee = stripeFee + PLATFORM_FEES.CASHOUT_ACH;
  }

  const netReceived = amountInDollars - totalFee;

  return {
    name: method.name,
    icon: method.icon,
    amount: `$${amountInDollars.toFixed(2)}`,
    stripeFee: `$${stripeFee.toFixed(2)}`,
    platformFee: `$${PLATFORM_FEES[methodType === 'card' ? 'CASHOUT_INSTANT' : 'CASHOUT_ACH'].toFixed(2)}`,
    totalFee: `$${totalFee.toFixed(2)}`,
    netReceived: `$${(netReceived < 0 ? 0 : netReceived).toFixed(2)}`,
    timeline: method.timeline,
    description: method.description,
    warning,
  };
}

/**
 * Show landlord their cashout options with exact fees
 * Two tiers: Instant ($2,500 max) or Standard (any amount)
 * Paid subscription tiers (Growth/Professional/Enterprise) have NO platform fees
 */
export function getLandlordCashoutOptions(
  availableBalanceInDollars: number,
  subscriptionTier: SubscriptionTier = 'starter'
): Array<{
  emoji: string;
  title: string;
  subtitle: string;
  maxPerRequest: number | null;
  stripeFee: number | null;
  platformFee: number;
  totalFee: number | null;
  landlordReceives: number | null;
  timeline: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  callToAction: string;
  description: string;
  note?: string;
}> {
  return [
    {
      emoji: '🚀',
      title: 'GET YOUR MONEY in 30 min',
      subtitle: 'Instant to Debit Card',
      maxPerRequest: 2500, // Platform imposed limit
      stripeFee: 0.50, // Stripe's fee
      platformFee: 2.0, // Your platform fee
      totalFee: 2.5, // $2.50 total
      landlordReceives: Math.min(availableBalanceInDollars, 2500) - 2.5, // What they actually get
      timeline: '30 minutes to 2 hours',
      dailyLimit: 10000,
      monthlyLimit: 50000,
      callToAction: 'Request Instant Cashout',
      description: 'Get your money fast to your debit card (Visa, Mastercard, American Express)',
      note: 'Maximum $2,500 per request. Daily limit: $10,000. Monthly limit: $50,000.',
    },
    {
      emoji: '💰',
      title: 'Bank Transfer (Standard)',
      subtitle: 'ACH to Your Bank Account',
      maxPerRequest: null, // No limit
      stripeFee: Math.min(availableBalanceInDollars * 0.008, 5.0), // 0.8% capped at $5
      platformFee: 2.0, // Your platform fee
      totalFee: 2.0 + Math.min(availableBalanceInDollars * 0.008, 5.0), // Varies
      landlordReceives: availableBalanceInDollars - 2.0 - Math.min(availableBalanceInDollars * 0.008, 5.0),
      timeline: '1-3 business days',
      callToAction: 'Request Bank Transfer',
      description: 'Withdraw your full balance to your bank account',
      note: 'No daily or monthly limits. Process takes 1-3 business days.',
    },
  ];
}

/**
 * Format landlord cashout option for UI display
 */
export function formatCashoutOption(
  option: ReturnType<typeof getLandlordCashoutOptions>[number]
): {
  emoji: string;
  title: string;
  subtitle: string;
  maxPerRequest: string;
  timeline: string;
  totalFee: string;
  landlordReceives: string;
  callToAction: string;
  description: string;
  details: string;
  dailyMonthlyLimits: string;
} {
  return {
    emoji: option.emoji,
    title: option.title,
    subtitle: option.subtitle,
    maxPerRequest: option.maxPerRequest ? `Up to $${option.maxPerRequest.toFixed(2)}` : 'Any amount',
    timeline: option.timeline,
    totalFee: option.totalFee ? `$${option.totalFee.toFixed(2)}` : 'Varies',
    landlordReceives: option.landlordReceives ? `$${option.landlordReceives.toFixed(2)}` : 'Calculated per request',
    callToAction: option.callToAction,
    description: option.description,
    details: `Stripe fee: $${(option.stripeFee || 0).toFixed(2)} + Platform fee: $${option.platformFee.toFixed(2)}`,
    dailyMonthlyLimits: option.dailyLimit 
      ? `Daily: $${option.dailyLimit} | Monthly: $${option.monthlyLimit}`
      : 'No limits',
  };
}

/**
 * Generate detailed cashout breakdown for a specific amount and method
 */
export function getCashoutBreakdown(
  amountInDollars: number,
  method: 'instant' | 'ach',
  subscriptionTier: SubscriptionTier = 'starter'
): {
  amountRequested: number;
  stripeFee: number;
  platformFee: number;
  totalFee: number;
  landlordReceives: number;
  breakdown: string;
  warning?: string;
  noPlatformFee: boolean;
} {
  const noPlatformFee = hasNoCashoutFees(subscriptionTier);
  
  if (method === 'instant') {
    // Instant card payout
    if (amountInDollars > 2500) {
      return {
        amountRequested: amountInDollars,
        stripeFee: 0,
        platformFee: 0,
        totalFee: 0,
        landlordReceives: 0,
        breakdown: '',
        warning: `Instant cashout is limited to $2,500 per request. Please use Bank Transfer for larger amounts.`,
      };
    }

    const stripeFee = 0.50;
    const platformFee = 2.0;
    const totalFee = stripeFee + platformFee;
    const landlordReceives = amountInDollars - totalFee;

    return {
      amountRequested: amountInDollars,
      stripeFee,
      platformFee,
      totalFee,
      landlordReceives,
      breakdown: `Request: $${amountInDollars.toFixed(2)} → Stripe fee: $${stripeFee.toFixed(2)} + Platform fee: $${platformFee.toFixed(2)} = $${totalFee.toFixed(2)} total fee → You receive: $${landlordReceives.toFixed(2)}`,
    };
  } else {
    // ACH bank transfer
    const stripeFeeCents = Math.round(amountInDollars * 0.008 * 100);
    const stripeFee = Math.min(stripeFeeCents / 100, 5.0); // Cap at $5
    const platformFee = 2.0;
    const totalFee = stripeFee + platformFee;
    const landlordReceives = amountInDollars - totalFee;

    return {
      amountRequested: amountInDollars,
      stripeFee: Math.round(stripeFee * 100) / 100,
      platformFee,
      totalFee: Math.round(totalFee * 100) / 100,
      landlordReceives: Math.round(landlordReceives * 100) / 100,
      breakdown: `Request: $${amountInDollars.toFixed(2)} → Stripe fee: $${(Math.round(stripeFee * 100) / 100).toFixed(2)} (0.8% capped at $5) + Platform fee: $${platformFee.toFixed(2)} = $${(Math.round(totalFee * 100) / 100).toFixed(2)} total fee → You receive: $${(Math.round(landlordReceives * 100) / 100).toFixed(2)}`,
    };
  }
}

// ============= EDUCATIONAL CONTENT =============

/**
 * Tenant-facing explanation of fees
 */
export const TENANT_FEE_EXPLANATION = {
  card: {
    title: 'Credit/Debit Card Payment',
    description: 'Fast processing with card payment',
    breakdown: [
      { label: 'Rent Amount', source: 'landlord' },
      { label: 'Platform Fee', source: 'platform', note: '$2.00 per payment' },
      { label: 'Processing Fee', source: 'stripe', note: '2.9% + $0.30' },
    ],
    when: 'You see all fees before confirming payment',
    why: 'These fees cover payment processing and platform maintenance',
  },
  ach: {
    title: 'Bank Account (ACH) Payment',
    description: 'No convenience fees, direct from your bank',
    breakdown: [
      { label: 'Rent Amount', source: 'landlord' },
      { label: 'Platform Fee', source: 'none', note: 'FREE' },
      { label: 'Processing Fee', source: 'stripe', note: 'Usually <$1' },
    ],
    when: 'Takes 1-3 business days',
    why: 'ACH is the most economical way to pay rent',
  },
};

/**
 * Landlord-facing explanation of payouts
 */
export const LANDLORD_PAYOUT_EXPLANATION = {
  ach: {
    title: 'ACH Transfer (Standard)',
    description: 'Free transfer to your bank account',
    timeline: '1-3 business days',
    fee: 'FREE',
    usedFor: 'Planned payouts, large amounts, no urgency',
    limits: 'No daily or monthly limits',
  },
  instant: {
    title: 'Instant to Debit Card',
    description: 'Get your money within minutes to hours',
    timeline: '30 minutes to 2 hours',
    fee: '$0.50 per transfer',
    usedFor: 'When you need cash fast',
    limits: `$10,000/day | $50,000/month`,
  },
};

/**
 * Stripe fee structure explanation
 */
export const STRIPE_FEE_EXPLANATION = `
Stripe Charges (Not Our Platform - This is How Credit Card Processing Works):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHEN TENANT PAYS WITH CARD:
• Stripe Fee: 2.9% + $0.30 (industry standard)
• Our Platform Fee: $2.00 (flat, covers our costs)
• Your rent goes through these fees

WHEN TENANT PAYS WITH BANK ACCOUNT:
• Stripe Fee: 0.8% (min $0.01, max $5.00)
• Our Platform Fee: FREE (we eat this cost)
• Cheapest option for everyone

EXAMPLE: Tenant pays $1,500 rent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Via Card:
  Rent: $1,500.00
  Stripe Processing: (2.9% + $0.30) = $44.80
  Platform Fee: $2.00
  Tenant Pays Total: $1,546.80
  You (Landlord) Receive: $1,455.20 (after Stripe takes their cut)

Via Bank Account (ACH):
  Rent: $1,500.00
  Stripe Processing: 0.8% = $12.00
  Platform Fee: $0.00 (FREE)
  Tenant Pays Total: $1,512.00
  You (Landlord) Receive: $1,488.00 (after Stripe takes their cut)

SAVINGS WITH ACH: Tenant saves $34.80, you get $32.80 MORE!
`;
