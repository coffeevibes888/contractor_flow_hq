/**
 * Contractor Subscription Tiers Configuration
 *
 * PRICING MODEL (simplified — single tier, everything unlimited):
 * - Unlimited: $99/month (yearly: 20% discount)
 *
 * 14-day free trial, NO credit card required. Cancel anytime.
 *
 * We collapsed the 3-tier model (Starter $39 / Pro $99 / Enterprise $199)
 * into a single all-inclusive plan. Simpler pricing converts better and
 * eliminates upgrade friction. Every contractor gets the full platform.
 */

/** Yearly discount percentage */
const YEARLY_DISCOUNT_PERCENT = 20;

/** Calculate yearly price with 20% discount */
function calcYearlyPrice(monthlyPrice: number): number {
  const yearlyFull = monthlyPrice * 12;
  return Math.round(yearlyFull * (1 - YEARLY_DISCOUNT_PERCENT / 100) * 100) / 100;
}

/** Calculate equivalent monthly price when billed yearly */
function calcYearlyMonthlyEquivalent(monthlyPrice: number): number {
  return Math.round((calcYearlyPrice(monthlyPrice) / 12) * 100) / 100;
}

export const CONTRACTOR_TIERS = {
  /**
   * Legacy tier aliases — kept so existing database records with
   * tier='starter' or tier='pro' still resolve without errors.
   * All tiers now point to the same unlimited feature set.
   */
  starter: {
    name: 'Unlimited',
    price: 99,
    yearlyPrice: calcYearlyPrice(99),
    trialDays: 14,
    limits: {
      activeJobs: -1,
      invoicesPerMonth: -1,
      customers: -1,
      teamMembers: -1,
      inventoryItems: -1,
      equipmentItems: -1,
      activeLeads: -1,
      storageGB: 100,
      jobPhotos: -1,
      quoteTemplates: -1,
    },
    features: {
      // Core Features
      basicJobManagement: true,
      basicInvoicing: true,
      basicCustomers: true,
      mobileApp: true,
      emailSupport: true,
      workOrders: true,
      paymentProcessing: true,
      simpleCalendar: true,
      basicExpenseTracking: true,
      basicReports: true,

      // Business Tools
      advancedJobManagement: true,
      jobTemplates: true,
      customFields: true,
      advancedInvoicing: true,
      recurringInvoices: true,
      unlimitedInvoices: true,
      customerPortal: true,
      customerTags: true,
      communicationHistory: true,
      crm: true,
      leadManagement: true,
      inventory: true,
      equipment: true,
      marketing: true,
      referralProgram: true,
      reviewManagement: true,
      standardReports: true,
      advancedExpenseTracking: true,
      quickbooksIntegration: true,
      advancedReports: true,

      // Team & Collaboration
      teamManagement: true,
      teamChat: true,
      rolePermissions: true,
      scheduling: true,
      timeTracking: true,
      timesheets: true,
      phoneSupport: true,
      prioritySupport: true,

      // Enterprise Features (all unlocked)
      unlimitedJobs: true,
      unlimitedCustomers: true,
      unlimitedTeam: true,
      advancedTeamFeatures: true,
      advancedCrm: true,
      advancedLeadManagement: true,
      advancedInventory: true,
      advancedEquipment: true,
      advancedMarketing: true,
      advancedAnalytics: true,
      customDashboards: true,
      forecasting: true,
      apiAccess: true,
      webhooks: true,
      zapierIntegration: true,
      accountManager: true,
      whiteLabel: true,
      customBranding: true,
      payrollIntegration: true,
      multiLocationInventory: true,
      gpsTracking: true,
      routeOptimization: true,
      emailMarketing: true,
      smsMarketing: true,
      shiftManagement: true,
      performanceTracking: true,
      teamAnalytics: true,
      automatedWorkflows: true,
      customIntegrations: true,
      dedicatedSupport: true,
      onboardingAssistance: true,
      trainingSessions: true,
    },
    description: 'Everything unlimited — one simple plan for your entire business',
  },
  pro: {
    name: 'Unlimited',
    price: 99,
    yearlyPrice: calcYearlyPrice(99),
    trialDays: 14,
    limits: {
      activeJobs: -1,
      invoicesPerMonth: -1,
      customers: -1,
      teamMembers: -1,
      inventoryItems: -1,
      equipmentItems: -1,
      activeLeads: -1,
      storageGB: 100,
      jobPhotos: -1,
      quoteTemplates: -1,
    },
    features: {
      // Core Features
      basicJobManagement: true,
      basicInvoicing: true,
      basicCustomers: true,
      mobileApp: true,
      emailSupport: true,
      workOrders: true,
      paymentProcessing: true,
      simpleCalendar: true,
      basicExpenseTracking: true,
      basicReports: true,

      // Business Tools
      advancedJobManagement: true,
      jobTemplates: true,
      customFields: true,
      advancedInvoicing: true,
      recurringInvoices: true,
      unlimitedInvoices: true,
      customerPortal: true,
      customerTags: true,
      communicationHistory: true,
      crm: true,
      leadManagement: true,
      inventory: true,
      equipment: true,
      marketing: true,
      referralProgram: true,
      reviewManagement: true,
      standardReports: true,
      advancedExpenseTracking: true,
      quickbooksIntegration: true,
      advancedReports: true,

      // Team & Collaboration
      teamManagement: true,
      teamChat: true,
      rolePermissions: true,
      scheduling: true,
      timeTracking: true,
      timesheets: true,
      phoneSupport: true,
      prioritySupport: true,

      // Enterprise Features (all unlocked)
      unlimitedJobs: true,
      unlimitedCustomers: true,
      unlimitedTeam: true,
      advancedTeamFeatures: true,
      advancedCrm: true,
      advancedLeadManagement: true,
      advancedInventory: true,
      advancedEquipment: true,
      advancedMarketing: true,
      advancedAnalytics: true,
      customDashboards: true,
      forecasting: true,
      apiAccess: true,
      webhooks: true,
      zapierIntegration: true,
      accountManager: true,
      whiteLabel: true,
      customBranding: true,
      payrollIntegration: true,
      multiLocationInventory: true,
      gpsTracking: true,
      routeOptimization: true,
      emailMarketing: true,
      smsMarketing: true,
      shiftManagement: true,
      performanceTracking: true,
      teamAnalytics: true,
      automatedWorkflows: true,
      customIntegrations: true,
      dedicatedSupport: true,
      onboardingAssistance: true,
      trainingSessions: true,
    },
    description: 'Everything unlimited — one simple plan for your entire business',
  },
  enterprise: {
    name: 'Unlimited',
    price: 99,
    yearlyPrice: calcYearlyPrice(99),
    trialDays: 14,
    limits: {
      activeJobs: -1,
      invoicesPerMonth: -1,
      customers: -1,
      teamMembers: -1,
      inventoryItems: -1,
      equipmentItems: -1,
      activeLeads: -1,
      storageGB: 100,
      jobPhotos: -1,
      quoteTemplates: -1,
    },
    features: {
      // Core Features
      basicJobManagement: true,
      basicInvoicing: true,
      basicCustomers: true,
      mobileApp: true,
      emailSupport: true,
      workOrders: true,
      paymentProcessing: true,
      simpleCalendar: true,
      basicExpenseTracking: true,
      basicReports: true,

      // Business Tools
      advancedJobManagement: true,
      jobTemplates: true,
      customFields: true,
      advancedInvoicing: true,
      recurringInvoices: true,
      unlimitedInvoices: true,
      customerPortal: true,
      customerTags: true,
      communicationHistory: true,
      crm: true,
      leadManagement: true,
      inventory: true,
      equipment: true,
      marketing: true,
      referralProgram: true,
      reviewManagement: true,
      standardReports: true,
      advancedExpenseTracking: true,
      quickbooksIntegration: true,
      advancedReports: true,

      // Team & Collaboration
      teamManagement: true,
      teamChat: true,
      rolePermissions: true,
      scheduling: true,
      timeTracking: true,
      timesheets: true,
      phoneSupport: true,
      prioritySupport: true,

      // Enterprise Features (all unlocked)
      unlimitedJobs: true,
      unlimitedCustomers: true,
      unlimitedTeam: true,
      advancedTeamFeatures: true,
      advancedCrm: true,
      advancedLeadManagement: true,
      advancedInventory: true,
      advancedEquipment: true,
      advancedMarketing: true,
      advancedAnalytics: true,
      customDashboards: true,
      forecasting: true,
      apiAccess: true,
      webhooks: true,
      zapierIntegration: true,
      accountManager: true,
      whiteLabel: true,
      customBranding: true,
      payrollIntegration: true,
      multiLocationInventory: true,
      gpsTracking: true,
      routeOptimization: true,
      emailMarketing: true,
      smsMarketing: true,
      shiftManagement: true,
      performanceTracking: true,
      teamAnalytics: true,
      automatedWorkflows: true,
      customIntegrations: true,
      dedicatedSupport: true,
      onboardingAssistance: true,
      trainingSessions: true,
    },
    description: 'Everything unlimited — one simple plan for your entire business',
  },
} as const;

