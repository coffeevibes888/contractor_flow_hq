/**
 * Contractor Subscription Tiers Configuration
 *
 * PRICING MODEL (updated to compete with Jobber/Housecall Pro):
 * - Starter:    $39/month  (yearly: 20% discount)
 * - Pro:        $99/month  (yearly: 20% discount)
 * - Enterprise: $199/month (yearly: 20% discount)
 *
 * 14-day free trial on every plan. Card is collected at checkout but
 * the first charge happens on day 15. Cancel anytime.
 *
 * Previous pricing ($19.99 / $39.99 / $79.99) signaled "hobbyist tool" to
 * professional contractors and didn't reflect the actual value of the
 * full-stack lead pipeline + automation + marketplace + CRM bundle.
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
  starter: {
    name: 'Starter',
    price: 39,
    yearlyPrice: calcYearlyPrice(39),
    trialDays: 0,
    limits: {
      activeJobs: 15,
      invoicesPerMonth: 20,
      customers: 50,
      teamMembers: 0,
      inventoryItems: 200,
      equipmentItems: 20,
      activeLeads: 0,
      storageGB: 1,
      jobPhotos: 5, // per job
      quoteTemplates: 3,
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

      // Business Tools (unlocked for Starter — mirrors PM side philosophy)
      advancedJobManagement: true,
      jobTemplates: false,
      customFields: false,
      advancedInvoicing: true,
      recurringInvoices: true,
      unlimitedInvoices: false,
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
      advancedReports: false,
      quickbooksIntegration: false,

      // Team & Collaboration (Pro only)
      teamManagement: false,
      teamChat: false,
      rolePermissions: false,
      scheduling: false,
      timeTracking: false,
      timesheets: false,

      // Advanced & Scale (Enterprise only)
      advancedAnalytics: false,
      customDashboards: false,
      forecasting: false,
      apiAccess: false,
      webhooks: false,
      zapierIntegration: false,
      phoneSupport: false,
      prioritySupport: false,
      accountManager: false,
      whiteLabel: false,
      customBranding: false,
      payrollIntegration: false,
    },
    description: 'Everything a solo contractor needs — jobs, invoicing, CRM, inventory & equipment',
  },
  pro: {
    name: 'Pro',
    price: 99,
    yearlyPrice: calcYearlyPrice(99),
    trialDays: 0,
    limits: {
      activeJobs: 50,
      invoicesPerMonth: -1, // unlimited
      customers: 500,
      teamMembers: 6,
      inventoryItems: 200,
      equipmentItems: 20,
      activeLeads: 100,
      storageGB: 10,
      jobPhotos: 20, // per job
      quoteTemplates: -1, // unlimited
    },
    features: {
      // Core Features (from Starter)
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

      // Business Tools (from Starter)
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

      // Team & Collaboration (Pro tier — mirrors PM side: chat, team members, scheduling)
      teamManagement: true,
      teamChat: true,
      rolePermissions: true,
      scheduling: true,
      timeTracking: true,
      timesheets: true,
      phoneSupport: true,
      prioritySupport: true,

      // Locked Features (Enterprise only)
      unlimitedJobs: false,
      unlimitedCustomers: false,
      unlimitedTeam: false,
      advancedTeamFeatures: false,
      advancedCrm: false,
      advancedLeadManagement: false,
      advancedInventory: false,
      advancedEquipment: false,
      advancedMarketing: false,
      advancedAnalytics: false,
      customDashboards: false,
      forecasting: false,
      apiAccess: false,
      webhooks: false,
      zapierIntegration: false,
      accountManager: false,
      whiteLabel: false,
      customBranding: false,
      payrollIntegration: false,
      multiLocationInventory: false,
      gpsTracking: false,
      routeOptimization: false,
      emailMarketing: false,
      smsMarketing: false,
    },
    description: 'Everything in Starter plus team management, scheduling & priority support',
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    yearlyPrice: calcYearlyPrice(199),
    trialDays: 0,
    limits: {
      activeJobs: -1, // unlimited
      invoicesPerMonth: -1, // unlimited
      customers: -1, // unlimited
      teamMembers: -1, // unlimited
      inventoryItems: -1, // unlimited
      equipmentItems: -1, // unlimited
      activeLeads: -1, // unlimited
      storageGB: 100,
      jobPhotos: -1, // unlimited per job
      quoteTemplates: -1, // unlimited
    },
    features: {
      // All Core Features
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
      
      // All Pro Features
      advancedJobManagement: true,
      jobTemplates: true,
      customFields: true,
      advancedInvoicing: true,
      recurringInvoices: true,
      unlimitedInvoices: true,
      customerPortal: true,
      customerTags: true,
      communicationHistory: true,
      teamManagement: true,
      teamChat: true,
      rolePermissions: true,
      scheduling: true,
      timeTracking: true,
      timesheets: true,
      crm: true,
      leadManagement: true,
      inventory: true,
      equipment: true,
      marketing: true,
      referralProgram: true,
      reviewManagement: true,
      standardReports: true,
      advancedExpenseTracking: true,
      phoneSupport: true,
      prioritySupport: true,
      quickbooksIntegration: true,
      
      // Enterprise Features
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
    description: 'Unlimited everything with full business operations suite',
  },
} as const;

export type ContractorTier = keyof typeof CONTRACTOR_TIERS;
export type ContractorTierFeatures = typeof CONTRACTOR_TIERS[ContractorTier]['features'];
export type ContractorTierLimits = typeof CONTRACTOR_TIERS[ContractorTier]['limits'];

/**
 * Normalize legacy tier names to current tier names
 */
