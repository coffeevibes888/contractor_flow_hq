/**
 * Stripe Integration Constants and Configuration
 * 
 * DIRECT PAYMENT MODEL - Subscription Based
 * - No per-transaction platform fees
 * - Money flows directly from tenant to landlord's Connect account
 * - Stripe handles automatic payouts to landlord's bank
 */

// ============= PAYMENT METHOD TYPES =============
export const PAYMENT_METHOD_TYPES = {
  CARD: 'card',
  ACH: 'us_bank_account',
  LINK: 'link',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
} as const;

// ============= TENANT PAYMENT METHODS =============
export const TENANT_PAYMENT_METHODS = {
  CARD: {
    name: 'Debit or Credit Card',
    type: 'card',
    icon: 'credit-card',
    fee: 0, // No fee to tenant
    feeFixed: 0,
    timeline: 'Instant',
    description: 'Visa, Mastercard, American Express, Discover',
    processingTime: '2 business days to landlord',
    supported: true,
  },
  ACH: {
    name: 'Bank Account (ACH)',
    type: 'us_bank_account',
    icon: 'bank',
    fee: 0,
    feeFixed: 0,
    timeline: '3-5 business days',
    description: 'Direct from your checking or savings account',
    processingTime: '4-5 business days to landlord',
    supported: true,
  },
  LINK: {
    name: 'Stripe Link',
    type: 'link',
    icon: 'link',
    fee: 0,
    feeFixed: 0,
    timeline: 'Instant',
    description: 'Save your payment details for faster checkout',
    processingTime: '2 business days to landlord',
    supported: true,
  },
} as const;

// ============= DIRECT PAYMENT CONFIG =============
/**
 * Money flows directly to landlord's Stripe Connect account.
 * Stripe handles automatic payouts based on their payout schedule.
 */
export const DIRECT_PAYMENT_CONFIG = {
  DEFAULT_PAYOUT_SCHEDULE: {
    interval: 'daily',
    delay_days: 2,
  },
  NEW_ACCOUNT_DELAY_DAYS: 7,
} as const;

// ============= PLATFORM FEES =============
/**
 * SUBSCRIPTION MODEL - No per-transaction fees
 */
export const PLATFORM_FEES = {
  RENT_CARD: 0,
  RENT_ACH: 0,
  DEFAULT: 0,
} as const;

// ============= STRIPE PROCESSING FEES =============
/**
 * Stripe's fees (for reference - paid by platform)
 */
export const STRIPE_PROCESSING_FEES = {
  CARD: 0.029,
  CARD_FIXED: 0.30,
  ACH: 0.008,
  ACH_MIN: 0.01,
  ACH_MAX: 5.0,
} as const;

// ============= STRIPE LIMITS =============
export const STRIPE_LIMITS = {
  ACH_MIN: 0.01,
  MICRODEPOSIT_WAIT_HOURS: 24,
} as const;

// ============= PAYMENT INTENT CONFIG =============
export const PAYMENT_INTENT_CONFIG = {
  CURRENCY: 'usd',
  AUTOMATIC_PAYMENT_METHODS: true,
  ALLOW_REDIRECTS: 'never',
} as const;

// ============= HELPER FUNCTIONS =============

/**
 * Returns 0 - no platform fees in subscription model
 */
export function getConvenienceFeeInCents(_paymentMethodType: string): number {
  return 0;
}

/**
 * Returns same amount - no fees added
 */
export function calculateTotalWithFee(rentAmountInCents: number, _paymentMethodType: string): number {
  return rentAmountInCents;
}

/**
 * Get tenant-facing payment method info
 */
export function getTenantPaymentMethodInfo(methodType: string) {
  return TENANT_PAYMENT_METHODS[methodType as keyof typeof TENANT_PAYMENT_METHODS] || null;
}

/**
 * Get estimated arrival date for a payment
 */
export function getEstimatedArrivalDate(paymentMethod: 'card' | 'us_bank_account' | string): Date {
  const now = new Date();
  let businessDays = 2; // Card payments
  
  if (paymentMethod === 'us_bank_account') {
    businessDays = 5; // ACH takes longer
  }
  
  let daysAdded = 0;
  const result = new Date(now);
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * Format estimated arrival for display
 */
export function formatEstimatedArrival(paymentMethod: 'card' | 'us_bank_account' | string): string {
  const arrivalDate = getEstimatedArrivalDate(paymentMethod);
  return arrivalDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get fee breakdown (no platform fees)
 */
export function getFeeBreakdown(rentAmountInCents: number, paymentMethodType: string) {
  const rentAmount = rentAmountInCents / 100;

  return {
    rentAmount: rentAmount.toFixed(2),
    platformFee: '0.00',
    stripeFee: '0.00',
    totalFees: '0.00',
    landlordReceives: rentAmount.toFixed(2),
    estimatedArrival: formatEstimatedArrival(paymentMethodType),
  };
}

/**
 * Get payment method display name
 */
export function getPaymentMethodDisplayName(type: string): string {
  const method = TENANT_PAYMENT_METHODS[type as keyof typeof TENANT_PAYMENT_METHODS];
  return method?.name || type;
}
