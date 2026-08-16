/**
 * Contractor Notification Email Service
 * 
 * Handles sending subscription-related emails to contractors using queue system.
 * OPTIMIZED: All emails are queued for async delivery to reduce CPU usage.
 */

import { EmailQueue } from '@/lib/queue/email-queue';
import ContractorLimitWarningEmail from '@/email/templates/contractor-limit-warning';
import ContractorLimitReachedEmail from '@/email/templates/contractor-limit-reached';
import ContractorFeatureLockedEmail from '@/email/templates/contractor-feature-locked';
import ContractorUpgradeConfirmationEmail from '@/email/templates/contractor-upgrade-confirmation';
import { CONTRACTOR_TIERS } from '@/lib/config/contractor-subscription-tiers';

const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Property Flow HQ';

// ============= Types =============

export interface LimitWarningEmailData {
  contractorName: string;
  contractorEmail: string;
  feature: string;
  featureDisplayName: string;
  currentUsage: number;
  limit: number;
  percentage: number;
  currentTier: string;
  nextTier: string;
  nextTierLimit: number | string;
}

export interface LimitReachedEmailData {
  contractorName: string;
  contractorEmail: string;
  feature: string;
  featureDisplayName: string;
  limit: number;
  currentTier: string;
  nextTier: string;
  nextTierLimit: number | string;
  nextTierPrice: number;
}

export interface FeatureLockedEmailData {
  contractorName: string;
  contractorEmail: string;
  feature: string;
  featureDisplayName: string;
  currentTier: string;
  requiredTier: string;
  requiredTierPrice: number;
}

export interface UpgradeConfirmationEmailData {
  contractorName: string;
  contractorEmail: string;
  previousTier: string;
  newTier: string;
  newTierPrice: number;
  billingPeriod: 'monthly' | 'annual';
  effectiveDate: string;
}

// ============= Helper Functions =============

/**
 * Get the upgrade URL for a contractor
 */
function getUpgradeUrl(): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/contractor/settings/subscription`;
}

/**
 * Get the dashboard URL for a contractor
 */
function getDashboardUrl(): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/contractor/dashboard`;
}

/**
 * Get the next tier for upgrade
 */
function getNextTier(currentTier: string): string {
  if (currentTier === 'starter') return 'pro';
  if (currentTier === 'pro') return 'enterprise';
  return 'enterprise';
}

/**
 * Get tier price
 */
function getTierPrice(tier: string): number {
  const tierConfig = CONTRACTOR_TIERS[tier as keyof typeof CONTRACTOR_TIERS];
  return tierConfig?.price || 0;
}

// ============= Email Sending Functions =============

/**
 * Send 80% limit warning email
 */
export async function sendLimitWarningEmail(data: LimitWarningEmailData): Promise<void> {
  try {
    const upgradeUrl = getUpgradeUrl();

    await EmailQueue.send({
      to: data.contractorEmail,
      subject: `Approaching Your ${data.featureDisplayName} Limit (${data.percentage}%)`,
      react: ContractorLimitWarningEmail({
        contractorName: data.contractorName,
        feature: data.feature,
        featureDisplayName: data.featureDisplayName,
        currentUsage: data.currentUsage,
        limit: data.limit,
        percentage: data.percentage,
        currentTier: data.currentTier,
        nextTier: data.nextTier,
        nextTierLimit: data.nextTierLimit,
        upgradeUrl,
      }),
      from: `${APP_NAME} <${senderEmail}>`,
      priority: 7, // High priority
    });

    console.log('Limit warning email queued successfully');
  } catch (error) {
    console.error('Error queueing limit warning email:', error);
    throw error;
  }
}

/**
 * Send 100% limit reached email
 */
export async function sendLimitReachedEmail(data: LimitReachedEmailData): Promise<void> {
  try {
    const upgradeUrl = getUpgradeUrl();

    await EmailQueue.send({
      to: data.contractorEmail,
      subject: `${data.featureDisplayName} Limit Reached - Upgrade to Continue`,
      react: ContractorLimitReachedEmail({
        contractorName: data.contractorName,
        feature: data.feature,
        featureDisplayName: data.featureDisplayName,
        limit: data.limit,
        currentTier: data.currentTier,
        nextTier: data.nextTier,
        nextTierLimit: data.nextTierLimit,
        nextTierPrice: data.nextTierPrice,
        upgradeUrl,
      }),
      from: `${APP_NAME} <${senderEmail}>`,
      priority: 8, // Higher priority
    });

    console.log('Limit reached email queued successfully');
  } catch (error) {
    console.error('Error queueing limit reached email:', error);
    throw error;
  }
}

