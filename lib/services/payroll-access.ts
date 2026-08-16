/**
 * Plan-based access for the Treasury payroll feature.
 *
 *   - 'none'  — Starter (no payroll at all; <PayrollLockedCard /> in UI)
 *   - 'basic' — Pro     (manual Pay Now, history, 1099 badge; team cap = 5)
 *   - 'full'  — Enterprise (basic + pay schedule + overtime calc + CSV)
 *
 * Replaces the prior `assertEnterprisePlan()` approach so each feature
 * is gated individually based on the returned level.
 */

import 'server-only';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { normalizeTier } from '@/lib/config/subscription-tiers';

export type PayrollAccessLevel = 'none' | 'basic' | 'full';

interface AccessResult {
  level: PayrollAccessLevel;
  tier: 'starter' | 'pro' | 'enterprise';
  landlordId: string | null;
  /** True when caller is the landlord-owner. Payroll is owner-only. */
  isOwner: boolean;
  /** Convenience: throws if level === 'none'. Use for hard gates. */
  assertAtLeastBasic: () => void;
  assertFull: () => void;
}

/**
 * Resolve payroll access for the signed-in user. Reads the landlord's
 * effective subscription tier (subscription.tier wins over the legacy
 * landlord.subscriptionTier column) and maps it to a level.
 */
export async function getPayrollAccess(): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return buildResult('none', 'starter', null, false);
  }

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
    select: {
      id: true,
      ownerUserId: true,
      subscriptionTier: true,
      subscription: { select: { tier: true } },
    },
  });

  if (!landlord) {
    // No landlord row → caller is not the PM. Payroll is owner-only.
    return buildResult('none', 'starter', null, false);
  }

  const tier = normalizeTier(
    landlord.subscription?.tier || landlord.subscriptionTier || 'starter'
  );
  const isOwner = landlord.ownerUserId === session.user.id;

  let level: PayrollAccessLevel = 'none';
  if (isOwner) {
    if (tier === 'enterprise') level = 'full';
    else if (tier === 'pro') level = 'basic';
  }

  return buildResult(level, tier, landlord.id, isOwner);
}

function buildResult(
  level: PayrollAccessLevel,
  tier: 'starter' | 'pro' | 'enterprise',
  landlordId: string | null,
  isOwner: boolean
): AccessResult {
  return {
    level,
    tier,
    landlordId,
    isOwner,
    assertAtLeastBasic() {
      if (level === 'none') {
        throw new PayrollAccessError(
          'plan_required',
          'Payroll requires the Pro or Enterprise plan.'
        );
      }
      if (!isOwner) {
        throw new PayrollAccessError(
          'owner_only',
          'Only the account owner can run payroll.'
        );
      }
    },
    assertFull() {
      if (level !== 'full') {
        throw new PayrollAccessError(
          'enterprise_required',
          'This payroll feature requires the Enterprise plan.'
        );
      }
      if (!isOwner) {
        throw new PayrollAccessError(
          'owner_only',
          'Only the account owner can run payroll.'
        );
      }
    },
  };
}

export type PayrollAccessErrorCode =
  | 'plan_required'
  | 'enterprise_required'
  | 'owner_only';

export class PayrollAccessError extends Error {
  constructor(
    public code: PayrollAccessErrorCode,
    public userMessage: string
  ) {
    super(userMessage);
  }
}
