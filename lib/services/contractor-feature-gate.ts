/**
 * Contractor Feature Gate Service
 * 
 * Provides feature gating and limit checking for contractor subscription tiers.
 * Includes caching layer for performance optimization.
 */

import { prisma } from '@/db/prisma';
import {
  type ContractorTier,
  type ContractorTierFeatures,
  type ContractorTierLimits,
  CONTRACTOR_TIERS,
  normalizeContractorTier,
  hasFeatureAccess,
  getFeatureLimit as getConfigFeatureLimit,
  isWithinLimit,
  getRemainingQuota,
  isApproachingLimit,
  isAtLimit,
  getUsagePercentage,
} from '@/lib/config/contractor-subscription-tiers';
import { logLimitViolation } from '@/lib/monitoring/subscription-monitor';

// ============= Types =============

export interface FeatureAccessResult {
  allowed: boolean;
  tier: ContractorTier;
  feature: string;
  reason?: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isApproaching: boolean;
  isAtLimit: boolean;
}

export interface UsageData {
  activeJobsCount: number;
  invoicesThisMonth: number;
  totalCustomers: number;
  teamMembersCount: number;
  inventoryCount: number;
  equipmentCount: number;
  activeLeadsCount: number;
}

// ============= Cache Layer =============

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SubscriptionCache {
  private cache: Map<string, CacheEntry<ContractorTier>>;
  private ttl: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(contractorId: string): ContractorTier | null {
    const entry = this.cache.get(contractorId);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(contractorId);
      return null;
    }

    return entry.data;
  }

  set(contractorId: string, tier: ContractorTier): void {
    this.cache.set(contractorId, {
      data: tier,
      timestamp: Date.now(),
    });
  }

  invalidate(contractorId: string): void {
    this.cache.delete(contractorId);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const subscriptionCache = new SubscriptionCache(5); // 5 minute TTL

// ============= Core Functions =============

/**
 * Get contractor's subscription tier with caching
 */
async function getContractorTier(contractorId: string): Promise<ContractorTier> {
  // Check cache first
  const cached = subscriptionCache.get(contractorId);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    select: { subscriptionTier: true },
  });

  if (!contractor) {
    throw new Error(`Contractor not found: ${contractorId}`);
  }

  const tier = normalizeContractorTier(contractor.subscriptionTier);
  
  // Cache the result
  subscriptionCache.set(contractorId, tier);

  return tier;
}

/**
 * Get current usage data for a contractor
 */
async function getUsageData(contractorId: string): Promise<UsageData> {
  const usage = await prisma.contractorUsageTracking.findUnique({
    where: { contractorId },
    select: {
      activeJobsCount: true,
      invoicesThisMonth: true,
      totalCustomers: true,
      teamMembersCount: true,
      inventoryCount: true,
      equipmentCount: true,
      activeLeadsCount: true,
    },
  });

  if (!usage) {
    // Return default values if no usage record exists
    return {
      activeJobsCount: 0,
      invoicesThisMonth: 0,
      totalCustomers: 0,
      teamMembersCount: 0,
      inventoryCount: 0,
      equipmentCount: 0,
      activeLeadsCount: 0,
    };
  }

  return usage;
}

/**
 * Check if a contractor can access a specific feature
 * 
 * @param contractorId - The contractor's ID
 * @param feature - The feature to check (e.g., 'teamManagement', 'crm')
 * @returns FeatureAccessResult with allowed status and reason if denied
 */
export async function canAccessFeature(
  contractorId: string,
  feature: keyof ContractorTierFeatures
): Promise<FeatureAccessResult> {
  try {
    const tier = await getContractorTier(contractorId);
    const allowed = hasFeatureAccess(tier, feature);

    if (!allowed) {
      // Find which tier is required
      const tiers: ContractorTier[] = ['starter', 'pro', 'enterprise'];
      let requiredTier: ContractorTier | null = null;
      
      for (const t of tiers) {
        if (CONTRACTOR_TIERS[t].features[feature]) {
          requiredTier = t;
          break;
        }
      }

      return {
        allowed: false,
        tier,
        feature,
        reason: requiredTier
          ? `Feature '${feature}' requires ${CONTRACTOR_TIERS[requiredTier].name} plan or higher`
          : `Feature '${feature}' is not available in any plan`,
      };
    }

    return {
      allowed: true,
      tier,
      feature,
    };
  } catch (error) {
    console.error('Error checking feature access:', error);
    throw error;
  }
}

/**
 * Get the limit for a specific feature based on tier
 * 
 * @param tier - The subscription tier
 * @param feature - The feature to check (e.g., 'activeJobs', 'teamMembers')
 * @returns The limit value (-1 for unlimited, 0 for not available)
 */
export function getFeatureLimit(
  tier: ContractorTier,
  feature: keyof ContractorTierLimits
): number {
  return getConfigFeatureLimit(tier, feature);
}

/**
 * Check if a contractor is within their limit for a specific feature
 * 
 * @param contractorId - The contractor's ID
 * @param feature - The feature to check (e.g., 'activeJobs', 'invoicesPerMonth')
 * @returns LimitCheckResult with detailed limit information
 */
