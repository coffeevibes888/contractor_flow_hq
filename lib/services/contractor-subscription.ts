/**
 * Contractor Subscription Service
 * 
 * Manages contractor subscription tiers and feature access
 * 
 * NOTE: This service manages subscription state only.
 * Payment processing integration is handled separately to avoid conflicts
 * with existing landlord/property manager payment systems.
 * 
 * PRICING MODEL:
 * - Starter: $49/month (unlimited leads, basic CRM, invoicing, scheduler)
 * - Pro: $99/month (all Starter + priority placement, analytics, calendar sync)
 * - Enterprise: $199/month (all Pro + team management, API access, dedicated support)
 */

import { prisma } from '@/db/prisma';

export type ContractorSubscriptionTier = 'starter' | 'pro' | 'enterprise';
export type ContractorSubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';

export interface ContractorTierConfig {
  name: string;
  price: number; // in cents
  priceId?: string; // Stripe price ID
  features: string[];
  description: string;
}

export const CONTRACTOR_SUBSCRIPTION_TIERS: Record<ContractorSubscriptionTier, ContractorTierConfig> = {
  starter: {
    name: 'Starter',
    price: 4900, // $49.00
    features: [
      'unlimited_leads',
      'basic_crm',
      'invoicing',
      'scheduler',
    ],
    description: 'Perfect for independent contractors getting started',
  },
  pro: {
    name: 'Pro',
    price: 9900, // $99.00
    features: [
      'unlimited_leads',
      'advanced_crm',
      'invoicing',
      'scheduler',
      'priority_placement',
      'analytics',
      'calendar_sync',
    ],
    description: 'Everything you need to grow your contracting business',
  },
  enterprise: {
    name: 'Enterprise',
    price: 19900, // $199.00
    features: [
      'unlimited_leads',
      'advanced_crm',
      'invoicing',
      'scheduler',
      'priority_placement',
      'analytics',
      'calendar_sync',
      'team_management',
      'api_access',
      'dedicated_support',
    ],
    description: 'Full-featured solution for contractor teams',
  },
};

export type ContractorFeature = 
  | 'unlimited_leads'
  | 'basic_crm'
  | 'advanced_crm'
  | 'invoicing'
  | 'scheduler'
  | 'priority_placement'
  | 'analytics'
  | 'calendar_sync'
  | 'team_management'
  | 'api_access'
  | 'dedicated_support';

export interface CreateSubscriptionParams {
  contractorId: string;
  tier: ContractorSubscriptionTier;
}

export interface SubscriptionResult {
  success: boolean;
  contractor?: any;
  error?: string;
}

export interface CancelSubscriptionParams {
  contractorId: string;
  immediate?: boolean; // If true, cancel immediately. If false, cancel at period end
  endsAt?: Date; // When the subscription should end
}

export interface ChangeTierParams {
  contractorId: string;
  newTier: ContractorSubscriptionTier;
}

/**
 * Contractor Subscription Service
 */
export class ContractorSubscriptionService {
  /**
   * Create/activate a subscription for a contractor
   * NOTE: This only updates the database state. Payment processing should be handled separately.
   */
  static async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const { contractorId, tier } = params;

