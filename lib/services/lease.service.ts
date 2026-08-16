/**
 * Lease Service
 * 
 * Provides lease-related business logic including immutability checks
 * after signing has begun.
 */

import { prisma } from '@/db/prisma';

export interface LeaseImmutabilityCheckResult {
  isImmutable: boolean;
  reason?: string;
  tenantSigned: boolean;
  landlordSigned: boolean;
}

/**
 * Check if a lease is immutable (cannot be modified)
 * A lease becomes immutable once any party has signed it.
 * 
 * Property 26: Lease Immutability After Signing
 * For any lease with at least one signature applied, attempts to modify 
 * lease terms (rent, dates, etc.) SHALL be rejected with an error.
 * 
 * @param leaseId - The ID of the lease to check
 * @returns Object indicating if lease is immutable and why
 */
export async function checkLeaseImmutability(leaseId: string): Promise<LeaseImmutabilityCheckResult> {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    select: {
      tenantSignedAt: true,
      landlordSignedAt: true,
    },
  });

  if (!lease) {
    return {
      isImmutable: false,
      tenantSigned: false,
      landlordSigned: false,
    };
  }

  const tenantSigned = !!lease.tenantSignedAt;
  const landlordSigned = !!lease.landlordSignedAt;
  const isImmutable = tenantSigned || landlordSigned;

  let reason: string | undefined;
  if (isImmutable) {
    if (tenantSigned && landlordSigned) {
      reason = 'Lease is fully executed and cannot be modified';
    } else if (tenantSigned) {
      reason = 'Lease has been signed by tenant and cannot be modified';
    } else {
      reason = 'Lease has been signed by landlord and cannot be modified';
    }
  }

  return {
    isImmutable,
    reason,
    tenantSigned,
    landlordSigned,
  };
}

/**
 * Validate that a lease can be modified
 * Throws an error if the lease is immutable
 * 
 * @param leaseId - The ID of the lease to validate
 * @throws Error if lease is immutable
 */
export async function validateLeaseModification(leaseId: string): Promise<void> {
  const result = await checkLeaseImmutability(leaseId);
  
  if (result.isImmutable) {
    const error = new Error(result.reason || 'Lease cannot be modified after signing');
    (error as any).code = 'LEASE_IMMUTABLE';
    throw error;
  }
}

export interface UpdateLeaseTermsInput {
  leaseId: string;
  rentAmount?: number;
  startDate?: Date;
  endDate?: Date | null;
  billingDayOfMonth?: number;
}

/**
 * Update lease terms with immutability check
 * 
 * @param input - The lease update input
 * @returns Updated lease
 * @throws Error if lease is immutable
 */
export async function updateLeaseTerms(input: UpdateLeaseTermsInput) {
  const { leaseId, ...updates } = input;

  // Check immutability first
  await validateLeaseModification(leaseId);

  // Build update data
  const updateData: Record<string, any> = {};
  if (updates.rentAmount !== undefined) {
    updateData.rentAmount = updates.rentAmount;
  }
  if (updates.startDate !== undefined) {
    updateData.startDate = updates.startDate;
  }
  if (updates.endDate !== undefined) {
    updateData.endDate = updates.endDate;
  }
  if (updates.billingDayOfMonth !== undefined) {
    updateData.billingDayOfMonth = updates.billingDayOfMonth;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No updates provided');
  }

  return prisma.lease.update({
    where: { id: leaseId },
    data: updateData,
  });
}
