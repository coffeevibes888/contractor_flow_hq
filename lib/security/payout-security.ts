/**
 * Payout Security Module
 * 
 * Additional security measures for landlord payouts to prevent fraud:
 * 1. Rate limiting on payout requests
 * 2. Velocity checks (unusual payout patterns)
 * 3. Email verification for new payout methods
 * 4. Cooling-off period for new bank accounts
 * 5. IP tracking for suspicious activity
 * 6. Two-factor confirmation for large payouts
 */

import { prisma } from '@/db/prisma';
import { PAYOUT_SECURITY } from '@/lib/config/payout-security';

interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  requiresVerification?: boolean;
  verificationType?: 'email' | 'sms' | 'large_amount';
}

/**
 * Check if a payout method is within the cooling-off period
 */
export async function checkPayoutMethodCooloff(
  payoutMethodId: string
): Promise<SecurityCheckResult> {
  const method = await prisma.savedPayoutMethod.findUnique({
    where: { id: payoutMethodId },
  });

  if (!method) {
    return { allowed: false, reason: 'Payout method not found' };
  }

  const hoursSinceCreation = 
    (Date.now() - method.createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation < PAYOUT_SECURITY.NEW_METHOD_COOLOFF_HOURS) {
    const hoursRemaining = Math.ceil(
      PAYOUT_SECURITY.NEW_METHOD_COOLOFF_HOURS - hoursSinceCreation
    );
    return {
      allowed: false,
      reason: `New payout methods have a ${PAYOUT_SECURITY.NEW_METHOD_COOLOFF_HOURS}-hour security hold. ${hoursRemaining} hours remaining.`,
    };
  }

  return { allowed: true };
}

/**
 * Check daily payout limits
 */
export async function checkDailyPayoutLimits(
  landlordId: string,
  requestedAmount: number
): Promise<SecurityCheckResult> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Count today's payouts
  const todaysPayouts = await prisma.payout.findMany({
    where: {
      landlordId,
      initiatedAt: { gte: startOfDay },
      status: { in: ['pending', 'paid'] },
    },
  });

  const payoutCount = todaysPayouts.length;
  const totalPayoutAmount = todaysPayouts.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  // Check count limit
  if (payoutCount >= PAYOUT_SECURITY.MAX_PAYOUTS_PER_DAY) {
    return {
      allowed: false,
      reason: `Daily payout limit reached (${PAYOUT_SECURITY.MAX_PAYOUTS_PER_DAY} per day). Try again tomorrow.`,
    };
  }

  // Check amount limit
  if (totalPayoutAmount + requestedAmount > PAYOUT_SECURITY.MAX_DAILY_PAYOUT_AMOUNT) {
    const remaining = PAYOUT_SECURITY.MAX_DAILY_PAYOUT_AMOUNT - totalPayoutAmount;
    return {
      allowed: false,
      reason: `Daily payout amount limit reached. Maximum remaining today: $${remaining.toFixed(2)}`,
    };
  }

  return { allowed: true };
}

/**
 * Check if amount requires additional verification
 */
export function checkLargePayoutVerification(
  amount: number
): SecurityCheckResult {
  if (amount >= PAYOUT_SECURITY.LARGE_PAYOUT_THRESHOLD) {
    return {
      allowed: true,
      requiresVerification: true,
      verificationType: 'large_amount',
      reason: `Payouts over $${PAYOUT_SECURITY.LARGE_PAYOUT_THRESHOLD} require email confirmation.`,
    };
  }

  return { allowed: true };
}

/**
 * Log payout attempt for audit trail
 */
export async function logPayoutAttempt(data: {
  landlordId: string;
  amount: number;
  payoutMethodId: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'blocked';
  reason?: string;
}) {
  try {
    // Store metadata as JSON string since that's what the schema expects
    const metadata = JSON.stringify({
      amount: data.amount,
      status: data.status,
      reason: data.reason,
      timestamp: new Date().toISOString(),
    });

    await prisma.auditLog.create({
      data: {
        userId: data.landlordId,
        action: 'PAYOUT_ATTEMPT',
        resourceType: 'payout',
        resourceId: data.payoutMethodId,
        metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        severity: data.status === 'blocked' ? 'WARNING' : 'INFO',
      },
    });
  } catch (error) {
    // Don't fail the payout if audit logging fails
    console.error('Failed to log payout attempt:', error);
  }
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(
  landlordId: string
): Promise<SecurityCheckResult> {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check for recent failed attempts by looking at audit logs
  // Since metadata is a string, we need to filter in application code
  const recentLogs = await prisma.auditLog.findMany({
    where: {
      userId: landlordId,
      action: 'PAYOUT_ATTEMPT',
      createdAt: { gte: last24Hours },
    },
  });

  // Count failed attempts from the logs
  const failedAttempts = recentLogs.filter(log => {
    if (!log.metadata) return false;
    try {
      const meta = JSON.parse(log.metadata);
      return meta.status === 'failed' || meta.status === 'blocked';
    } catch {
      return false;
    }
  }).length;

  if (failedAttempts >= PAYOUT_SECURITY.MAX_FAILED_ATTEMPTS_BEFORE_LOCK) {
    return {
      allowed: false,
      reason: 'Account temporarily locked due to multiple failed payout attempts. Please contact support.',
    };
  }

  // Check for unusual patterns (multiple new payout methods)
  const recentNewMethods = await prisma.savedPayoutMethod.count({
    where: {
      landlordId,
      createdAt: { gte: last24Hours },
    },
  });

  if (recentNewMethods >= 3) {
    return {
      allowed: false,
      reason: 'Unusual activity detected. Please contact support to verify your account.',
    };
  }

  return { allowed: true };
}

/**
 * Run all security checks before allowing a payout
 */
export async function runPayoutSecurityChecks(params: {
  landlordId: string;
  amount: number;
  payoutMethodId: string;
  ipAddress?: string;
}): Promise<SecurityCheckResult> {
  // 1. Check for suspicious activity
  const suspiciousCheck = await checkSuspiciousActivity(params.landlordId);
  if (!suspiciousCheck.allowed) {
    await logPayoutAttempt({
      ...params,
      status: 'blocked',
      reason: suspiciousCheck.reason,
    });
    return suspiciousCheck;
  }

  // 2. Check payout method cooling-off period
  const cooloffCheck = await checkPayoutMethodCooloff(params.payoutMethodId);
  if (!cooloffCheck.allowed) {
    await logPayoutAttempt({
      ...params,
      status: 'blocked',
      reason: cooloffCheck.reason,
    });
    return cooloffCheck;
  }

  // 3. Check daily limits
  const limitsCheck = await checkDailyPayoutLimits(params.landlordId, params.amount);
  if (!limitsCheck.allowed) {
    await logPayoutAttempt({
      ...params,
      status: 'blocked',
      reason: limitsCheck.reason,
    });
    return limitsCheck;
  }

  // 4. Check if large payout needs verification
  const largePayoutCheck = checkLargePayoutVerification(params.amount);
  if (largePayoutCheck.requiresVerification) {
    return largePayoutCheck;
  }

  return { allowed: true };
}