/**
 * Send feature locked email
 */
export async function sendFeatureLockedEmail(data: FeatureLockedEmailData): Promise<void> {
  try {
    const upgradeUrl = getUpgradeUrl();

    await EmailQueue.send({
      to: data.contractorEmail,
      subject: `Unlock ${data.featureDisplayName} with ${data.requiredTier}`,
      react: ContractorFeatureLockedEmail({
        contractorName: data.contractorName,
        feature: data.feature,
        featureDisplayName: data.featureDisplayName,
        currentTier: data.currentTier,
        requiredTier: data.requiredTier,
        requiredTierPrice: data.requiredTierPrice,
        upgradeUrl,
      }),
      from: `${APP_NAME} <${senderEmail}>`,
      priority: 6,
    });

    console.log('Feature locked email queued successfully');
  } catch (error) {
    console.error('Error queueing feature locked email:', error);
    throw error;
  }
}

/**
 * Send upgrade confirmation email
 */
export async function sendUpgradeConfirmationEmail(data: UpgradeConfirmationEmailData): Promise<void> {
  try {
    const dashboardUrl = getDashboardUrl();

    await EmailQueue.send({
      to: data.contractorEmail,
      subject: `Welcome to ${data.newTier}! Your Upgrade is Complete`,
      react: ContractorUpgradeConfirmationEmail({
        contractorName: data.contractorName,
        previousTier: data.previousTier,
        newTier: data.newTier,
        newTierPrice: data.newTierPrice,
        billingPeriod: data.billingPeriod,
        effectiveDate: data.effectiveDate,
        dashboardUrl,
      }),
      from: `${APP_NAME} <${senderEmail}>`,
      priority: 9, // Highest priority
    });

    console.log('Upgrade confirmation email queued successfully');
  } catch (error) {
    console.error('Error queueing upgrade confirmation email:', error);
    throw error;
  }
}

// ============= Convenience Functions =============

/**
 * Send appropriate email based on usage percentage
 * 
 * @param contractorName - Contractor's name
 * @param contractorEmail - Contractor's email
 * @param feature - Feature key (e.g., 'activeJobs')
 * @param featureDisplayName - Human-readable feature name
 * @param currentUsage - Current usage count
 * @param limit - Usage limit
 * @param currentTier - Current subscription tier
 */
export async function sendUsageNotificationEmail(
  contractorName: string,
  contractorEmail: string,
  feature: string,
  featureDisplayName: string,
  currentUsage: number,
  limit: number,
  currentTier: string
): Promise<void> {
  const percentage = Math.round((currentUsage / limit) * 100);
  const nextTier = getNextTier(currentTier);
  const nextTierConfig = CONTRACTOR_TIERS[nextTier as keyof typeof CONTRACTOR_TIERS];
  const nextTierLimit = nextTierConfig.limits[feature as keyof typeof nextTierConfig.limits];
  const nextTierPrice = nextTierConfig.price;

  if (percentage >= 100) {
    // Send limit reached email
    await sendLimitReachedEmail({
      contractorName,
      contractorEmail,
      feature,
      featureDisplayName,
      limit,
      currentTier,
      nextTier,
      nextTierLimit,
      nextTierPrice,
    });
  } else if (percentage >= 80) {
    // Send warning email
    await sendLimitWarningEmail({
      contractorName,
      contractorEmail,
      feature,
      featureDisplayName,
      currentUsage,
      limit,
      percentage,
      currentTier,
      nextTier,
      nextTierLimit,
    });
  }
}

/**
 * Send feature locked notification email
 * 
 * @param contractorName - Contractor's name
 * @param contractorEmail - Contractor's email
 * @param feature - Feature key
 * @param featureDisplayName - Human-readable feature name
 * @param currentTier - Current subscription tier
 * @param requiredTier - Required tier for the feature
 */
export async function sendFeatureLockedNotification(
  contractorName: string,
  contractorEmail: string,
  feature: string,
  featureDisplayName: string,
  currentTier: string,
  requiredTier: string
): Promise<void> {
  const requiredTierPrice = getTierPrice(requiredTier);

  await sendFeatureLockedEmail({
    contractorName,
    contractorEmail,
    feature,
    featureDisplayName,
    currentTier,
    requiredTier,
    requiredTierPrice,
  });
}