export function normalizeContractorTier(tier: string | null | undefined): ContractorTier {
  if (!tier) return 'starter';
  
  const tierMap: Record<string, ContractorTier> = {
    'free': 'starter',
    'starter': 'starter',
    'basic': 'starter',
    'growth': 'pro',
    'professional': 'pro',
    'pro': 'pro',
    'enterprise': 'enterprise',
    'business': 'enterprise',
  };
  
  return tierMap[tier.toLowerCase()] || 'starter';
}

/**
 * Get tier configuration
 */
export function getTierConfig(tier: ContractorTier) {
  return CONTRACTOR_TIERS[tier];
}

/**
 * Get the required tier for a specific feature
 */
export function getRequiredTier(feature: keyof ContractorTierFeatures): ContractorTier | null {
  // Check each tier from lowest to highest
  const tiers: ContractorTier[] = ['starter', 'pro', 'enterprise'];
  
  for (const tier of tiers) {
    if (CONTRACTOR_TIERS[tier].features[feature]) {
      return tier;
    }
  }
  
  return null; // Feature not available in any tier
}

/**
 * Check if a tier has access to a specific feature
 */
export function hasFeatureAccess(
  tier: ContractorTier,
  feature: keyof ContractorTierFeatures
): boolean {
  return CONTRACTOR_TIERS[tier].features[feature];
}

/**
 * Get the limit for a specific feature in a tier
 * Returns -1 for unlimited, 0 for not available
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
 * Get the next tier for upgrade
 */
export function getUpgradeTier(currentTier: ContractorTier): ContractorTier | null {
  switch (currentTier) {
    case 'starter':
      return 'pro';
    case 'pro':
      return 'enterprise';
    case 'enterprise':
      return null; // Already at highest tier
  }
}

/**
 * Get the previous tier for downgrade
 */
export function getDowngradeTier(currentTier: ContractorTier): ContractorTier | null {
  switch (currentTier) {
    case 'enterprise':
      return 'pro';
    case 'pro':
      return 'starter';
    case 'starter':
      return null; // Already at lowest tier
  }
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
 * Compare two tiers
 * Returns: -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2
 */
export function compareTiers(tier1: ContractorTier, tier2: ContractorTier): number {
  const tierOrder: Record<ContractorTier, number> = {
    starter: 1,
    pro: 2,
    enterprise: 3,
  };
  
  return Math.sign(tierOrder[tier1] - tierOrder[tier2]);
}

/**
 * Check if tier1 is higher than tier2
 */
export function isHigherTier(tier1: ContractorTier, tier2: ContractorTier): boolean {
  return compareTiers(tier1, tier2) > 0;
}

/**
 * Check if tier1 is lower than tier2
 */
export function isLowerTier(tier1: ContractorTier, tier2: ContractorTier): boolean {
  return compareTiers(tier1, tier2) < 0;
}

/**
 * Get features that would be gained by upgrading
 */
export function getUpgradeFeatures(
  currentTier: ContractorTier,
  targetTier: ContractorTier
): string[] {
  const currentFeatures = new Set(getTierFeatures(currentTier));
  const targetFeatures = getTierFeatures(targetTier);
  
  return targetFeatures.filter(feature => !currentFeatures.has(feature));
}

/**
 * Get features that would be lost by downgrading
 */
export function getDowngradeFeatures(
  currentTier: ContractorTier,
  targetTier: ContractorTier
): string[] {
  const currentFeatures = getTierFeatures(currentTier);
  const targetFeatures = new Set(getTierFeatures(targetTier));
  
  return currentFeatures.filter(feature => !targetFeatures.has(feature));
}

/**
 * Format limit for display
 */
export function formatLimit(limit: number): string {
  if (limit === -1) return 'Unlimited';
  if (limit === 0) return 'Not available';
  return limit.toString();
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Get monthly price for a tier
 */
export function getMonthlyPrice(tier: ContractorTier): number {
  return CONTRACTOR_TIERS[tier].price;
}

/**
 * Get yearly price for a tier (20% discount applied)
 */
export function getYearlyPriceForTier(tier: ContractorTier): number {
  return CONTRACTOR_TIERS[tier].yearlyPrice;
}

/**
 * Get the equivalent monthly price when billed yearly
 */
export function getContractorYearlyMonthlyEquivalent(tier: ContractorTier): number {
  return calcYearlyMonthlyEquivalent(CONTRACTOR_TIERS[tier].price);
}

/**
 * Calculate price difference between tiers
 */
export function getPriceDifference(
  currentTier: ContractorTier,
  targetTier: ContractorTier
): number {
  return getMonthlyPrice(targetTier) - getMonthlyPrice(currentTier);
}

/**
 * Get all tier names
 */
export function getAllTiers(): ContractorTier[] {
  return ['starter', 'pro', 'enterprise'];
}

/**
 * Validate if a string is a valid tier
 */
export function isValidTier(tier: string): tier is ContractorTier {
  return tier === 'starter' || tier === 'pro' || tier === 'enterprise';
}
