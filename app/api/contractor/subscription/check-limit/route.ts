/**
 * Limit Check API
 * 
 * POST /api/contractor/subscription/check-limit
 * 
 * Checks if a contractor can perform an action based on their subscription limits.
 * Returns current usage, limit, remaining quota, and whether the action is allowed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
} from '@/lib/security/rate-limiter';

// Valid feature types that can be checked
const VALID_FEATURES = [
  'activeJobs',
  'invoicesPerMonth',
  'customers',
  'teamMembers',
  'inventoryItems',
  'equipmentItems',
  'activeLeads',
  'storageGB',
] as const;

type ValidFeature = typeof VALID_FEATURES[number];

interface CheckLimitRequest {
  feature: string;
}

interface CheckLimitResponse {
  success: boolean;
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isApproaching: boolean;
  isAtLimit: boolean;
  unlimited: boolean;
  feature: string;
  message: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  resetIn?: number;
}

/**
 * POST /api/contractor/subscription/check-limit
 * 
 * Check if a contractor can perform an action based on their subscription limits
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // 2. Rate Limiting
    const identifier = `check-limit:${session.user.id}`;
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.api);

    if (!rateLimitResult.allowed) {
      const headers = createRateLimitHeaders(
        rateLimitResult.remaining,
        rateLimitResult.resetIn,
        RATE_LIMIT_CONFIGS.api.maxRequests
      );

      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
          resetIn: Math.ceil(rateLimitResult.resetIn / 1000), // Convert to seconds
        },
        { status: 429, headers }
      );
    }

    // 3. Parse and validate request body
    let body: CheckLimitRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const { feature } = body;

    // Validate feature parameter
    if (!feature || typeof feature !== 'string') {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Missing or invalid "feature" parameter. Must be a string.',
        },
        { status: 400 }
      );
    }

    // Check if feature is valid
    if (!VALID_FEATURES.includes(feature as ValidFeature)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: `Invalid feature "${feature}". Valid features are: ${VALID_FEATURES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 4. Get contractor profile
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        subscriptionTier: true,
      },
    });

    if (!contractor) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Contractor profile not found',
        },
        { status: 404 }
      );
    }

    // 5. Check limit using feature gate service
    const limitResult = await checkLimit(contractor.id, feature as ValidFeature);

    // 6. Generate appropriate message
    let message: string;
    const unlimited = limitResult.limit === -1;

    if (unlimited) {
      message = `You have unlimited ${feature}.`;
    } else if (limitResult.isAtLimit) {
      message = `You have reached your limit of ${limitResult.limit} ${feature}.`;
    } else if (limitResult.isApproaching) {
      message = `You are approaching your limit of ${limitResult.limit} ${feature}. ${limitResult.remaining} remaining.`;
    } else {
      message = `You have ${limitResult.remaining} of ${limitResult.limit} ${feature} remaining.`;
    }

    // 7. Create rate limit headers for successful response
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetIn,
      RATE_LIMIT_CONFIGS.api.maxRequests
    );

    // 8. Return success response
    return NextResponse.json<CheckLimitResponse>(
      {
        success: true,
        allowed: limitResult.allowed,
        current: limitResult.current,
        limit: limitResult.limit,
        remaining: limitResult.remaining,
        percentage: limitResult.percentage,
        isApproaching: limitResult.isApproaching,
        isAtLimit: limitResult.isAtLimit,
        unlimited,
        feature,
        message,
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error checking limit:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        message: 'Failed to check limit',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
