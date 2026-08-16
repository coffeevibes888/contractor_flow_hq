import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSubscriptionMetrics } from '@/lib/monitoring/subscription-monitor';

/**
 * GET /api/contractor/subscription/metrics
 * 
 * Returns subscription metrics for monitoring and analytics.
 * Admin-only endpoint for viewing system-wide subscription statistics.
 * 
 * Query Parameters:
 * - startDate: ISO date string (optional, defaults to 30 days ago)
 * - endDate: ISO date string (optional, defaults to now)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin-only: system-wide subscription metrics are not contractor data.
    const role = session.user.role;
    if (role !== 'admin' && role !== 'superAdmin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to last 30 days
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, message: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Get metrics
    const metrics = await getSubscriptionMetrics({ start: startDate, end: endDate });

    // Build response
    const response = {
      success: true,
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)),
      },
      metrics: {
        limitHitRate: {
          value: metrics.limitHitRate,
          percentage: `${(metrics.limitHitRate * 100).toFixed(1)}%`,
          description: 'Percentage of contractors who hit tier limits',
        },
        upgradeConversionRate: {
          value: metrics.upgradeConversionRate,
          percentage: `${(metrics.upgradeConversionRate * 100).toFixed(1)}%`,
          description: 'Percentage of limit hits that result in upgrades',
        },
        averageUsageByTier: metrics.averageUsageByTier,
        topLimitedFeatures: metrics.topLimitedFeatures,
      },
      insights: generateInsights(metrics),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch subscription metrics:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch subscription metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate insights from metrics
 */
function generateInsights(metrics: any): string[] {
  const insights: string[] = [];

  // Limit hit rate insights
  if (metrics.limitHitRate > 0.3) {
    insights.push('High limit hit rate detected. Consider reviewing tier limits or promoting upgrades.');
  } else if (metrics.limitHitRate < 0.05) {
    insights.push('Low limit hit rate. Tier limits may be too generous.');
  }

  // Conversion rate insights
  if (metrics.upgradeConversionRate < 0.15) {
    insights.push('Low upgrade conversion rate. Review upgrade prompts and pricing.');
  } else if (metrics.upgradeConversionRate > 0.4) {
    insights.push('Excellent upgrade conversion rate! Current strategy is working well.');
  }

  // Feature-specific insights
  const topFeature = metrics.topLimitedFeatures[0];
  if (topFeature) {
    insights.push(`"${topFeature.feature}" is the most commonly limited feature with ${topFeature.count} hits.`);
  }

  // Tier distribution insights
  const tierCounts = Object.values(metrics.averageUsageByTier).map((t: any) => t.count);
  const totalContractors = tierCounts.reduce((sum: number, count: number) => sum + count, 0);
  
  if (totalContractors > 0) {
    const starterPercentage = ((metrics.averageUsageByTier.starter?.count || 0) / totalContractors) * 100;
    if (starterPercentage > 70) {
      insights.push('Most contractors are on Starter tier. Focus on upgrade campaigns.');
    }
  }

  return insights;
}

/**
 * POST /api/contractor/subscription/metrics
 * 
 * Not implemented - metrics are read-only
 */
export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Method not allowed' },
    { status: 405 }
  );
}
