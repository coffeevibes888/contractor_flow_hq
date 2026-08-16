/**
 * Subscription Tiers Configuration
 *
 * PRICING MODEL (updated to match contractor-side pricing):
 * - Starter:    $39/month  (yearly: 20% discount)
 * - Pro:        $99/month  (yearly: 20% discount)
 * - Enterprise: $199/month (yearly: 20% discount)
 *
 * 14-day free trial on every plan. Card is collected at checkout but the
 * first charge happens on day 15. Cancel anytime — full refund window
 * during trial. No transaction fees — subscription-only revenue model.
 *
 * Previous pricing ($19.99 / $39.99 / $79.99) is preserved as legacy Stripe
 * price IDs so existing customers stay grandfathered. New signups go to the
 * updated price IDs configured in `lib/stripe-config.ts`.
 */

import { stripeConfig } from '../stripe-config';

export type BillingInterval = 'monthly' | 'yearly';

/** Yearly discount percentage */
export const YEARLY_DISCOUNT_PERCENT = 20;

/** Calculate yearly price with 20% discount (price per year) */
export function getYearlyPrice(monthlyPrice: number): number {
  const yearlyFull = monthlyPrice * 12;
  const discounted = yearlyFull * (1 - YEARLY_DISCOUNT_PERCENT / 100);
  return Math.round(discounted * 100) / 100; // round to 2 decimals
}

/** Calculate equivalent monthly price when billed yearly */
export function getYearlyMonthlyEquivalent(monthlyPrice: number): number {
  return Math.round((getYearlyPrice(monthlyPrice) / 12) * 100) / 100;
}

export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 39,
    yearlyPrice: getYearlyPrice(39),
    priceId: stripeConfig.prices.starter,
    yearlyPriceId: stripeConfig.prices.starterYearly,
    unitLimit: 24,
    trialDays: 0,
    features: {
      automaticRentReminders: false,
      automaticLateFees: false,
      employmentChecksPerMonth: 0,
      teamManagement: false,
      teamCommunications: false,
      freeBackgroundChecks: false,
      freeEvictionChecks: false,
      freeEmploymentVerification: false,
      customBranding: false,
      apiAccess: false,
      webhooks: false,
      advancedAnalytics: false,
      advancedAccounting: false, // GL / reports / tenant ledger / owner statements (kept for backward compat)
      // Granular accounting feature flags
      basicAnalytics: true,            // Starter: occupancy, rent collected, expense summary charts
      accountingRentRoll: true,        // Starter+: per-unit rent & tenant balance snapshot
      accountingReports: false,        // Pro+: P&L, Balance Sheet, Trial Balance, AR Aging, Cash Flow
      accountingLedger: false,         // Pro+: Tenant Ledger, Owner Statements, Bank Reconciliation
      accountingManagement: false,     // Enterprise only: Journal, COA editor, AP, Budget, Depreciation, Tax, Audit
      quickbooksIntegration: false,
      turbotaxIntegration: false,
      contractorManagement: true,
      idPaystubScanner: true, // Available on all plans
      prioritySupport: false,
      // Enterprise-only features
      shiftScheduling: false,
      timeTracking: false,
      teamPayroll: false,
      performanceReports: false,
      unlimitedTeamMembers: false,
    },
    description: 'Perfect for small landlords with up to 24 units',
  },
  pro: {
    name: 'Pro',
    price: 99,
    yearlyPrice: getYearlyPrice(99),
    priceId: stripeConfig.prices.pro,
    yearlyPriceId: stripeConfig.prices.proYearly,
    unitLimit: 150,
    trialDays: 0,
    features: {
      automaticRentReminders: true,
      automaticLateFees: true,
      employmentChecksPerMonth: Infinity,
      teamManagement: true,
      teamCommunications: true,
      freeBackgroundChecks: true,
      freeEvictionChecks: true,
      freeEmploymentVerification: true,
      customBranding: false,
      apiAccess: false,
      webhooks: false,
      advancedAnalytics: true,
      advancedAccounting: true, // Real GL · Trial Balance · P&L · Tenant Ledger · Owner Statements (kept for backward compat)
      // Granular accounting feature flags
      basicAnalytics: true,            // Pro: full analytics
      accountingRentRoll: true,        // Pro: rent roll included
      accountingReports: true,         // Pro: P&L, Balance Sheet, Trial Balance, AR Aging, Cash Flow
      accountingLedger: true,          // Pro: Tenant Ledger, Owner Statements, Bank Reconciliation
      accountingManagement: false,     // Enterprise only: Journal, COA editor, AP, Budget, Depreciation, Tax, Audit
      quickbooksIntegration: true,
      turbotaxIntegration: true,
      contractorManagement: true,
      idPaystubScanner: true, // Available on all plans
      prioritySupport: true,
      // Enterprise-only features (Pro gets BASIC payroll separately, see assertPayrollAccess)
      shiftScheduling: false,
      timeTracking: false,
      teamPayroll: true, // Pro gets basic payroll (5 team-member cap) — see lib/services/payroll-access.ts
      performanceReports: false,
      unlimitedTeamMembers: false,
    },
    description: 'Everything you need for growing portfolios up to 150 units',
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    yearlyPrice: getYearlyPrice(199),
    priceId: stripeConfig.prices.enterprise,
    yearlyPriceId: stripeConfig.prices.enterpriseYearly,
    unitLimit: Infinity,
    trialDays: 0,
    features: {
      automaticRentReminders: true,
      automaticLateFees: true,
      employmentChecksPerMonth: Infinity,
      teamManagement: true,
      teamCommunications: true,
      freeBackgroundChecks: true,
      freeEvictionChecks: true,
      freeEmploymentVerification: true,
      customBranding: true,
      apiAccess: true,
      webhooks: true,
      advancedAnalytics: true,
      advancedAccounting: true, // Pro accounting + custom chart of accounts + multi-owner distributions (kept for backward compat)
      // Granular accounting feature flags
      basicAnalytics: true,            // Enterprise: full analytics
      accountingRentRoll: true,        // Enterprise: rent roll included
      accountingReports: true,         // Enterprise: all reports
      accountingLedger: true,          // Enterprise: ledger + owner statements
      accountingManagement: true,      // Enterprise: Journal, COA editor, AP, Budget, Depreciation, Tax, Audit
      quickbooksIntegration: true,
      turbotaxIntegration: true,
      contractorManagement: true,
      idPaystubScanner: true, // Available on all plans
      prioritySupport: true,
      // Enterprise-only Team Operations features
      shiftScheduling: true,
      timeTracking: true,
      teamPayroll: true, // Full payroll: pay schedules + overtime calc + CSV export
      performanceReports: true,
      unlimitedTeamMembers: true,
    },
    description: 'Unlimited units with full business operations suite',
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type TierFeatures = typeof SUBSCRIPTION_TIERS[SubscriptionTier]['features'];

/**
 * Normalize legacy tier names to current tier names
 */
export function normalizeTier(tier: string | null | undefined): SubscriptionTier {
  if (!tier) return 'starter';
  
  // Map legacy tiers to new structure
  const tierMap: Record<string, SubscriptionTier> = {
    'free': 'starter',        // Legacy: map to starter
    'starter': 'starter',
    'growth': 'pro',          // Legacy: map to pro
    'professional': 'pro',    // Legacy: map to pro
    'pro': 'pro',
    'enterprise': 'enterprise',
  };
  
  return tierMap[tier.toLowerCase()] || 'starter';
}

export function getTierForUnitCount(unitCount: number): SubscriptionTier {
  if (unitCount <= 24) return 'starter';
  if (unitCount <= 150) return 'pro';
  return 'enterprise';
}

export function getRequiredTierForUnitCount(unitCount: number): SubscriptionTier {
  if (unitCount <= 24) return 'starter';
  if (unitCount <= 150) return 'pro';
  return 'enterprise';
}

export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: keyof TierFeatures
): boolean {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const featureValue = tierConfig.features[feature];
  if (typeof featureValue === 'boolean') return featureValue;
  if (typeof featureValue === 'number') return featureValue > 0;
  return false;
}

