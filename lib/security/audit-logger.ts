/**
 * Audit Logger for tracking sensitive operations
 * Logs financial transactions, auth events, and admin actions
 */

import { prisma } from '@/db/prisma';

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_SIGNUP'
  | 'AUTH_FAILED_LOGIN'
  | 'AUTH_2FA_ENABLED'
  | 'AUTH_2FA_DISABLED'
  | 'AUTH_2FA_VERIFIED'
  | 'AUTH_PASSWORD_RESET'
  | 'AUTH_PASSWORD_CHANGED'
  | 'AUTH_ROLE_PROMOTED'
  | 'AUTH_RATE_LIMITED'
  | 'TRIAL_ACCESS_BLOCKED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'PAYOUT_INITIATED'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  | 'LEASE_CREATED'
  | 'LEASE_SIGNED'
  | 'LEASE_TERMINATED'
  | 'TENANT_INVITED'
  | 'TENANT_REMOVED'
  | 'ADMIN_ACTION'
  | 'SETTINGS_CHANGED'
  | 'BANK_ACCOUNT_ADDED'
  | 'BANK_ACCOUNT_REMOVED'
  | 'SENSITIVE_DATA_ACCESSED';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  landlordId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        landlordId: entry.landlordId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        severity: entry.severity || 'INFO',
        createdAt: new Date(),
      },
    });
  } catch (error) {
    // Don't let audit logging failures break the main flow
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Log a financial transaction
 */
export async function logFinancialEvent(
  action: 'PAYMENT_INITIATED' | 'PAYMENT_COMPLETED' | 'PAYMENT_FAILED' | 'PAYOUT_INITIATED' | 'PAYOUT_COMPLETED' | 'PAYOUT_FAILED' | 'REFUND_INITIATED' | 'REFUND_COMPLETED',
  details: {
    userId?: string;
    landlordId?: string;
    amount: number;
    currency?: string;
    transactionId?: string;
    paymentMethod?: string;
    ipAddress?: string;
    userAgent?: string;
    additionalData?: Record<string, unknown>;
  }
): Promise<void> {
  await logAuditEvent({
    action,
    userId: details.userId,
    landlordId: details.landlordId,
    resourceType: 'transaction',
    resourceId: details.transactionId,
    metadata: {
      amount: details.amount,
      currency: details.currency || 'USD',
      paymentMethod: details.paymentMethod,
      ...details.additionalData,
    },
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    severity: action.includes('FAILED') ? 'WARNING' : 'INFO',
  });
}

/**
 * Log an authentication event
 */
export async function logAuthEvent(
  action: 'AUTH_LOGIN' | 'AUTH_LOGOUT' | 'AUTH_SIGNUP' | 'AUTH_FAILED_LOGIN' | 'AUTH_2FA_ENABLED' | 'AUTH_2FA_DISABLED' | 'AUTH_2FA_VERIFIED' | 'AUTH_PASSWORD_RESET' | 'AUTH_PASSWORD_CHANGED' | 'AUTH_ROLE_PROMOTED' | 'AUTH_RATE_LIMITED' | 'TRIAL_ACCESS_BLOCKED',
  details: {
    userId?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    failureReason?: string;
    role?: string;
  }
): Promise<void> {
  await logAuditEvent({
    action,
    userId: details.userId,
    resourceType: 'auth',
    metadata: {
      email: details.email,
      success: details.success,
      failureReason: details.failureReason,
      role: details.role,
    },
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    severity: action === 'AUTH_FAILED_LOGIN' || action === 'AUTH_RATE_LIMITED' || action === 'TRIAL_ACCESS_BLOCKED' ? 'WARNING' : 'INFO',
  });
}

/**
 * Get audit logs for a user or landlord
 */
export async function getAuditLogs(params: {
  userId?: string;
  landlordId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  
  if (params.userId) where.userId = params.userId;
  if (params.landlordId) where.landlordId = params.landlordId;
  if (params.action) where.action = params.action;
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) (where.createdAt as Record<string, Date>).gte = params.startDate;
    if (params.endDate) (where.createdAt as Record<string, Date>).lte = params.endDate;
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit || 50,
    skip: params.offset || 0,
  });
}
