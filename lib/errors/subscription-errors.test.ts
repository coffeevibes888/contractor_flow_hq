import {
  SubscriptionLimitError,
  FeatureLockedError,
  SubscriptionExpiredError,
  SubscriptionDataError,
  isSubscriptionError,
  formatSubscriptionError,
  getUserFriendlyMessage,
  retryOperation,
} from './subscription-errors';

describe('SubscriptionLimitError', () => {
  it('should create error with correct properties', () => {
    const error = new SubscriptionLimitError('jobs', 15, 15, 'starter');

    expect(error.name).toBe('SubscriptionLimitError');
    expect(error.feature).toBe('jobs');
    expect(error.current).toBe(15);
    expect(error.limit).toBe(15);
    expect(error.tier).toBe('starter');
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Subscription limit reached for jobs');
  });

  it('should serialize to JSON correctly', () => {
    const error = new SubscriptionLimitError('invoices', 50, 50, 'pro');
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'SUBSCRIPTION_LIMIT_REACHED',
      message: 'Subscription limit reached for invoices',
      feature: 'invoices',
      current: 50,
      limit: 50,
      tier: 'pro',
      upgradeUrl: '/contractor/settings/subscription',
      upgradeRequired: 'enterprise',
    });
  });

  it('should suggest pro upgrade for starter tier', () => {
    const error = new SubscriptionLimitError('jobs', 15, 15, 'starter');
    const json = error.toJSON();

    expect(json.upgradeRequired).toBe('pro');
  });

  it('should suggest enterprise upgrade for pro tier', () => {
    const error = new SubscriptionLimitError('invoices', 50, 50, 'pro');
    const json = error.toJSON();

    expect(json.upgradeRequired).toBe('enterprise');
  });
});

describe('FeatureLockedError', () => {
  it('should create error with correct properties', () => {
    const error = new FeatureLockedError('crm', 'pro', 'starter');

    expect(error.name).toBe('FeatureLockedError');
    expect(error.feature).toBe('crm');
    expect(error.requiredTier).toBe('pro');
    expect(error.currentTier).toBe('starter');
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("Feature 'crm' requires pro tier");
  });

  it('should serialize to JSON correctly', () => {
    const error = new FeatureLockedError('analytics', 'enterprise', 'pro');
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'FEATURE_LOCKED',
      message: "Feature 'analytics' requires enterprise tier",
      feature: 'analytics',
      requiredTier: 'enterprise',
      currentTier: 'pro',
      upgradeUrl: '/contractor/settings/subscription',
    });
  });
});

describe('SubscriptionExpiredError', () => {
  it('should create error with correct properties', () => {
    const expiredAt = new Date('2024-01-01');
    const error = new SubscriptionExpiredError('contractor-123', expiredAt);

    expect(error.name).toBe('SubscriptionExpiredError');
    expect(error.contractorId).toBe('contractor-123');
    expect(error.expiredAt).toBe(expiredAt);
    expect(error.statusCode).toBe(402);
    expect(error.message).toBe('Your subscription has expired');
  });

  it('should serialize to JSON correctly', () => {
    const expiredAt = new Date('2024-01-01T00:00:00.000Z');
    const error = new SubscriptionExpiredError('contractor-123', expiredAt);
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'SUBSCRIPTION_EXPIRED',
      message: 'Your subscription has expired',
      contractorId: 'contractor-123',
      expiredAt: '2024-01-01T00:00:00.000Z',
      renewUrl: '/contractor/settings/subscription',
    });
  });
});

describe('SubscriptionDataError', () => {
  it('should create error with correct properties', () => {
    const error = new SubscriptionDataError('contractor-123', 'Missing usage tracking data');

    expect(error.name).toBe('SubscriptionDataError');
    expect(error.contractorId).toBe('contractor-123');
    expect(error.reason).toBe('Missing usage tracking data');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Subscription data error: Missing usage tracking data');
  });

  it('should serialize to JSON correctly', () => {
    const error = new SubscriptionDataError('contractor-123', 'Invalid tier');
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'SUBSCRIPTION_DATA_ERROR',
      message: 'Subscription data error: Invalid tier',
      contractorId: 'contractor-123',
      reason: 'Invalid tier',
    });
  });
});