export function getFeatureLimit(
  tier: SubscriptionTier,
  feature: keyof TierFeatures
): number {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const featureValue = tierConfig.features[feature];
  if (typeof featureValue === 'number') return featureValue;
  return featureValue ? Infinity : 0;
}

export function canAddUnit(currentUnitCount: number, currentTier: SubscriptionTier): boolean {
  const tierConfig = SUBSCRIPTION_TIERS[currentTier];
  return currentUnitCount < tierConfig.unitLimit;
}

export function getUnitLimitWarningThreshold(tier: SubscriptionTier): number {
  const limit = SUBSCRIPTION_TIERS[tier].unitLimit;
  if (limit === Infinity) return Infinity;
  return Math.floor(limit * 0.8);
}

export function isNearUnitLimit(currentUnitCount: number, tier: SubscriptionTier): boolean {
  const threshold = getUnitLimitWarningThreshold(tier);
  return currentUnitCount >= threshold;
}

export function isAtUnitLimit(currentUnitCount: number, tier: SubscriptionTier): boolean {
  return currentUnitCount >= SUBSCRIPTION_TIERS[tier].unitLimit;
}

export function getUpgradeTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  switch (currentTier) {
    case 'starter':
      return 'pro';
    case 'pro':
      return 'enterprise';
    case 'enterprise':
      return null;
  }
}

/**
 * Get trial period in days for a tier
 */
export function getTrialDays(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIERS[tier].trialDays;
}

/**
 * @deprecated No longer used - subscription model has no transaction fees
 */
export function hasNoCashoutFees(tier: SubscriptionTier): boolean {
  return true; // All tiers have no platform fees now
}

/**
 * Get the Stripe price ID for a tier based on billing interval
 */
export function getPriceIdForInterval(
  tier: SubscriptionTier,
  interval: BillingInterval
): string | undefined {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  return interval === 'yearly' ? tierConfig.yearlyPriceId : tierConfig.priceId;
}

/**
 * Get the display price for a tier based on billing interval
 * Returns the monthly-equivalent price (for yearly, this is the discounted per-month amount)
 */
export function getDisplayPrice(
  tier: SubscriptionTier,
  interval: BillingInterval
): number {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (interval === 'yearly') {
    return getYearlyMonthlyEquivalent(tierConfig.price);
  }
  return tierConfig.price;
}

/**
 * Get the total billed amount for a tier based on billing interval
 */
export function getTotalBilledAmount(
  tier: SubscriptionTier,
  interval: BillingInterval
): number {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (interval === 'yearly') {
    return tierConfig.yearlyPrice;
  }
  return tierConfig.price;
}

/**
 * Get the yearly savings amount for a tier
 */
export function getYearlySavings(tier: SubscriptionTier): number {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const fullYearlyPrice = tierConfig.price * 12;
  return Math.round((fullYearlyPrice - tierConfig.yearlyPrice) * 100) / 100;
}
