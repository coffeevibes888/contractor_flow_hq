'use client';

import { useState, useEffect } from 'react';
import { 
  SUBSCRIPTION_TIERS, 
  SubscriptionTier, 
  TierFeatures, 
  normalizeTier,
  hasFeatureAccess 
} from '@/lib/config/subscription-tiers';

interface UseSubscriptionTierResult {
  tier: SubscriptionTier;
  tierName: string;
  loading: boolean;
  hasFeature: (feature: keyof TierFeatures) => boolean;
  isPro: boolean;
  isEnterprise: boolean;
  isFree: boolean;
}

export function useSubscriptionTier(landlordId?: string | null): UseSubscriptionTierResult {
  const [tier, setTier] = useState<SubscriptionTier>('starter');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTier = async () => {
      try {
        // The API uses session auth, so landlordId param is optional
        const url = landlordId 
          ? `/api/landlord/subscription?landlordId=${landlordId}`
          : '/api/landlord/subscription';
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.success && json.subscription?.tier) {
          setTier(normalizeTier(json.subscription.tier));
        }
      } catch (error) {
        console.error('Failed to fetch subscription tier:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTier();
  }, [landlordId]);

  const hasFeature = (feature: keyof TierFeatures): boolean => {
    return hasFeatureAccess(tier, feature);
  };

  return {
    tier,
    tierName: SUBSCRIPTION_TIERS[tier].name,
    loading,
    hasFeature,
    isPro: tier === 'pro' || tier === 'enterprise',
    isEnterprise: tier === 'enterprise',
    isFree: tier === 'starter',
  };
}
