import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getContractorUsageOverview } from '@/lib/services/contractor-feature-gate';
import { CONTRACTOR_TIERS } from '@/lib/config/contractor-subscription-tiers';
import { runBackgroundOps } from '@/lib/middleware/contractor-background-ops';

/**
 * GET /api/contractor/subscription/usage
 * 
 * Returns current usage statistics for a contractor including:
 * - Current tier information
 * - Usage vs limits for all features
 * - Percentages and remaining quotas
 * - Warnings for approaching limits (80% and 100%)
 */
export async function GET() {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get contractor profile
    const contractor = await prisma.contractorProfile.findFirst({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    if (!contractor) {
      return NextResponse.json(
        { success: false, message: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Run background operations (daily check, monthly reset)
    await runBackgroundOps(contractor.id);

    // Get comprehensive usage overview
    const overview = await getContractorUsageOverview(contractor.id);

    // Generate warnings for features approaching or at limits
    const warnings: Array<{
      feature: string;
      level: 'warning' | 'critical';
      message: string;
      current: number;
      limit: number;
      percentage: number;
    }> = [];

    // Check each feature for warnings
    Object.entries(overview.usage).forEach(([feature, data]) => {
      if (data.isAtLimit) {
        warnings.push({
          feature,
          level: 'critical',
          message: `You have reached your limit for ${formatFeatureName(feature)}`,
          current: data.current,
          limit: data.limit,
          percentage: data.percentage,
        });
      } else if (data.isApproaching) {
        warnings.push({
          feature,
          level: 'warning',
          message: `You are approaching your limit for ${formatFeatureName(feature)}`,
          current: data.current,
          limit: data.limit,
          percentage: data.percentage,
        });
      }
    });

    // Build response with formatted usage data
    const response = {
      success: true,
      tier: overview.tier,
      tierName: overview.tierName,
      price: overview.price,
      subscriptionStatus: contractor.subscriptionStatus,
      usage: formatUsageData(overview.usage),
      warnings,
      upgradeAvailable: overview.tier !== 'enterprise',
      nextTier: getNextTier(overview.tier),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch usage data:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch usage data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Format usage data for API response
 */
function formatUsageData(usage: Record<string, any>) {
  const formatted: Record<string, {
    feature: string;
    displayName: string;
    current: number;
    limit: number;
    remaining: number;
    percentage: number;
    isApproaching: boolean;
    isAtLimit: boolean;
    unlimited: boolean;
  }> = {};

  const displayNames: Record<string, string> = {
    activeJobs: 'Active Jobs',
    invoicesPerMonth: 'Invoices/Month',
    customers: 'Customers',
    teamMembers: 'Team Members',
    inventoryItems: 'Inventory Items',
    equipmentItems: 'Equipment',
    activeLeads: 'Active Leads',
  };

  Object.entries(usage).forEach(([feature, data]) => {
    formatted[feature] = {
      feature,
      displayName: displayNames[feature] || feature,
      current: data.current,
      limit: data.limit,
      remaining: data.remaining,
      percentage: data.percentage,
      isApproaching: data.isApproaching,
      isAtLimit: data.isAtLimit,
      unlimited: data.limit === -1,
    };
  });

  return formatted;
}

/**
 * Format feature name for display in messages
 */
function formatFeatureName(feature: string): string {
  const nameMap: Record<string, string> = {
    activeJobs: 'active jobs',
    invoicesPerMonth: 'invoices per month',
    customers: 'customers',
    teamMembers: 'team members',
    inventoryItems: 'inventory items',
    equipmentItems: 'equipment items',
    activeLeads: 'active leads',
  };

  return nameMap[feature] || feature;
}

/**
 * Get the next tier for upgrade suggestions
 */
function getNextTier(currentTier: string): string | null {
  const tierOrder = ['starter', 'pro', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return null;
  }
  
  return tierOrder[currentIndex + 1];
}
