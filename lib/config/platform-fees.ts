/**
 * Platform Fee Configuration
 * 
 * SUBSCRIPTION-BASED MODEL
 * - Landlords pay monthly subscription ($39 / $99 / $199)
 * - NO platform fees on rent payments (direct to landlord)
 * - Contractor marketplace: $1 fee from payer + $1 fee from contractor = $2 total
 */

export const PLATFORM_FEES = {
  /**
   * Rent Payment Fees - NONE (subscription covers this)
   * Tenants pay exact rent, landlords receive full amount minus Stripe fees
   */
  RENT_PLATFORM_FEE: 0,

  /**
   * Contractor Marketplace Fees
   * $1 from payer (landlord/homeowner) + $1 from contractor
   */
  CONTRACTOR_PAYER_FEE: 1.00,      // $1 flat fee from person paying
  CONTRACTOR_RECEIVER_FEE: 1.00,   // $1 flat fee from contractor receiving

  /**
   * Convenience fees - DISABLED (subscription model)
   */
  CONVENIENCE_FEE_CARD: 0,
  CONVENIENCE_FEE_ACH: 0,
} as const;

/**
 * Calculate rent payment - NO PLATFORM FEES
 * Payment goes directly to landlord's Connect account
 */
export function calculateRentPaymentAmount(
  rentAmount: number, 
  _paymentMethodType: 'ach' | 'card' | 'instant' = 'card'
): {
  rentAmount: number;
  platformFee: number;
  totalAmount: number;
  feeDescription: string;
} {
  return {
    rentAmount,
    platformFee: 0,
    totalAmount: rentAmount,
    feeDescription: 'No platform fees - included in subscription',
  };
}

/**
 * Calculate contractor payment fees
 * Payer pays: job amount + $1 platform fee
 * Contractor receives: job amount - $1 platform fee
 */
export function calculateContractorPaymentFees(jobAmount: number): {
  jobAmount: number;
  payerFee: number;
  payerTotal: number;
  contractorFee: number;
  contractorReceives: number;
  platformTotal: number;
} {
  const payerFee = PLATFORM_FEES.CONTRACTOR_PAYER_FEE;
  const contractorFee = PLATFORM_FEES.CONTRACTOR_RECEIVER_FEE;
  
  return {
    jobAmount,
    payerFee,
    payerTotal: jobAmount + payerFee,
    contractorFee,
    contractorReceives: jobAmount - contractorFee,
    platformTotal: payerFee + contractorFee,
  };
}

/**
 * Get convenience fee in cents - ALWAYS 0 for rent
 */
export function getConvenienceFeeInCents(_paymentMethodType: 'ach' | 'card' | 'instant' = 'card'): number {
  return 0;
}

/**
 * Get platform fee in cents - ALWAYS 0 for rent
 */
export function getPlatformFeeInCents(): number {
  return 0;
}

/**
 * Revenue Projection Calculator - SUBSCRIPTION + MARKETPLACE MODEL
 */
export function estimateMonthlyRevenue(params: {
  starterSubscribers: number;
  proSubscribers: number;
  enterpriseSubscribers: number;
  contractorTransactions: number;
}): {
  subscriptionRevenue: number;
  marketplaceRevenue: number;
  totalMonthlyRevenue: number;
} {
  const subscriptionRevenue = 
    (params.starterSubscribers * 39) +
    (params.proSubscribers * 99) +
    (params.enterpriseSubscribers * 199);
  
  // $2 per contractor transaction ($1 from each side)
  const marketplaceRevenue = params.contractorTransactions * 2;
  
  return {
    subscriptionRevenue,
    marketplaceRevenue,
    totalMonthlyRevenue: subscriptionRevenue + marketplaceRevenue,
  };
}
