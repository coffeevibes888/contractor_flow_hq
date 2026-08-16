/**
 * Rate Limiter for API endpoints
 * Prevents brute force attacks and abuse.
 *
 * Two tiers:
 *  1. checkRateLimit()        — fast in-memory Map (general API, non-critical)
 *  2. checkAuthRateLimit()    — database-backed (auth / payment endpoints, survives restarts)
 *
 * No Redis required. Swap checkRateLimit() for Redis when scaling up.
 */
import { prisma } from '@/db/prisma';

/**
 * DB-backed rate limit for auth/payment endpoints.
 * Uses the RateLimitRecord table — persists across serverless cold starts.
 * Falls back to in-memory if DB is unavailable.
 */
export async function checkAuthRateLimit(
  identifier: string,
  endpoint: string,
  maxAttempts = 5,
  windowMinutes = 15
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
  const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);

  try {
    // Upsert the count for this identifier+endpoint within the current window
    const record = await prisma.rateLimitRecord.upsert({
      where: {
        identifier_endpoint_windowStart: { identifier, endpoint, windowStart },
      },
      update: { count: { increment: 1 } },
      create: { identifier, endpoint, count: 1, windowStart, windowEnd },
    });

    // Clean up expired records periodically (1% chance)
    if (Math.random() < 0.01) {
      await prisma.rateLimitRecord.deleteMany({ where: { windowEnd: { lt: now } } }).catch(() => {});
    }

    const remaining = Math.max(0, maxAttempts - record.count);
    return {
      allowed: record.count <= maxAttempts,
      remaining,
      resetIn: windowEnd.getTime() - now.getTime(),
    };
  } catch {
    // DB unavailable — fall back to in-memory check
    return checkRateLimit(`${identifier}:${endpoint}`, RATE_LIMIT_CONFIGS.authStrict);
  }
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 min
  authStrict: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 attempts per hour (for 2FA)
  api: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  sensitive: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
} as const;

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  remaining: number,
  resetIn: number,
  limit: number
): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(resetIn / 1000).toString());
  return headers;
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Reset rate limit for a specific identifier (useful after successful auth)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