export type ContractorTier = keyof typeof CONTRACTOR_TIERS;
export type ContractorTierFeatures = typeof CONTRACTOR_TIERS[ContractorTier]['features'];
export type ContractorTierLimits = typeof CONTRACTOR_TIERS[ContractorTier]['limits'];

/**
 * Normalize legacy tier names to current tier names.
 * All tiers now resolve to 'pro' (the single $99 unlimited plan).
 */
export function normalizeContractorTier(tier: string | null | undefined): ContractorTier {
  if (!tier) return 'pro';
  
  const tierMap: Record<string, ContractorTier> = {
    'free': 'pro',
    'starter': 'pro',
    'basic': 'pro',
    'growth': 'pro',
    'professional': 'pro',
    'pro': 'pro',
    'enterprise': 'pro',
    'business': 'pro',
    'unlimited': 'pro',
  };
  
  return tierMap[tier.toLowerCase()] || 'pro';
}

/**
 * Get tier configuration
 */
export function getTierConfig(tier: ContractorTier) {
  return CONTRACTOR_TIERS[tier];
}

/**
 * Get the required tier for a specific feature.
 * Since all features are now unlocked on the single plan, always returns 'pro'.
 */
export function getRequiredTier(feature: keyof ContractorTierFeatures): ContractorTier | null {
  // All features are unlocked on the single plan
  return 'pro';
}

