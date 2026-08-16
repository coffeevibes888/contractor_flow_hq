/**
 * Payout Fee Configuration
 * 
 * SUBSCRIPTION MODEL - No platform fees on payouts
 * Landlords only pay Stripe's fees (1.5% instant, $0 standard ACH)
 */

export const PAYOUT_FEES = {
  INSTANT: {
    percentage: 1.5,  // Stripe's fee only
    minimum: 0.50,    // Stripe's minimum
    platformFee: 0,   // No platform markup
  },
  SAME_DAY: {
    flat: 0,          // Free same-day (Stripe doesn't charge extra)
    platformFee: 0,
  },
  STANDARD: {
    flat: 0,
    platformFee: 0,
  },
} as const;

export type PayoutType = 'instant' | 'same_day' | 'standard';

/**
 * Calculate payout fee based on type and amount
 */
export function calculatePayoutFee(amount: number, payoutType: PayoutType): number {
  switch (payoutType) {
    case 'instant':
      return Math.max(
        amount * (PAYOUT_FEES.INSTANT.percentage / 100),
        PAYOUT_FEES.INSTANT.minimum
      ) + PAYOUT_FEES.INSTANT.platformFee;
    case 'same_day':
      return PAYOUT_FEES.SAME_DAY.flat + PAYOUT_FEES.SAME_DAY.platformFee;
    case 'standard':
    default:
      return PAYOUT_FEES.STANDARD.flat + PAYOUT_FEES.STANDARD.platformFee;
  }
}

/**
 * Get estimated arrival time based on payout type
 */
export function getEstimatedArrival(payoutType: PayoutType): string {
  const now = new Date();
  
  switch (payoutType) {
    case 'instant':
      return 'Within 30 minutes';
    case 'same_day':
      // Same day if before 5pm ET, otherwise next business day
      const etHour = now.getUTCHours() - 5; // Rough ET conversion
      if (etHour < 17) {
        return 'Today by end of day';
      }
      return 'Next business day';
    case 'standard':
    default:
      return '1-2 business days';
  }
}
