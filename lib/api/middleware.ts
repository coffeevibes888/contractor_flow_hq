/**
 * API Middleware
 * 
 * Provides authentication, rate limiting, and request logging for the external API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { validateApiKey, hasScope, ApiScope } from '@/lib/services/api-key.service';

export interface ApiContext {
  apiKeyId: string;
  landlordId: string;
  scopes: string[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

/**
 * Extract API key from request headers
 */
function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.headers.get('x-api-key');
}

/**
 * Check rate limit for an API key
 */
async function checkRateLimit(
  apiKeyId: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  // Count requests in the current window
  const requestCount = await prisma.apiRequestLog.count({
    where: {
      apiKeyId,
      createdAt: { gte: windowStart },
    },
  });

  const remaining = Math.max(0, limit - requestCount - 1);
  const reset = Math.floor((windowStart.getTime() + windowSeconds * 1000) / 1000);

  return {
    allowed: requestCount < limit,
    remaining,
    reset,
    limit,
  };
}

/**
 * Log an API request
 */
async function logApiRequest(
  apiKeyId: string | null,
  landlordId: string,
  req: NextRequest,
  statusCode: number,
  responseTimeMs: number,
  errorMessage?: string
) {
  try {
    await prisma.apiRequestLog.create({
      data: {
        apiKeyId,
        landlordId,
        method: req.method,
        path: new URL(req.url).pathname,
        statusCode,
        responseTimeMs,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to log API request:', error);
  }
}

/**
 * Create an error response
 */
export function apiError(
  message: string,
  status: number = 400,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code: code || 'api_error',
        status,
      },
    },
    { status }
  );
}

/**
 * Create a success response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Create a paginated response
 */
export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse {
  return NextResponse.json({
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
}

/**
 * Authenticate API request and return context
 */
export async function authenticateApiRequest(
  req: NextRequest,
  requiredScopes: ApiScope[] = []
): Promise<{ context: ApiContext } | { error: NextResponse }> {
  const startTime = Date.now();
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    return {
      error: apiError('Missing API key. Provide via Authorization header or X-API-Key.', 401, 'missing_api_key'),
    };
  }

  const validation = await validateApiKey(apiKey);

  if (!validation.valid || !validation.apiKey) {
    return {
      error: apiError(validation.error || 'Invalid API key', 401, 'invalid_api_key'),
    };
  }

  const { apiKey: validatedKey } = validation;

  // Check required scopes
  for (const scope of requiredScopes) {
    if (!hasScope(validatedKey.scopes, scope)) {
      await logApiRequest(
        validatedKey.id,
        validatedKey.landlordId,
        req,
        403,
        Date.now() - startTime,
        `Missing required scope: ${scope}`
      );
      return {
        error: apiError(`Missing required scope: ${scope}`, 403, 'insufficient_scope'),
      };
    }
  }

  // Get rate limit settings
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { id: validatedKey.id },
    select: { rateLimit: true, rateLimitWindow: true },
  });

  if (apiKeyRecord) {
    const rateLimit = await checkRateLimit(
      validatedKey.id,
      apiKeyRecord.rateLimit,
      apiKeyRecord.rateLimitWindow
    );

    if (!rateLimit.allowed) {
      await logApiRequest(
        validatedKey.id,
        validatedKey.landlordId,
        req,
        429,
        Date.now() - startTime,
        'Rate limit exceeded'
      );
      
      const response = apiError('Rate limit exceeded', 429, 'rate_limit_exceeded');
      response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
      return { error: response };
    }
  }

  return {
    context: {
      apiKeyId: validatedKey.id,
      landlordId: validatedKey.landlordId,
      scopes: validatedKey.scopes,
    },
  };
}

/**
 * Wrapper for API route handlers with authentication
 */
export function withApiAuth(
  handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>,
  requiredScopes: ApiScope[] = []
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    
    const authResult = await authenticateApiRequest(req, requiredScopes);
    
    if ('error' in authResult) {
      return authResult.error;
    }

    try {
      const response = await handler(req, authResult.context);
      
      // Log successful request
      await logApiRequest(
        authResult.context.apiKeyId,
        authResult.context.landlordId,
        req,
        response.status,
        Date.now() - startTime
      );

      // Add rate limit headers
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { id: authResult.context.apiKeyId },
        select: { rateLimit: true, rateLimitWindow: true },
      });

      if (apiKeyRecord) {
        const rateLimit = await checkRateLimit(
          authResult.context.apiKeyId,
          apiKeyRecord.rateLimit,
          apiKeyRecord.rateLimitWindow
        );
        response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      
      await logApiRequest(
        authResult.context.apiKeyId,
        authResult.context.landlordId,
        req,
        500,
        Date.now() - startTime,
        errorMessage
      );

      console.error('API Error:', error);
      return apiError('Internal server error', 500, 'internal_error');
    }
  };
}

/**
 * Parse pagination parameters from request
 */
export function parsePagination(req: NextRequest): { page: number; limit: number; offset: number } {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Parse sort parameters from request
 */
export function parseSort(
  req: NextRequest,
  allowedFields: string[],
  defaultField: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): { field: string; order: 'asc' | 'desc' } {
  const url = new URL(req.url);
  const sortParam = url.searchParams.get('sort') || defaultField;
  const orderParam = url.searchParams.get('order')?.toLowerCase();

  const field = allowedFields.includes(sortParam) ? sortParam : defaultField;
  const order = orderParam === 'asc' || orderParam === 'desc' ? orderParam : defaultOrder;

  return { field, order };
}
