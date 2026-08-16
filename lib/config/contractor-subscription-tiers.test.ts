import { describe, it, expect } from '@jest/globals';
import {
  CONTRACTOR_TIERS,
  normalizeContractorTier,
  getTierConfig,
  getRequiredTier,
  hasFeatureAccess,
  getFeatureLimit,
  isUnlimited,
  isWithinLimit,
  getRemainingQuota,
  isApproachingLimit,
  isAtLimit,
  getUsagePercentage,
  getUpgradeTier,
  getDowngradeTier,
  compareTiers,
  isHigherTier,
  isLowerTier,
  getUpgradeFeatures,
  formatLimit,
  formatPrice,
  getPriceDifference,
  isValidTier,
} from './contractor-subscription-tiers';

describe('Contractor Subscription Tiers Configuration', () => {
  describe('CONTRACTOR_TIERS constant', () => {
    it('should have all three tiers defined', () => {
      expect(CONTRACTOR_TIERS.starter).toBeDefined();
      expect(CONTRACTOR_TIERS.pro).toBeDefined();
      expect(CONTRACTOR_TIERS.enterprise).toBeDefined();
    });

    it('should have correct pricing', () => {
      expect(CONTRACTOR_TIERS.starter.price).toBe(39);
      expect(CONTRACTOR_TIERS.pro.price).toBe(99);
      expect(CONTRACTOR_TIERS.enterprise.price).toBe(199);
    });

    it('should have correct limits for starter tier', () => {
      expect(CONTRACTOR_TIERS.starter.limits.activeJobs).toBe(15);
      expect(CONTRACTOR_TIERS.starter.limits.teamMembers).toBe(0);
      expect(CONTRACTOR_TIERS.starter.limits.customers).toBe(50);
    });

    it('should have correct limits for pro tier', () => {
      expect(CONTRACTOR_TIERS.pro.limits.activeJobs).toBe(50);
      expect(CONTRACTOR_TIERS.pro.limits.teamMembers).toBe(6);
      expect(CONTRACTOR_TIERS.pro.limits.invoicesPerMonth).toBe(-1); // unlimited
    });

    it('should have unlimited limits for enterprise tier', () => {
      expect(CONTRACTOR_TIERS.enterprise.limits.activeJobs).toBe(-1);
      expect(CONTRACTOR_TIERS.enterprise.limits.teamMembers).toBe(-1);
      expect(CONTRACTOR_TIERS.enterprise.limits.customers).toBe(-1);
    });
  });

  describe('normalizeContractorTier', () => {
    it('should normalize legacy tier names', () => {
      expect(normalizeContractorTier('free')).toBe('starter');
      expect(normalizeContractorTier('basic')).toBe('starter');
      expect(normalizeContractorTier('growth')).toBe('pro');
      expect(normalizeContractorTier('professional')).toBe('pro');
      expect(normalizeContractorTier('business')).toBe('enterprise');
    });

    it('should handle null and undefined', () => {
      expect(normalizeContractorTier(null)).toBe('starter');
      expect(normalizeContractorTier(undefined)).toBe('starter');
    });

    it('should handle case insensitivity', () => {
      expect(normalizeContractorTier('STARTER')).toBe('starter');
      expect(normalizeContractorTier('Pro')).toBe('pro');
      expect(normalizeContractorTier('ENTERPRISE')).toBe('enterprise');
    });
  });

  describe('getTierConfig', () => {
    it('should return correct tier configuration', () => {
      const starterConfig = getTierConfig('starter');
      expect(starterConfig.name).toBe('Starter');
      expect(starterConfig.price).toBe(39);
    });
  });

  describe('getRequiredTier', () => {
    it('should return starter for basic features', () => {
      expect(getRequiredTier('basicJobManagement')).toBe('starter');
      expect(getRequiredTier('mobileApp')).toBe('starter');
    });

    it('should return pro for team features', () => {
      expect(getRequiredTier('teamManagement')).toBe('pro');
      expect(getRequiredTier('crm')).toBe('pro');
    });

    it('should return enterprise for advanced features', () => {
      expect(getRequiredTier('apiAccess')).toBe('enterprise');
      expect(getRequiredTier('whiteLabel')).toBe('enterprise');
    });
  });

  describe('hasFeatureAccess', () => {
    it('should return true for starter features on starter tier', () => {
      expect(hasFeatureAccess('starter', 'basicJobManagement')).toBe(true);
      expect(hasFeatureAccess('starter', 'mobileApp')).toBe(true);
    });

    it('should return false for pro features on starter tier', () => {
      expect(hasFeatureAccess('starter', 'teamManagement')).toBe(false);
      expect(hasFeatureAccess('starter', 'crm')).toBe(false);
    });

    it('should return true for all features on enterprise tier', () => {
      expect(hasFeatureAccess('enterprise', 'basicJobManagement')).toBe(true);
      expect(hasFeatureAccess('enterprise', 'teamManagement')).toBe(true);
      expect(hasFeatureAccess('enterprise', 'apiAccess')).toBe(true);
    });
  });

  describe('getFeatureLimit', () => {
    it('should return correct limits for starter tier', () => {
      expect(getFeatureLimit('starter', 'activeJobs')).toBe(15);
      expect(getFeatureLimit('starter', 'teamMembers')).toBe(0);
    });

    it('should return -1 for unlimited features', () => {
      expect(getFeatureLimit('pro', 'invoicesPerMonth')).toBe(-1);
      expect(getFeatureLimit('enterprise', 'activeJobs')).toBe(-1);
    });
  });

  describe('isUnlimited', () => {
    it('should return true for -1', () => {
      expect(isUnlimited(-1)).toBe(true);
    });

    it('should return false for other numbers', () => {
      expect(isUnlimited(0)).toBe(false);
      expect(isUnlimited(15)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });
  });

  describe('isWithinLimit', () => {
    it('should return true when under limit', () => {
      expect(isWithinLimit(10, 15)).toBe(true);
      expect(isWithinLimit(0, 15)).toBe(true);
    });

    it('should return false when at or over limit', () => {
      expect(isWithinLimit(15, 15)).toBe(false);
      expect(isWithinLimit(20, 15)).toBe(false);
    });

    it('should return true for unlimited', () => {
      expect(isWithinLimit(1000, -1)).toBe(true);
    });
  });

  describe('getRemainingQuota', () => {
    it('should calculate remaining quota correctly', () => {
      expect(getRemainingQuota(10, 15)).toBe(5);
      expect(getRemainingQuota(0, 15)).toBe(15);
      expect(getRemainingQuota(15, 15)).toBe(0);
    });

    it('should return Infinity for unlimited', () => {
      expect(getRemainingQuota(100, -1)).toBe(Infinity);
    });

    it('should not return negative values', () => {
      expect(getRemainingQuota(20, 15)).toBe(0);
    });
  });

  describe('isApproachingLimit', () => {
    it('should return true at 80% threshold', () => {
      expect(isApproachingLimit(12, 15)).toBe(true); // 80%
      expect(isApproachingLimit(13, 15)).toBe(true); // 86%
    });

    it('should return false below 80% threshold', () => {
      expect(isApproachingLimit(10, 15)).toBe(false); // 66%
      expect(isApproachingLimit(5, 15)).toBe(false); // 33%
    });

    it('should return false for unlimited', () => {
      expect(isApproachingLimit(1000, -1)).toBe(false);
    });
  });

  describe('isAtLimit', () => {
    it('should return true when at or over limit', () => {
      expect(isAtLimit(15, 15)).toBe(true);
      expect(isAtLimit(20, 15)).toBe(true);
    });

    it('should return false when under limit', () => {
      expect(isAtLimit(10, 15)).toBe(false);
    });

    it('should return false for unlimited', () => {
      expect(isAtLimit(1000, -1)).toBe(false);
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(getUsagePercentage(10, 15)).toBe(67);
      expect(getUsagePercentage(15, 15)).toBe(100);
      expect(getUsagePercentage(0, 15)).toBe(0);
    });

    it('should cap at 100%', () => {
      expect(getUsagePercentage(20, 15)).toBe(100);
    });

    it('should return 0 for unlimited', () => {
      expect(getUsagePercentage(1000, -1)).toBe(0);
    });

    it('should return 100 for zero limit', () => {
      expect(getUsagePercentage(0, 0)).toBe(100);
    });
  });

  describe('getUpgradeTier', () => {
    it('should return correct upgrade path', () => {
      expect(getUpgradeTier('starter')).toBe('pro');
      expect(getUpgradeTier('pro')).toBe('enterprise');
      expect(getUpgradeTier('enterprise')).toBe(null);
    });
  });

  describe('getDowngradeTier', () => {
    it('should return correct downgrade path', () => {
      expect(getDowngradeTier('enterprise')).toBe('pro');
      expect(getDowngradeTier('pro')).toBe('starter');
      expect(getDowngradeTier('starter')).toBe(null);
    });
  });

  describe('compareTiers', () => {
    it('should compare tiers correctly', () => {
      expect(compareTiers('starter', 'pro')).toBe(-1);
      expect(compareTiers('pro', 'starter')).toBe(1);
      expect(compareTiers('starter', 'starter')).toBe(0);
      expect(compareTiers('pro', 'enterprise')).toBe(-1);
      expect(compareTiers('enterprise', 'starter')).toBe(1);
    });
  });

  describe('isHigherTier', () => {
    it('should return true when first tier is higher', () => {
      expect(isHigherTier('pro', 'starter')).toBe(true);
      expect(isHigherTier('enterprise', 'pro')).toBe(true);
      expect(isHigherTier('enterprise', 'starter')).toBe(true);
    });

    it('should return false when first tier is lower or equal', () => {
      expect(isHigherTier('starter', 'pro')).toBe(false);
      expect(isHigherTier('starter', 'starter')).toBe(false);
    });
  });

  describe('isLowerTier', () => {
    it('should return true when first tier is lower', () => {
      expect(isLowerTier('starter', 'pro')).toBe(true);
      expect(isLowerTier('pro', 'enterprise')).toBe(true);
      expect(isLowerTier('starter', 'enterprise')).toBe(true);
    });

    it('should return false when first tier is higher or equal', () => {
      expect(isLowerTier('pro', 'starter')).toBe(false);
      expect(isLowerTier('starter', 'starter')).toBe(false);
    });
  });

  describe('getUpgradeFeatures', () => {
    it('should return features gained when upgrading', () => {
      const features = getUpgradeFeatures('starter', 'pro');
      expect(features).toContain('teamManagement');
      expect(features).toContain('crm');
      expect(features).not.toContain('basicJobManagement'); // Already in starter
    });

    it('should return empty array when downgrading', () => {
      const features = getUpgradeFeatures('pro', 'starter');
      expect(features).toEqual([]);
    });
  });

  describe('formatLimit', () => {
    it('should format limits correctly', () => {
      expect(formatLimit(-1)).toBe('Unlimited');
      expect(formatLimit(0)).toBe('Not available');
      expect(formatLimit(15)).toBe('15');
      expect(formatLimit(100)).toBe('100');
    });
  });

  describe('formatPrice', () => {
    it('should format prices correctly', () => {
      expect(formatPrice(39)).toBe('$39.00');
      expect(formatPrice(99)).toBe('$99.00');
      expect(formatPrice(199)).toBe('$199.00');
    });
  });

  describe('getPriceDifference', () => {
    it('should calculate price difference correctly', () => {
      expect(getPriceDifference('starter', 'pro')).toBeCloseTo(60, 2);
      expect(getPriceDifference('pro', 'enterprise')).toBeCloseTo(100, 2);
      expect(getPriceDifference('starter', 'enterprise')).toBeCloseTo(160, 2);
    });

    it('should return negative for downgrade', () => {
      expect(getPriceDifference('pro', 'starter')).toBeCloseTo(-20.00, 2);
    });
  });

  describe('isValidTier', () => {
    it('should return true for valid tiers', () => {
      expect(isValidTier('starter')).toBe(true);
      expect(isValidTier('pro')).toBe(true);
      expect(isValidTier('enterprise')).toBe(true);
    });

    it('should return false for invalid tiers', () => {
      expect(isValidTier('invalid')).toBe(false);
      expect(isValidTier('free')).toBe(false);
      expect(isValidTier('')).toBe(false);
    });
  });
});
