/**
 * Custom Error Classes for Contractor Subscription System
 * 
 * These error classes provide structured error handling for subscription-related
 * operations, including limit enforcement, feature access, and subscription status.
 */

/**
 * Error thrown when a contractor reaches their subscription limit
 */
export class SubscriptionLimitError extends Error {
  public readonly name = 'SubscriptionLimitError';
  public readonly statusCode = 403;

  constructor(
    public readonly feature: string,
    public readonly current: number,
    public readonly limit: number,
    public readonly tier: string
  ) {
    super(`Subscription limit reached for ${feature}`);
    Object.setPrototypeOf(this, SubscriptionLimitError.prototype);
  }

  toJSON() {
    return {
      error: 'SUBSCRIPTION_LIMIT_REACHED',
      message: this.message,
      feature: this.feature,
      current: this.current,
      limit: this.limit,
      tier: this.tier,
      upgradeUrl: '/contractor/settings/subscription',
      upgradeRequired: this.tier === 'starter' ? 'pro' : 'enterprise',
    };
  }
}

/**
 * Error thrown when a contractor tries to access a locked feature
 */
export class FeatureLockedError extends Error {
  public readonly name = 'FeatureLockedError';
  public readonly statusCode = 403;

  constructor(
    public readonly feature: string,
    public readonly requiredTier: string,
    public readonly currentTier: string
  ) {
    super(`Feature '${feature}' requires ${requiredTier} tier`);
    Object.setPrototypeOf(this, FeatureLockedError.prototype);
  }

  toJSON() {
    return {
      error: 'FEATURE_LOCKED',
      message: this.message,
      feature: this.feature,
      requiredTier: this.requiredTier,
      currentTier: this.currentTier,
      upgradeUrl: '/contractor/settings/subscription',
    };
  }
}

/**
 * Error thrown when a contractor's subscription has expired
 */
export class SubscriptionExpiredError extends Error {
  public readonly name = 'SubscriptionExpiredError';
  public readonly statusCode = 402;

  constructor(
    public readonly contractorId: string,
    public readonly expiredAt: Date
  ) {
    super('Your subscription has expired');
    Object.setPrototypeOf(this, SubscriptionExpiredError.prototype);
  }

  toJSON() {
    return {
      error: 'SUBSCRIPTION_EXPIRED',
      message: this.message,
      contractorId: this.contractorId,
      expiredAt: this.expiredAt.toISOString(),
      renewUrl: '/contractor/settings/subscription',
    };
  }
}

/**
 * Error thrown when subscription data is invalid or missing
 */
export class SubscriptionDataError extends Error {
  public readonly name = 'SubscriptionDataError';
  public readonly statusCode = 500;

  constructor(
    public readonly contractorId: string,
    public readonly reason: string
  ) {
    super(`Subscription data error: ${reason}`);
    Object.setPrototypeOf(this, SubscriptionDataError.prototype);
  }

  toJSON() {
    return {
      error: 'SUBSCRIPTION_DATA_ERROR',
      message: this.message,
      contractorId: this.contractorId,
      reason: this.reason,
    };
  }
}

/**
 * Type guard to check if an error is a subscription-related error
 */
export function isSubscriptionError(
  error: unknown
): error is SubscriptionLimitError | FeatureLockedError | SubscriptionExpiredError | SubscriptionDataError {
  return (
    error instanceof SubscriptionLimitError ||
    error instanceof FeatureLockedError ||
    error instanceof SubscriptionExpiredError ||
    error instanceof SubscriptionDataError
  );
}

/**
 * Format error for API response
 */
export function formatSubscriptionError(error: unknown) {
  if (isSubscriptionError(error)) {
    return {
      status: error.statusCode,
      body: error.toJSON(),
    };
  }

  // Unknown error - return generic error
  return {
    status: 500,
    body: {
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    },
  };
}

/**
 * Log subscription error with context
 */
export function logSubscriptionError(
  error: unknown,
  context: {
    contractorId?: string;
    feature?: string;
    action?: string;
    [key: string]: unknown;
  }
) {
  const timestamp = new Date().toISOString();
  const errorData = {
    timestamp,
    ...context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  };

  // Log to console (in production, this would go to a logging service)
  console.error('[Subscription Error]', JSON.stringify(errorData, null, 2));

  // In production, you would send this to a logging service like:
  // - Sentry
  // - LogRocket
  // - DataDog
  // - CloudWatch
  // etc.
}

/**
 * Create a user-friendly error message for display
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof SubscriptionLimitError) {
    return `You've reached your ${error.feature} limit (${error.current}/${error.limit}). Upgrade to ${error.tier === 'starter' ? 'Pro' : 'Enterprise'} for more capacity.`;
  }

  if (error instanceof FeatureLockedError) {
    return `This feature requires a ${error.requiredTier} subscription. Upgrade to unlock ${error.feature}.`;
  }

  if (error instanceof SubscriptionExpiredError) {
    return 'Your subscription has expired. Please renew to continue using premium features.';
  }

  if (error instanceof SubscriptionDataError) {
    return 'There was an issue with your subscription. Please contact support.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Retry wrapper for operations that might fail temporarily
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, onRetry } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry subscription errors - they're not transient
      if (isSubscriptionError(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        onRetry?.(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError!;
}
