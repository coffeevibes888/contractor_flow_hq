'use server';

import Stripe from 'stripe';
import { prisma } from '@/db/prisma';
import {
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  normalizeTier,
} from '@/lib/config/subscription-tiers';

/**
 * Syncs a landlord's subscription state directly from Stripe. Shared by the
 * admin layout, overview page, and the `/api/landlord/subscription/sync`
 * route so nothing depends on self-fetch reliability or webhook delivery in
 * dev environments.
 *
 * Safe to call repeatedly — it's idempotent.
 */
export async function syncLandlordSubscriptionFromStripe(landlordId: string): Promise<
  | { success: true; tier: SubscriptionTier | 'free'; status: string }
  | { success: false; message: string }
> {
  try {
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!landlord) {
      return { success: false, message: 'Landlord not found' };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { success: false, message: 'STRIPE_SECRET_KEY not configured' };
    }

    if (!landlord.stripeCustomerId) {
      // Nothing to sync — user never went through checkout
      return { success: false, message: 'No Stripe customer' };
    }

    const stripe = new Stripe(stripeSecretKey);

    const subscriptions = await stripe.subscriptions.list({
      customer: landlord.stripeCustomerId,
      status: 'all',
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          subscriptionTier: 'starter',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
        },
      });
      return { success: true, tier: 'free', status: 'canceled' };
    }

    const PAID_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];
    const subscription =
      subscriptions.data.find((s) => PAID_STATUSES.includes(s.status)) ||
      subscriptions.data[0];

    // No valid paid subscription — treat as canceled/free.
    // This covers: no subscriptions at all, only 'incomplete' (payment was
    // declined, nothing collected), 'incomplete_expired', and 'canceled'.
    if (
      !subscription ||
      !PAID_STATUSES.includes(subscription.status)
    ) {
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          subscriptionTier: 'starter',
          subscriptionStatus: subscription?.status || 'canceled',
          stripeSubscriptionId: null,
        },
      });
      return { success: true, tier: 'free', status: subscription?.status || 'canceled' };
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
        ['starter', process.env.STRIPE_PRICE_STARTER],
        ['starter', process.env.STRIPE_PRICE_STARTER_YEARLY],
        ['pro', process.env.STRIPE_PRICE_PRO],
        ['pro', process.env.STRIPE_PRICE_PRO_YEARLY],
        ['enterprise', process.env.STRIPE_PRICE_ENTERPRISE],
        ['enterprise', process.env.STRIPE_PRICE_ENTERPRISE_YEARLY],
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

    await prisma.landlordSubscription.upsert({
      where: { landlordId: landlord.id },
      create: {
        landlordId: landlord.id,
        tier: resolvedTier,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: landlord.stripeCustomerId,
        stripePriceId: priceId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        unitLimit: tierConfig.unitLimit === Infinity ? 999999 : tierConfig.unitLimit,
        freeBackgroundChecks: tierConfig.features.freeBackgroundChecks,
        freeEvictionChecks: tierConfig.features.freeEvictionChecks,
        freeEmploymentVerification: tierConfig.features.freeEmploymentVerification,
      },
      update: {
        tier: resolvedTier,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        unitLimit: tierConfig.unitLimit === Infinity ? 999999 : tierConfig.unitLimit,
        freeBackgroundChecks: tierConfig.features.freeBackgroundChecks,
        freeEvictionChecks: tierConfig.features.freeEvictionChecks,
        freeEmploymentVerification: tierConfig.features.freeEmploymentVerification,
      },
    });

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        subscriptionTier: resolvedTier,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        freeBackgroundChecks: tierConfig.features.freeBackgroundChecks,
        freeEmploymentVerification: tierConfig.features.freeEmploymentVerification,
        // Mirror trial dates so SubscriptionGate's trialIsLegitimate check
        // passes even when the Stripe webhook hasn't fired yet.
        ...(isTrialing && trialStart && { trialStartDate: trialStart }),
        ...(isTrialing && trialEnd && { trialEndDate: trialEnd, trialStatus: 'trialing' }),
        ...(!isTrialing && subscription.status === 'active' && { trialStatus: 'active' }),
      },
    });

    return { success: true, tier, status: subscription.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.error('[syncLandlordSubscriptionFromStripe]', message);
    return { success: false, message };
  }
}
