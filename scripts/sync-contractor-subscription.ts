/**
 * Sync a contractor's subscription tier from Stripe.
 *
 * Use this when a contractor finished Stripe checkout but their dashboard is
 * still showing the wrong plan (typically because STRIPE_WEBHOOK_SECRET isn't
 * configured locally and the webhook never updated the DB).
 *
 * Usage:
 *   npx tsx scripts/sync-contractor-subscription.ts user@email.com
 */

import 'dotenv/config';
import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { syncContractorSubscriptionFromStripe } from '../lib/actions/contractor-subscription-sync';

/**
 * Look up a Stripe customer by email. Returns the most recent active customer
 * that has a subscription attached, falling back to the most recent customer
 * if none have a subscription yet. This is how we recover from a stale
 * `stripeCustomerId` (e.g. the DB still has an ID from a previous test-mode
 * session that no longer exists).
 */
async function findStripeCustomerByEmail(stripe: Stripe, email: string) {
  const matches = await stripe.customers.list({ email, limit: 20 });
  if (matches.data.length === 0) return null;

  // Prefer customers that have at least one subscription on file.
  for (const customer of matches.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 1,
    });
    if (subs.data.length > 0) return customer;
  }

  // Fallback: most recently created customer.
  return matches.data[0];
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: npx tsx scripts/sync-contractor-subscription.ts user@email.com');
    process.exit(1);
  }

  console.log(`🔄 Syncing contractor subscription for ${email}\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    console.error(`❌ No user found with email ${email}`);
    process.exit(1);
  }

  console.log(`👤 User: ${user.name || '(no name)'} (${user.email})`);
  console.log(`   Role: ${user.role}`);
  console.log(`   ID:   ${user.id}\n`);

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      businessName: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!profile) {
    console.error(`❌ No contractor profile found for ${email}`);
    console.log('   This user may not have completed contractor onboarding yet.');
    process.exit(1);
  }

  console.log(`🏢 Contractor profile: ${profile.businessName || '(no name)'}`);
  console.log(`   Profile ID:        ${profile.id}`);
  console.log(`   Current tier:      ${profile.subscriptionTier ?? 'starter'}`);
  console.log(`   Current status:    ${profile.subscriptionStatus}`);
  console.log(`   Stripe customer:   ${profile.stripeCustomerId ?? '(none)'}`);
  console.log(`   Stripe sub:        ${profile.stripeSubscriptionId ?? '(none)'}\n`);

  if (!profile.stripeCustomerId) {
    console.error(`❌ Contractor has no Stripe customer ID — they have not been through checkout.`);
    process.exit(1);
  }

  // Verify the stored Stripe customer still exists. If it doesn't (common
  // after switching Stripe test accounts or rotating keys), look up the
  // customer by email and re-link them.
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY is not set in the environment.');
    process.exit(1);
  }
  const stripe = new Stripe(stripeSecretKey);

  let resolvedCustomerId = profile.stripeCustomerId;
  try {
    await stripe.customers.retrieve(profile.stripeCustomerId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️  Stored Stripe customer is invalid: ${message}`);
    console.log(`   Looking up customer by email...\n`);

    const found = await findStripeCustomerByEmail(stripe, email);
    if (!found) {
      console.error(
        `❌ No Stripe customer found for ${email}. Either checkout never completed or the email differs in Stripe.`
      );
      process.exit(1);
    }
    resolvedCustomerId = found.id;
    console.log(`✅ Found Stripe customer ${found.id} (${found.email ?? 'no email'})`);
    await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: { stripeCustomerId: found.id },
    });
    console.log(`   Re-linked profile to ${found.id}\n`);
  }

  // Quick visibility into what we're about to sync — helps when something
  // still looks wrong after the script reports success.
  const subs = await stripe.subscriptions.list({
    customer: resolvedCustomerId,
    status: 'all',
    limit: 5,
  });
  if (subs.data.length === 0) {
    console.log(
      '⚠️  Stripe has no subscriptions for this customer yet. Sync will downgrade them to starter.'
    );
  } else {
    for (const s of subs.data) {
      const tierMeta = s.metadata?.tier ?? '(no metadata.tier)';
      const priceId = s.items.data[0]?.price?.id ?? '(no price)';
      console.log(`📦 Stripe sub ${s.id} — status=${s.status}, metadata.tier=${tierMeta}, price=${priceId}`);
    }
    console.log('');
  }

  console.log('☁️  Pulling latest subscription state from Stripe...\n');
  const result = await syncContractorSubscriptionFromStripe(profile.id);

  if (!result.success) {
    console.error(`❌ Sync failed: ${result.message}`);
    process.exit(1);
  }

  const updated = await prisma.contractorProfile.findUnique({
    where: { id: profile.id },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      currentPeriodEnd: true,
      trialStatus: true,
      trialEndDate: true,
    },
  });

  console.log('✅ Sync complete\n');
  console.log(`   Tier:           ${updated?.subscriptionTier ?? '(unknown)'}`);
  console.log(`   Status:         ${updated?.subscriptionStatus ?? '(unknown)'}`);
  console.log(`   Stripe sub:     ${updated?.stripeSubscriptionId ?? '(none)'}`);
  console.log(`   Trial status:   ${updated?.trialStatus ?? '(unknown)'}`);
  console.log(`   Trial ends:     ${updated?.trialEndDate?.toISOString() ?? '(none)'}`);
  console.log(`   Period ends:    ${updated?.currentPeriodEnd?.toISOString() ?? '(none)'}`);
  console.log(`\n🎉 Done. ${user.email} should now see the ${updated?.subscriptionTier} plan in the dashboard.`);
}

main()
  .catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