    try {
      // Get contractor profile
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorId },
      });

      if (!contractor) {
        return { success: false, error: 'Contractor not found' };
      }

      // Check if contractor already has an active subscription
      if (contractor.subscriptionStatus === 'active' || contractor.subscriptionStatus === 'trialing') {
        return { success: false, error: 'Contractor already has an active subscription' };
      }

      // Calculate subscription end date (30 days from now)
      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

      // Update contractor profile with subscription
      const updatedContractor = await prisma.contractorProfile.update({
        where: { id: contractorId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          subscriptionEndsAt,
        },
      });

      return {
        success: true,
        contractor: updatedContractor,
      };
    } catch (error) {
      console.error('Error creating contractor subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      };
    }
  }

  /**
   * Cancel a contractor's subscription
   */
  static async cancelSubscription(params: CancelSubscriptionParams): Promise<SubscriptionResult> {
    const { contractorId, immediate = false, endsAt } = params;

    try {
      // Get contractor profile
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorId },
      });

      if (!contractor) {
        return { success: false, error: 'Contractor not found' };
      }

      if (contractor.subscriptionStatus === 'none' || contractor.subscriptionStatus === 'canceled') {
        return { success: false, error: 'No active subscription found' };
      }

      let updateData: any = {};

      if (immediate) {
        // Cancel immediately
        updateData = {
          subscriptionStatus: 'canceled',
          subscriptionEndsAt: new Date(),
        };
      } else {
        // Cancel at period end - keep status as active until period ends
        updateData = {
          subscriptionEndsAt: endsAt || contractor.subscriptionEndsAt || new Date(),
        };
      }

      const updatedContractor = await prisma.contractorProfile.update({
        where: { id: contractorId },
        data: updateData,
      });

      return {
        success: true,
        contractor: updatedContractor,
      };
    } catch (error) {
      console.error('Error canceling contractor subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      };
    }
  }

  /**
   * Change a contractor's subscription tier
   */
  static async changeTier(params: ChangeTierParams): Promise<SubscriptionResult> {
    const { contractorId, newTier } = params;

    try {
      // Get contractor profile
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorId },
      });

      if (!contractor) {
        return { success: false, error: 'Contractor not found' };
      }

      if (contractor.subscriptionStatus === 'none' || contractor.subscriptionStatus === 'canceled') {
        return { success: false, error: 'No active subscription found' };
      }

      if (contractor.subscriptionTier === newTier) {
        return { success: false, error: 'Already subscribed to this tier' };
      }

      // Update contractor profile with new tier
      const updatedContractor = await prisma.contractorProfile.update({
        where: { id: contractorId },
        data: {
          subscriptionTier: newTier,
        },
      });

      return {
        success: true,
        contractor: updatedContractor,
      };
    } catch (error) {
      console.error('Error changing contractor subscription tier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change subscription tier',
      };
    }
  }

  /**
   * Check if a contractor has access to a specific feature
   */
  static async checkAccess(
    contractorId: string,
    feature: ContractorFeature
  ): Promise<boolean> {
    try {
      // Get contractor profile
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorId },
        select: {
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
        },
      });

      if (!contractor) {
        return false;
      }

      // No subscription or inactive subscription
      if (
        !contractor.subscriptionTier ||
        contractor.subscriptionStatus === 'none' ||
        contractor.subscriptionStatus === 'canceled'
      ) {
        return false;
      }

      // Check if subscription has expired
      if (contractor.subscriptionEndsAt && contractor.subscriptionEndsAt < new Date()) {
        return false;
      }

      // Check if tier includes the feature
      const tier = contractor.subscriptionTier as ContractorSubscriptionTier;
      const tierConfig = CONTRACTOR_SUBSCRIPTION_TIERS[tier];

      return tierConfig.features.includes(feature);
    } catch (error) {
      console.error('Error checking contractor feature access:', error);
      return false;
    }
  }

  /**
   * Get subscription status for a contractor
   */
  static async getSubscriptionStatus(contractorId: string) {
    try {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorId },
        select: {
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
        },
      });

      if (!contractor) {
        return null;
      }

      // Check if subscription has expired and update status
      if (
        contractor.subscriptionEndsAt &&
        contractor.subscriptionEndsAt < new Date() &&
        contractor.subscriptionStatus === 'active'
      ) {
        await prisma.contractorProfile.update({
          where: { id: contractorId },
          data: {
            subscriptionStatus: 'canceled',
          },
        });

        return {
          ...contractor,
          subscriptionStatus: 'canceled' as ContractorSubscriptionStatus,
        };
      }

      return contractor;
    } catch (error) {
      console.error('Error getting contractor subscription status:', error);
      return null;
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  static async reactivateSubscription(contractorId: string): Promise<SubscriptionResult> {
    try {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorId },
      });

      if (!contractor) {
        return { success: false, error: 'Contractor not found' };
      }

      if (!contractor.subscriptionTier) {
        return { success: false, error: 'No subscription tier found' };
      }

      // Calculate new subscription end date (30 days from now)
      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

      // Update contractor profile
      const updatedContractor = await prisma.contractorProfile.update({
        where: { id: contractorId },
        data: {
          subscriptionStatus: 'active',
          subscriptionEndsAt,
        },
      });

      return {
        success: true,
        contractor: updatedContractor,
      };
    } catch (error) {
      console.error('Error reactivating contractor subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
      };
    }
  }

  /**
   * Get all features available for a tier
   */
  static getTierFeatures(tier: ContractorSubscriptionTier): string[] {
    return CONTRACTOR_SUBSCRIPTION_TIERS[tier].features;
  }

  /**
   * Check if a tier has a specific feature
   */
  static tierHasFeature(tier: ContractorSubscriptionTier, feature: ContractorFeature): boolean {
    return CONTRACTOR_SUBSCRIPTION_TIERS[tier].features.includes(feature);
  }

  /**
   * Get tier configuration
   */
  static getTierConfig(tier: ContractorSubscriptionTier): ContractorTierConfig {
    return CONTRACTOR_SUBSCRIPTION_TIERS[tier];
  }

  /**
   * Get all tier configurations
   */
  static getAllTiers(): Record<ContractorSubscriptionTier, ContractorTierConfig> {
    return CONTRACTOR_SUBSCRIPTION_TIERS;
  }
}
