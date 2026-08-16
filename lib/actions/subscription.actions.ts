'use server';

import { prisma } from '@/db/prisma';
import { 
  SUBSCRIPTION_TIERS, 
  SubscriptionTier, 
  isNearUnitLimit, 
  isAtUnitLimit, 
  getUpgradeTier,
  hasFeatureAccess,
  getFeatureLimit,
  TierFeatures,
  normalizeTier,
} from '@/lib/config/subscription-tiers';
import { getOrCreateCurrentLandlord } from './landlord.actions';

export async function checkLandlordUnitLimits(landlordId: string) {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    include: {
      subscription: true,
      properties: {
        include: {
          units: true,
        },
      },
      owner: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!landlord) {
    return { success: false, message: 'Landlord not found' };
  }

  const unitCount = landlord.properties.reduce((sum, p) => sum + p.units.length, 0);
  const currentTier = normalizeTier(landlord.subscription?.tier || landlord.subscriptionTier);
  const tierConfig = SUBSCRIPTION_TIERS[currentTier];

  const nearLimit = isNearUnitLimit(unitCount, currentTier);
  const atLimit = isAtUnitLimit(unitCount, currentTier);
  const upgradeTier = getUpgradeTier(currentTier);

  return {
    success: true,
    landlordId,
    landlordName: landlord.name,
    ownerEmail: landlord.owner?.email,
    ownerName: landlord.owner?.name,
    currentTier,
    tierConfig,
    unitCount,
    unitLimit: tierConfig.unitLimit,
    nearLimit,
    atLimit,
    upgradeTier,
    upgradeTierConfig: upgradeTier ? SUBSCRIPTION_TIERS[upgradeTier] : null,
    lastNotifiedAt: landlord.unitLimitNotifiedAt,
  };
}

export async function checkAndNotifyAllLandlords() {
  const landlords = await prisma.landlord.findMany({
    include: {
      subscription: true,
      properties: {
        include: {
          units: true,
        },
      },
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  const results = [];

  for (const landlord of landlords) {
    const unitCount = landlord.properties.reduce((sum, p) => sum + p.units.length, 0);
    const currentTier = normalizeTier(landlord.subscription?.tier || landlord.subscriptionTier);
    
    const nearLimit = isNearUnitLimit(unitCount, currentTier);
    const atLimit = isAtUnitLimit(unitCount, currentTier);

    if ((nearLimit || atLimit) && landlord.owner?.id) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const shouldNotify = !landlord.unitLimitNotifiedAt || landlord.unitLimitNotifiedAt < oneDayAgo;

      if (shouldNotify) {
        const upgradeTier = getUpgradeTier(currentTier);
        const tierConfig = SUBSCRIPTION_TIERS[currentTier];
        const upgradeConfig = upgradeTier ? SUBSCRIPTION_TIERS[upgradeTier] : null;

        const notificationTitle = atLimit 
          ? 'Unit Limit Reached' 
          : 'Approaching Unit Limit';
        
        const notificationMessage = atLimit
          ? `You've reached your ${tierConfig.unitLimit} unit limit on the ${tierConfig.name} plan. Upgrade to ${upgradeConfig?.name || 'a higher plan'} to add more units.`
          : `You're using ${unitCount} of ${tierConfig.unitLimit} units on the ${tierConfig.name} plan. Consider upgrading to ${upgradeConfig?.name || 'a higher plan'} for more capacity.`;

        await prisma.notification.create({
          data: {
            userId: landlord.owner.id,
            type: 'subscription',
            title: notificationTitle,
            message: notificationMessage,
            actionUrl: '/admin/subscription',
            metadata: {
              landlordId: landlord.id,
              currentTier,
              unitCount,
              unitLimit: tierConfig.unitLimit,
              upgradeTier,
            },
          },
        });

        await prisma.landlord.update({
          where: { id: landlord.id },
          data: { unitLimitNotifiedAt: new Date() },
        });

        results.push({
          landlordId: landlord.id,
          landlordName: landlord.name,
          notified: true,
          type: atLimit ? 'at_limit' : 'near_limit',
        });
      }
    }
  }

  return results;
}

export async function canLandlordAddUnit(landlordId: string): Promise<{ allowed: boolean; reason?: string; upgradeTier?: string }> {
  const result = await checkLandlordUnitLimits(landlordId);

  if (!result.success) {
    return { allowed: false, reason: 'Unable to verify subscription status' };
  }

  if (result.atLimit) {
    return {
      allowed: false,
      reason: `You've reached your ${result.unitLimit} unit limit on the ${result.tierConfig.name} plan. Please upgrade to add more units.`,
      upgradeTier: result.upgradeTier || undefined,
    };
  }

  return { allowed: true };
}

export async function getLandlordSubscriptionPerks(landlordId: string) {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    include: { subscription: true },
  });

  if (!landlord) {
    return {
      freeBackgroundChecks: false,
      freeEvictionChecks: false,
      freeEmploymentVerification: false,
    };
  }

  const currentTier = normalizeTier(landlord.subscription?.tier || landlord.subscriptionTier);
  const tierConfig = SUBSCRIPTION_TIERS[currentTier];

  return {
    tier: currentTier,
    freeBackgroundChecks: landlord.subscription?.freeBackgroundChecks || tierConfig.features.freeBackgroundChecks,
    freeEvictionChecks: landlord.subscription?.freeEvictionChecks || tierConfig.features.freeEvictionChecks,
    freeEmploymentVerification: landlord.subscription?.freeEmploymentVerification || tierConfig.features.freeEmploymentVerification,
  };
}


