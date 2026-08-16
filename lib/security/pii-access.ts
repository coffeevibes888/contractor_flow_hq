/**
 * Logs when a super-admin or admin views another user's sensitive data (lease
 * documents, applications, bank info, SSNs, etc.). Required for SOC 2 and
 * most data-privacy reviews and is the first thing regulators ask about after
 * a breach.
 *
 * Call this from any route handler that renders PII, not from client code.
 */

import { prisma } from '@/db/prisma';

export type SensitiveResource =
  | 'lease_document'
  | 'tenant_application'
  | 'bank_account'
  | 'ssn'
  | 'payment_method'
  | 'user_profile'
  | 'landlord_profile'
  | 'contractor_profile'
  | 'audit_log'
  | 'other';

export interface LogPIIAccessInput {
  actorUserId: string;
  subjectUserId?: string | null;
  subjectLandlordId?: string | null;
  resourceType: SensitiveResource | string;
  resourceId?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logPIIAccess(input: LogPIIAccessInput) {
  try {
    await prisma.sensitivePIIAccess.create({
      data: {
        actorUserId: input.actorUserId,
        subjectUserId: input.subjectUserId ?? undefined,
        subjectLandlordId: input.subjectLandlordId ?? undefined,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? undefined,
        reason: input.reason ?? undefined,
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    });
  } catch (error) {
    // Instrumentation must not break request paths.
    console.error('logPIIAccess failed', error);
  }
}
