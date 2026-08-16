import { prisma } from '@/db/prisma';

/**
 * Check and update trial status for a user
 * This runs inline when user accesses the system (no cron needed)
 */
export async function checkAndUpdateTrialStatus(
  userId: string,
  role: 'landlord' | 'contractor' | 'agent'
): Promise<{
  trialStatus: string;
  daysLeft: number;
  needsUpdate: boolean;
}> {
  const now = new Date();

  if (role === 'landlord') {
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: userId },
      select: {
        id: true,
        trialStatus: true,
        trialEndDate: true,
        stripeSubscriptionId: true,
      },
    });

    if (!landlord || landlord.stripeSubscriptionId) {
      return { trialStatus: 'active', daysLeft: 0, needsUpdate: false };
    }

    const trialEndDate = landlord.trialEndDate ? new Date(landlord.trialEndDate) : null;
    const daysLeft = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Check if trial has expired
    if (trialEndDate && trialEndDate < now && landlord.trialStatus === 'trialing') {
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { trialStatus: 'trial_expired' },
      });
      return { trialStatus: 'trial_expired', daysLeft: 0, needsUpdate: true };
    }

    // Check if should be suspended (3 days after expiration)
    const threeDaysAfterExpiry = trialEndDate ? new Date(trialEndDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
    if (threeDaysAfterExpiry && threeDaysAfterExpiry < now && landlord.trialStatus === 'trial_expired') {
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { trialStatus: 'suspended' },
      });
      return { trialStatus: 'suspended', daysLeft: 0, needsUpdate: true };
    }

    return { trialStatus: landlord.trialStatus, daysLeft, needsUpdate: false };
  }

  if (role === 'contractor') {
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId },
      select: {
        id: true,
        trialStatus: true,
        trialEndDate: true,
        stripeSubscriptionId: true,
      },
    });

    if (!contractor || contractor.stripeSubscriptionId) {
      return { trialStatus: 'active', daysLeft: 0, needsUpdate: false };
    }

    const trialEndDate = contractor.trialEndDate ? new Date(contractor.trialEndDate) : null;
    const daysLeft = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    if (trialEndDate && trialEndDate < now && contractor.trialStatus === 'trialing') {
      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: { trialStatus: 'trial_expired' },
      });
      return { trialStatus: 'trial_expired', daysLeft: 0, needsUpdate: true };
    }

    const threeDaysAfterExpiry = trialEndDate ? new Date(trialEndDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
    if (threeDaysAfterExpiry && threeDaysAfterExpiry < now && contractor.trialStatus === 'trial_expired') {
      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: { trialStatus: 'suspended' },
      });
      return { trialStatus: 'suspended', daysLeft: 0, needsUpdate: true };
    }

    return { trialStatus: contractor.trialStatus, daysLeft, needsUpdate: false };
  }

  if (role === 'agent') {
    const agent = await prisma.agent.findFirst({
      where: { userId },
      select: {
        id: true,
        trialStatus: true,
        trialEndDate: true,
        stripeSubscriptionId: true,
      },
    });

    if (!agent || agent.stripeSubscriptionId) {
      return { trialStatus: 'active', daysLeft: 0, needsUpdate: false };
    }

    const trialEndDate = agent.trialEndDate ? new Date(agent.trialEndDate) : null;
    const daysLeft = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    if (trialEndDate && trialEndDate < now && agent.trialStatus === 'trialing') {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { trialStatus: 'trial_expired' },
      });
      return { trialStatus: 'trial_expired', daysLeft: 0, needsUpdate: true };
    }

    const threeDaysAfterExpiry = trialEndDate ? new Date(trialEndDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
    if (threeDaysAfterExpiry && threeDaysAfterExpiry < now && agent.trialStatus === 'trial_expired') {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { trialStatus: 'suspended' },
      });
      return { trialStatus: 'suspended', daysLeft: 0, needsUpdate: true };
    }

    return { trialStatus: agent.trialStatus, daysLeft, needsUpdate: false };
  }

  return { trialStatus: 'active', daysLeft: 0, needsUpdate: false };
}

/**
 * Check if user should have read-only access
 */
export async function isReadOnlyMode(
  userId: string,
  role: string
): Promise<{ isReadOnly: boolean; reason?: string }> {
  if (role !== 'landlord' && role !== 'contractor' && role !== 'agent') {
    return { isReadOnly: false };
  }

  const status = await checkAndUpdateTrialStatus(userId, role as any);

  if (status.trialStatus === 'trial_expired') {
    return {
      isReadOnly: true,
      reason: 'Your trial has ended. Subscribe to continue editing.',
    };
  }

  if (status.trialStatus === 'suspended') {
    return {
      isReadOnly: true,
      reason: 'Your account is suspended. Subscribe to restore access.',
    };
  }

  return { isReadOnly: false };
}