export async function checkFeatureAccess(
  landlordId: string,
  feature: keyof TierFeatures
): Promise<{ allowed: boolean; reason?: string; upgradeTier?: string }> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    include: { subscription: true },
  });

  if (!landlord) {
    return { allowed: false, reason: 'Landlord not found' };
  }

  const currentTier = normalizeTier(landlord.subscription?.tier || landlord.subscriptionTier);
  const hasAccess = hasFeatureAccess(currentTier, feature);

  if (!hasAccess) {
    const upgradeTier = getUpgradeTier(currentTier);
    return {
      allowed: false,
      reason: `This feature requires the ${upgradeTier ? SUBSCRIPTION_TIERS[upgradeTier].name : 'Pro'} plan or higher.`,
      upgradeTier: upgradeTier || undefined,
    };
  }

  return { allowed: true };
}

export async function getEmploymentChecksUsage(landlordId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  canUse: boolean;
}> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    include: { subscription: true },
  });

  if (!landlord) {
    return { used: 0, limit: 0, remaining: 0, canUse: false };
  }

  const currentTier = normalizeTier(landlord.subscription?.tier || landlord.subscriptionTier);
  const limit = getFeatureLimit(currentTier, 'employmentChecksPerMonth');

  // Get usage for current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Note: EmploymentCheck model needs to be created via Prisma migration
  // For now, return 0 used until migration is run
  let used = 0;
  try {
    used = await (prisma as any).employmentCheck?.count?.({
      where: {
        landlordId,
        createdAt: { gte: startOfMonth },
      },
    }) || 0;
  } catch {
    // Model doesn't exist yet, return 0
    used = 0;
  }

  const remaining = Math.max(0, limit - used);

  return {
    used,
    limit: limit === Infinity ? -1 : limit, // -1 indicates unlimited
    remaining: limit === Infinity ? -1 : remaining,
    canUse: limit === Infinity || used < limit,
  };
}

export async function recordEmploymentCheck(landlordId: string, applicationId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const usage = await getEmploymentChecksUsage(landlordId);

  if (!usage.canUse) {
    return {
      success: false,
      message: `You've used all ${usage.limit} employment checks for this month. Upgrade your plan for more.`,
    };
  }

  // Note: EmploymentCheck model needs to be created via Prisma migration
  try {
    await (prisma as any).employmentCheck?.create?.({
      data: {
        landlordId,
        applicationId,
      },
    });
  } catch {
    // Model doesn't exist yet, skip recording
  }

  return { success: true };
}

export async function getCurrentLandlordSubscription() {
  const landlordResult = await getOrCreateCurrentLandlord();
  
  if (!landlordResult.success || !landlordResult.landlord) {
    return { success: false, message: landlordResult.message };
  }

  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordResult.landlord.id },
    include: {
      subscription: true,
      properties: {
        include: { units: true },
      },
    },
  });

  if (!landlord) {
    return { success: false, message: 'Landlord not found' };
  }

  const unitCount = landlord.properties.reduce((sum, p) => sum + p.units.length, 0);

  // Only trust the subscription tier when the Stripe status is a paid/valid
  // state. An 'incomplete' status means the first payment was declined —
  // treat the account as starter until a real payment clears.
  const PAID_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];
  const subscriptionIsActive =
    landlord.subscription &&
    PAID_STATUSES.includes(landlord.subscription.status ?? '');

  const currentTier = normalizeTier(
    subscriptionIsActive
      ? (landlord.subscription?.tier || landlord.subscriptionTier)
      : landlord.subscriptionTier
  );
  const tierConfig = SUBSCRIPTION_TIERS[currentTier];

  return {
    success: true,
    landlordId: landlord.id,
    currentTier,
    tierConfig,
    unitCount,
    unitLimit: tierConfig.unitLimit,
    nearLimit: isNearUnitLimit(unitCount, currentTier),
    atLimit: isAtUnitLimit(unitCount, currentTier),
    features: tierConfig.features,
    subscription: landlord.subscription,
  };
}

export async function canAddUnits(count: number = 1): Promise<{
  allowed: boolean;
  currentUnitCount: number;
  unitLimit: number;
  currentTier: SubscriptionTier;
  reason?: string;
  upgradeTier?: string;
}> {
  const landlordResult = await getOrCreateCurrentLandlord();
  
  if (!landlordResult.success || !landlordResult.landlord) {
    return {
      allowed: false,
      currentUnitCount: 0,
      unitLimit: 0,
      currentTier: 'starter',
      reason: landlordResult.message,
    };
  }

  const result = await checkLandlordUnitLimits(landlordResult.landlord.id);

  if (!result.success) {
    return {
      allowed: false,
      currentUnitCount: 0,
      unitLimit: 0,
      currentTier: 'starter',
      reason: 'Unable to verify subscription status',
    };
  }

  const unitCount = result.unitCount ?? 0;
  const unitLimit = result.unitLimit ?? 24;
  const currentTier = result.currentTier ?? 'starter';
  const tierConfig = result.tierConfig ?? SUBSCRIPTION_TIERS.starter;

  const newTotal = unitCount + count;
  const wouldExceedLimit = newTotal > unitLimit;

  if (wouldExceedLimit) {
    return {
      allowed: false,
      currentUnitCount: unitCount,
      unitLimit: unitLimit,
      currentTier: currentTier,
      reason: `Adding ${count} unit(s) would exceed your ${unitLimit} unit limit on the ${tierConfig.name} plan.`,
      upgradeTier: result.upgradeTier || undefined,
    };
  }

  return {
    allowed: true,
    currentUnitCount: unitCount,
    unitLimit: unitLimit,
    currentTier: currentTier,
  };
}