/**
 * Check if a tier has access to a specific feature.
 * All tiers now have access to everything.
 */
export function hasFeatureAccess(
  tier: ContractorTier,
  feature: keyof ContractorTierFeatures
): boolean {
  return true;
}

/**
 * Get the limit for a specific feature in a tier.
 * All limits are now unlimited (-1).
 */
export function getFeatureLimit(
  tier: ContractorTier,
  feature: keyof ContractorTierLimits
): number {
  return CONTRACTOR_TIERS[tier].limits[feature];
}

/**
 * Check if a limit is unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Check if current usage is within limit
 */
export function isWithinLimit(current: number, limit: number): boolean {
  if (limit === -1) return true; // unlimited
  return current < limit;
}

/**
 * Get remaining quota for a feature
 */
export function getRemainingQuota(current: number, limit: number): number {
  if (limit === -1) return Infinity; // unlimited
  return Math.max(0, limit - current);
}

/**
 * Check if approaching limit (80% threshold)
 */
export function isApproachingLimit(current: number, limit: number): boolean {
  if (limit === -1) return false; // unlimited
  return current >= limit * 0.8;
}

/**
 * Check if at limit
 */
export function isAtLimit(current: number, limit: number): boolean {
  if (limit === -1) return false; // unlimited
  return current >= limit;
}

/**
 * Get usage percentage
 */
export function getUsagePercentage(current: number, limit: number): number {
  if (limit === -1) return 0; // unlimited
  if (limit === 0) return 100; // not available
  return Math.min(100, Math.round((current / limit) * 100));
}

/**
 * Get the next tier for upgrade.
 * Since there's only one tier now, always returns null.
 */
export function getUpgradeTier(currentTier: ContractorTier): ContractorTier | null {
  return null; // Single plan, no upgrade needed
}

/**
 * Get the previous tier for downgrade.
 * Since there's only one tier now, always returns null.
 */
export function getDowngradeTier(currentTier: ContractorTier): ContractorTier | null {
  return null; // Single plan, no downgrade available
}

/**
 * Get trial period in days for a tier
 */
export function getTrialDays(tier: ContractorTier): number {
  return CONTRACTOR_TIERS[tier].trialDays;
}

/**
 * Get all features available in a tier
 */
export function getTierFeatures(tier: ContractorTier): string[] {
  const features = CONTRACTOR_TIERS[tier].features;
  return Object.entries(features)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);
}

/**
 * Get all limits for a tier
 */
export function getTierLimits(tier: ContractorTier): Record<string, number> {
  return { ...CONTRACTOR_TIERS[tier].limits };
}

/**
 * Compare two tiers.
 * All tiers are equivalent now — always returns 0.
 */
export function compareTiers(tier1: ContractorTier, tier2: ContractorTier): number {
  return 0;
}

/**
 * Check if tier1 is higher than tier2
 */
export function isHigherTier(tier1: ContractorTier, tier2: ContractorTier): boolean {
  return false;
}

/**
 * Check if tier1 is lower than tier2
 */
export function isLowerTier(tier1: ContractorTier, tier2: ContractorTier): boolean {
  return false;
}

/**
 * Get features that would be gained by upgrading.
 * Single plan — no features to gain.
 */
export function getUpgradeFeatures(
  currentTier: ContractorTier,
  targetTier: ContractorTier
): string[] {
  return [];
}

/**
 * Get features that would be lost by downgrading.
 * Single plan — no features to lose.
 */
export function getDowngradeFeatures(
  currentTier: ContractorTier,
  targetTier: ContractorTier
): string[] {
  return [];
}


/**
 * Check if a tier string is a valid tier key.
 * With the single-plan model, all recognized tier names are valid.
 */
export function isValidTier(tier: string): tier is ContractorTier {
  return ['starter', 'pro', 'enterprise'].includes(tier);
}

/**
 * Get the monthly price for a tier.
 * All tiers are now $99/month.
 */
export function getMonthlyPrice(tier: ContractorTier): number {
  return CONTRACTOR_TIERS[tier].price;
}

/**
 * Get the price difference between two tiers.
 * Since all tiers are the same price ($99), always returns 0.
 */
export function getPriceDifference(fromTier: ContractorTier, toTier: ContractorTier): number {
  return getMonthlyPrice(toTier) - getMonthlyPrice(fromTier);
}