describe('isSubscriptionError', () => {
  it('should return true for SubscriptionLimitError', () => {
    const error = new SubscriptionLimitError('jobs', 15, 15, 'starter');
    expect(isSubscriptionError(error)).toBe(true);
  });

  it('should return true for FeatureLockedError', () => {
    const error = new FeatureLockedError('crm', 'pro', 'starter');
    expect(isSubscriptionError(error)).toBe(true);
  });

  it('should return true for SubscriptionExpiredError', () => {
    const error = new SubscriptionExpiredError('contractor-123', new Date());
    expect(isSubscriptionError(error)).toBe(true);
  });

  it('should return true for SubscriptionDataError', () => {
    const error = new SubscriptionDataError('contractor-123', 'Invalid data');
    expect(isSubscriptionError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Regular error');
    expect(isSubscriptionError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isSubscriptionError('string')).toBe(false);
    expect(isSubscriptionError(null)).toBe(false);
    expect(isSubscriptionError(undefined)).toBe(false);
    expect(isSubscriptionError({})).toBe(false);
  });
});

describe('formatSubscriptionError', () => {
  it('should format SubscriptionLimitError correctly', () => {
    const error = new SubscriptionLimitError('jobs', 15, 15, 'starter');
    const formatted = formatSubscriptionError(error);

    expect(formatted.status).toBe(403);
    expect(formatted.body.error).toBe('SUBSCRIPTION_LIMIT_REACHED');
  });

  it('should format FeatureLockedError correctly', () => {
    const error = new FeatureLockedError('crm', 'pro', 'starter');
    const formatted = formatSubscriptionError(error);

    expect(formatted.status).toBe(403);
    expect(formatted.body.error).toBe('FEATURE_LOCKED');
  });

  it('should format SubscriptionExpiredError correctly', () => {
    const error = new SubscriptionExpiredError('contractor-123', new Date());
    const formatted = formatSubscriptionError(error);

    expect(formatted.status).toBe(402);
    expect(formatted.body.error).toBe('SUBSCRIPTION_EXPIRED');
  });

  it('should format unknown errors as internal server error', () => {
    const error = new Error('Unknown error');
    const formatted = formatSubscriptionError(error);

    expect(formatted.status).toBe(500);
    expect(formatted.body.error).toBe('INTERNAL_SERVER_ERROR');
    expect(formatted.body.message).toBe('Unknown error');
  });

  it('should handle non-Error objects', () => {
    const formatted = formatSubscriptionError('string error');

    expect(formatted.status).toBe(500);
    expect(formatted.body.error).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('getUserFriendlyMessage', () => {
  it('should return friendly message for SubscriptionLimitError', () => {
    const error = new SubscriptionLimitError('jobs', 15, 15, 'starter');
    const message = getUserFriendlyMessage(error);

    expect(message).toBe("You've reached your jobs limit (15/15). Upgrade to Pro for more capacity.");
  });

  it('should return friendly message for FeatureLockedError', () => {
    const error = new FeatureLockedError('crm', 'pro', 'starter');
    const message = getUserFriendlyMessage(error);

    expect(message).toBe('This feature requires a pro subscription. Upgrade to unlock crm.');
  });

  it('should return friendly message for SubscriptionExpiredError', () => {
    const error = new SubscriptionExpiredError('contractor-123', new Date());
    const message = getUserFriendlyMessage(error);

    expect(message).toBe('Your subscription has expired. Please renew to continue using premium features.');
  });

  it('should return friendly message for SubscriptionDataError', () => {
    const error = new SubscriptionDataError('contractor-123', 'Invalid data');
    const message = getUserFriendlyMessage(error);

    expect(message).toBe('There was an issue with your subscription. Please contact support.');
  });

  it('should return generic message for unknown errors', () => {
    const error = new Error('Unknown error');
    const message = getUserFriendlyMessage(error);

    expect(message).toBe('An unexpected error occurred. Please try again.');
  });
});

describe('retryOperation', () => {
  it('should return result on first success', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await retryOperation(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue('success');

    const result = await retryOperation(operation, { delayMs: 10 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

    await expect(
      retryOperation(operation, { maxRetries: 3, delayMs: 10 })
    ).rejects.toThrow('Persistent failure');

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry subscription errors', async () => {
    const error = new SubscriptionLimitError('jobs', 15, 15, 'starter');
    const operation = jest.fn().mockRejectedValue(error);

    await expect(
      retryOperation(operation, { maxRetries: 3, delayMs: 10 })
    ).rejects.toThrow(error);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValue('success');

    const onRetry = jest.fn();

    await retryOperation(operation, { maxRetries: 3, delayMs: 10, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error));
  });

  it('should use exponential backoff', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Failure'))
      .mockResolvedValue('success');

    const startTime = Date.now();
    await retryOperation(operation, { maxRetries: 2, delayMs: 100 });
    const endTime = Date.now();

    // Should wait at least 100ms (delayMs * attempt = 100 * 1)
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });
});