export async function checkLimit(
  contractorId: string,
  feature: keyof ContractorTierLimits
): Promise<LimitCheckResult> {
  try {
    const tier = await getContractorTier(contractorId);
    const limit = getFeatureLimit(tier, feature);
    const usage = await getUsageData(contractorId);

    // Map feature names to usage data fields
    const featureToUsageMap: Record<string, keyof UsageData> = {
      activeJobs: 'activeJobsCount',
      invoicesPerMonth: 'invoicesThisMonth',
      customers: 'totalCustomers',
      teamMembers: 'teamMembersCount',
      inventoryItems: 'inventoryCount',
      equipmentItems: 'equipmentCount',
      activeLeads: 'activeLeadsCount',
    };

    const usageField = featureToUsageMap[feature];
    if (!usageField) {
      throw new Error(`Unknown feature for limit check: ${feature}`);
    }

    const current = usage[usageField];
    const allowed = isWithinLimit(current, limit);
    const remaining = getRemainingQuota(current, limit);
    const percentage = getUsagePercentage(current, limit);
    const approaching = isApproachingLimit(current, limit);
    const atLimit = isAtLimit(current, limit);

    // Log limit violation if at limit
    if (atLimit && limit !== -1) {
      logLimitViolation({
        contractorId,
        feature: feature as string,
        current,
        limit,
        tier,
        timestamp: new Date(),
      });
    }

    return {
      allowed,
      current,
      limit,
      remaining,
      percentage,
      isApproaching: approaching,
      isAtLimit: atLimit,
    };
  } catch (error) {
    console.error('Error checking limit:', error);
    throw error;
  }
}

/**
 * Check multiple limits at once
 * 
 * @param contractorId - The contractor's ID
 * @param features - Array of features to check
 * @returns Map of feature names to their limit check results
 */
export async function checkMultipleLimits(
  contractorId: string,
  features: Array<keyof ContractorTierLimits>
): Promise<Map<string, LimitCheckResult>> {
  const results = new Map<string, LimitCheckResult>();

  // Fetch tier and usage once for efficiency
  const tier = await getContractorTier(contractorId);
  const usage = await getUsageData(contractorId);

  const featureToUsageMap: Record<string, keyof UsageData> = {
    activeJobs: 'activeJobsCount',
    invoicesPerMonth: 'invoicesThisMonth',
    customers: 'totalCustomers',
    teamMembers: 'teamMembersCount',
    inventoryItems: 'inventoryCount',
    equipmentItems: 'equipmentCount',
    activeLeads: 'activeLeadsCount',
  };

  for (const feature of features) {
    const limit = getFeatureLimit(tier, feature);
    const usageField = featureToUsageMap[feature];
    
    if (!usageField) {
      console.warn(`Unknown feature for limit check: ${feature}`);
      continue;
    }

    const current = usage[usageField];
    const allowed = isWithinLimit(current, limit);
    const remaining = getRemainingQuota(current, limit);
    const percentage = getUsagePercentage(current, limit);
    const approaching = isApproachingLimit(current, limit);
    const atLimit = isAtLimit(current, limit);

    results.set(feature, {
      allowed,
      current,
      limit,
      remaining,
      percentage,
      isApproaching: approaching,
      isAtLimit: atLimit,
    });
  }

  return results;
}

/**
 * Invalidate the cache for a contractor (call after subscription changes)
 * 
 * @param contractorId - The contractor's ID
 */
export function invalidateCache(contractorId: string): void {
  subscriptionCache.invalidate(contractorId);
}

/**
 * Clear the entire subscription cache
 */
export function clearCache(): void {
  subscriptionCache.clear();
}

/**
 * Get all usage data and limits for a contractor
 * Useful for dashboard displays
 * 
 * @param contractorId - The contractor's ID
 * @returns Object with tier, usage, and limits for all features
 */
export async function getContractorUsageOverview(contractorId: string) {
  const tier = await getContractorTier(contractorId);
  const usage = await getUsageData(contractorId);
  const limits = CONTRACTOR_TIERS[tier].limits;

  const features: Array<keyof ContractorTierLimits> = [
    'activeJobs',
    'invoicesPerMonth',
    'customers',
    'teamMembers',
    'inventoryItems',
    'equipmentItems',
    'activeLeads',
  ];

  const overview: Record<string, LimitCheckResult> = {};

  const featureToUsageMap: Record<string, keyof UsageData> = {
    activeJobs: 'activeJobsCount',
    invoicesPerMonth: 'invoicesThisMonth',
    customers: 'totalCustomers',
    teamMembers: 'teamMembersCount',
    inventoryItems: 'inventoryCount',
    equipmentItems: 'equipmentCount',
    activeLeads: 'activeLeadsCount',
  };

  for (const feature of features) {
    const limit = limits[feature];
    const usageField = featureToUsageMap[feature];
    
    if (!usageField) continue;

    const current = usage[usageField];
    const allowed = isWithinLimit(current, limit);
    const remaining = getRemainingQuota(current, limit);
    const percentage = getUsagePercentage(current, limit);
    const approaching = isApproachingLimit(current, limit);
    const atLimit = isAtLimit(current, limit);

    overview[feature] = {
      allowed,
      current,
      limit,
      remaining,
      percentage,
      isApproaching: approaching,
      isAtLimit: atLimit,
    };
  }

  return {
    tier,
    tierName: CONTRACTOR_TIERS[tier].name,
    price: CONTRACTOR_TIERS[tier].price,
    usage: overview,
  };
}

// ============= Error Classes =============

export class SubscriptionLimitError extends Error {
  constructor(
    public feature: string,
    public limit: number,
    public current: number,
    public tier: ContractorTier
  ) {
    super(`Subscription limit reached for ${feature}: ${current}/${limit}`);
    this.name = 'SubscriptionLimitError';
  }
}

export class FeatureLockedError extends Error {
  constructor(
    public feature: string,
    public requiredTier: string,
    public currentTier: ContractorTier
  ) {
    super(`Feature ${feature} requires ${requiredTier} plan (current: ${currentTier})`);
    this.name = 'FeatureLockedError';
  }
}
