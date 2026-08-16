import { prisma as db } from '@/db/prisma';

export class EmploymentVerificationUsageService {
  /**
   * Track employment verification usage for subscription billing
   */
  static async trackUsage(params: {
    landlordId: string;
    applicationId: string;
    verificationDocumentId?: string;
    method: string;
  }): Promise<{ wasFree: boolean; cost: number }> {
    // Get landlord subscription
    const landlord = await db.landlord.findUnique({
      where: { id: params.landlordId },
      include: {
        subscription: true,
      },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    // Determine billing period (current month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Count usage in current billing period
    const usageCount = await db.employmentVerificationUsage.count({
      where: {
        landlordId: params.landlordId,
        billingPeriodStart: {
          gte: billingPeriodStart,
        },
        billingPeriodEnd: {
          lte: billingPeriodEnd,
        },
      },
    });

    // Determine if this check is free
    let wasFree = false;
    let cost = 5.00; // Default cost per check

    // Check subscription tier
    const subscriptionTier = landlord.subscriptionTier || 'free';
    const hasFreeEmploymentVerification = landlord.subscription?.freeEmploymentVerification || false;

    if (subscriptionTier === 'professional' || subscriptionTier === 'enterprise' || hasFreeEmploymentVerification) {
      // Pro/Enterprise get 7 free checks per month
      if (usageCount < 7) {
        wasFree = true;
        cost = 0;
      }
    }

    // Create usage record
    await db.employmentVerificationUsage.create({
      data: {
        landlordId: params.landlordId,
        applicationId: params.applicationId,
        verificationDocumentId: params.verificationDocumentId,
        method: params.method,
        cost,
        wasFree,
        billingPeriodStart,
        billingPeriodEnd,
      },
    });

    return { wasFree, cost };
  }

  /**
   * Get usage statistics for a landlord
   */
  static async getUsageStats(landlordId: string): Promise<{
    currentPeriodUsage: number;
    freeChecksRemaining: number;
    totalCost: number;
    hasFreeChecks: boolean;
  }> {
    // Get landlord subscription
    const landlord = await db.landlord.findUnique({
      where: { id: landlordId },
      include: {
        subscription: true,
      },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    // Determine billing period (current month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get usage in current period
    const usage = await db.employmentVerificationUsage.findMany({
      where: {
        landlordId,
        billingPeriodStart: {
          gte: billingPeriodStart,
        },
        billingPeriodEnd: {
          lte: billingPeriodEnd,
        },
      },
    });

    const currentPeriodUsage = usage.length;
    const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.cost.toString()), 0);

    // Check if landlord has free checks
    const subscriptionTier = landlord.subscriptionTier || 'free';
    const hasFreeEmploymentVerification = landlord.subscription?.freeEmploymentVerification || false;
    const hasFreeChecks = subscriptionTier === 'professional' || subscriptionTier === 'enterprise' || hasFreeEmploymentVerification;

    const freeChecksRemaining = hasFreeChecks ? Math.max(0, 7 - currentPeriodUsage) : 0;

    return {
      currentPeriodUsage,
      freeChecksRemaining,
      totalCost,
      hasFreeChecks,
    };
  }

  /**
   * Get usage history for a landlord
   */
  static async getUsageHistory(
    landlordId: string,
    limit: number = 50
  ): Promise<any[]> {
    const usage = await db.employmentVerificationUsage.findMany({
      where: { landlordId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        landlord: {
          select: {
            name: true,
          },
        },
      },
    });

    return usage;
  }
}
