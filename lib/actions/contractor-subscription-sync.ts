'use server';

import Stripe from 'stripe';
import { prisma } from '@/db/prisma';
import {
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  normalizeTier,
} from '@/lib/config/subscription-tiers';

/**
 * Syncs a contractor's subscription state directly from Stripe. Mirrors
 * `syncLandlordSubscriptionFromStripe` so the contractor dashboard layout,
 * `/api/contractor/subscription/sync`, and admin recovery scripts all share
 * the same logic and don't depend on webhook delivery (which fails silently
 * when STRIPE_WEBHOOK_SECRET isn't configured).
 *
 * Safe to call repeatedly — it's idempotent.
 */
export async function syncContractorSubscriptionFromStripe(
  contractorProfileId: string
): Promise<
  | { success: true; tier: SubscriptionTier | 'free'; status: string }
  | { success: false; message: string }
> {
  try {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorProfileId },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!contractor) {
      return { success: false, message: 'Contractor profile not found' };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { success: false, message: 'STRIPE_SECRET_KEY not configured' };
    }

    if (!contractor.stripeCustomerId) {
      // Nothing to sync — user never went through checkout
      return { success: false, message: 'No Stripe customer' };
    }

    const stripe = new Stripe(stripeSecretKey);

    const subscriptions = await stripe.subscriptions.list({
      customer: contractor.stripeCustomerId,
      status: 'all',
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: {
          subscriptionTier: 'starter',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
        },
      });
      return { success: true, tier: 'free', status: 'canceled' };
    }

    const preferredStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
    const subscription =
      subscriptions.data.find((s) => preferredStatuses.includes(s.status)) ||
      subscriptions.data[0];

    if (
      !subscription ||
      subscription.status === 'canceled' ||
      subscription.status === 'incomplete_expired'
    ) {
      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: {
          subscriptionTier: 'starter',
          subscriptionStatus: subscription?.status || 'canceled',
          stripeSubscriptionId: null,
        },
      });
      return {
        success: true,
        tier: 'free',
        status: subscription?.status || 'canceled',
      };
    }

    const priceId = subscription.items.data[0]?.price?.id;

    // Determine tier: metadata wins (matches create-checkout), then env-mapped
    // price id, then default to 'pro' for any paid sub.
    type SyncTier = SubscriptionTier | 'free';
    let tier: SyncTier = 'free';

    const metaTierRaw = subscription.metadata?.tier;
    const normalizedMetaTier =
      typeof metaTierRaw === 'string' ? normalizeTier(metaTierRaw) : null;

    if (normalizedMetaTier) {
      tier = normalizedMetaTier;
    } else {
      const priceToTier: Array<[SubscriptionTier, string | null | undefined]> = [
        ['starter', process.env.STRIPE_PRICE_CONTRACTOR_STARTER],
        ['starter', process.env.STRIPE_PRICE_CONTRACTOR_STARTER_YEARLY],
        ['pro', process.env.STRIPE_PRICE_CONTRACTOR_PRO],
        ['pro', process.env.STRIPE_PRICE_CONTRACTOR_PRO_YEARLY],
        ['enterprise', process.env.STRIPE_PRICE_CONTRACTOR_ENTERPRISE],
        ['enterprise', process.env.STRIPE_PRICE_CONTRACTOR_ENTERPRISE_YEARLY],
        // Fallback: shared (non-contractor) price IDs in case the same price
        // was used for both audiences during early setup.
        ['starter', process.env.STRIPE_PRICE_STARTER],
        ['pro', process.env.STRIPE_PRICE_PRO],
        ['enterprise', process.env.STRIPE_PRICE_ENTERPRISE],
      ];
      const matchedTier = priceToTier.find(([, configuredPriceId]) =>
        Boolean(priceId && configuredPriceId && configuredPriceId === priceId)
      )?.[0];
      tier = matchedTier || (priceId ? 'pro' : 'free');
    }

    const resolvedTier: SubscriptionTier = tier === 'free' ? 'starter' : tier;
    const tierConfig = SUBSCRIPTION_TIERS[resolvedTier];

    const isTrialing = subscription.status === 'trialing';
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;
    const trialStart = subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : null;
    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : null;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        subscriptionTier: resolvedTier,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        ...(periodStart && { currentPeriodStart: periodStart }),
        ...(periodEnd && { currentPeriodEnd: periodEnd }),
        // Mirror trial dates so the SubscriptionGate's contractor branch
        // accepts the trial as legitimate even when the webhook hasn't fired.
        ...(isTrialing && trialStart && { trialStartDate: trialStart }),
        ...(isTrialing &&
          trialEnd && { trialEndDate: trialEnd, trialStatus: 'trialing' }),
        ...(!isTrialing &&
          subscription.status === 'active' && { trialStatus: 'active' }),
      },
    });

    // Touch tierConfig so unused-import lint stays quiet and to make it easy
    // to extend later (e.g. mirroring feature flags onto the contractor row).
    void tierConfig;

    return { success: true, tier, status: subscription.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.error('[syncContractorSubscriptionFromStripe]', message);
    return { success: false, message };
  }
}
