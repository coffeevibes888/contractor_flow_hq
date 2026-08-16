/**
 * Grant a contractor Enterprise tier directly in the database without going
 * through Stripe. Use this for support recoveries (e.g. Stripe webhook didn't
 * fire and the user is stuck on starter), beta testers, or hand-graded perks.
 *
 * Usage:
 *   npx tsx scripts/grant-contractor-enterprise.ts user@email.com [months]
 *
 * Defaults to 12 months. Pass 1200 for "lifetime" (100 years).
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const monthsArg = process.argv[3];
  const months = monthsArg ? Math.max(1, parseInt(monthsArg, 10)) : 12;

  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: npx tsx scripts/grant-contractor-enterprise.ts user@email.com [months]');
    process.exit(1);
  }

  console.log(`🎉 Granting Enterprise tier to contractor ${email} for ${months} month(s)\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    console.error(`❌ No user found with email ${email}`);
    process.exit(1);
  }

  console.log(`👤 ${user.name || '(no name)'} (${user.email})`);
  console.log(`   role: ${user.role}\n`);

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      businessName: true,
      subscriptionTier: true,
      subscriptionStatus: true,
    },
  });

  if (!profile) {
    console.error(`❌ No contractor profile found for ${email}`);
    console.log('   Has this user completed contractor onboarding?');
    process.exit(1);
  }

  console.log(`🏢 Contractor profile: ${profile.businessName ?? '(no name)'}`);
  console.log(`   id:           ${profile.id}`);
  console.log(`   current tier: ${profile.subscriptionTier ?? 'starter'}`);
  console.log(`   status:       ${profile.subscriptionStatus}\n`);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + months);

  const updated = await prisma.contractorProfile.update({
    where: { id: profile.id },
    data: {
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      subscriptionEndsAt: periodEnd,
      trialStatus: 'active',
      // Don't touch trialStartDate / trialEndDate — leaving them in place
      // means the SubscriptionGate's hasActiveSubscription branch still
      // succeeds without confusing the trial UI.
    },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      trialStatus: true,
    },
  });

  console.log('✅ Granted\n');
  console.log(`   tier:         ${updated.subscriptionTier}`);
  console.log(`   status:       ${updated.subscriptionStatus}`);
  console.log(`   period ends:  ${updated.currentPeriodEnd?.toISOString()}`);
  console.log(`   trialStatus:  ${updated.trialStatus}`);
  console.log(`\n🎊 ${user.email} is now on Enterprise through ${updated.currentPeriodEnd?.toLocaleDateString()}`);
}

main()
  .catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
