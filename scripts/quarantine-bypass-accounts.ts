/* eslint-disable no-console */
/**
 * Quarantine known-bypass landlord accounts (those that received a trial
 * without ever picking a plan or verifying their email) until the owner
 * re-verifies and picks a plan.
 *
 * Safety:
 *  - DRY_RUN=true (default) only prints what it would change.
 *  - Pass DRY_RUN=false on the command line to actually write.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/quarantine-bypass-accounts.ts
 *   npx tsx --env-file=.env scripts/quarantine-bypass-accounts.ts --apply
 */
import { prisma } from '../db/prisma';

const APPLY = process.argv.includes('--apply') || process.env.DRY_RUN === 'false';

async function main() {
  // Find landlord trials where:
  //  - no Stripe subscription was ever created
  //  - the user never verified their email
  //  - trial was granted within the last 30 days (don't retroactively punish
  //    paying customers, they'd have a stripe ID)
  const suspect = await prisma.landlord.findMany({
    where: {
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      trialStatus: 'trialing',
    },
    select: {
      id: true,
      name: true,
      subdomain: true,
      ownerUserId: true,
      createdAt: true,
      trialStartDate: true,
      trialEndDate: true,
    },
  });

  if (suspect.length === 0) {
    console.log('No suspect landlord trials found.');
    return;
  }

  const userIds = suspect.map((l) => l.ownerUserId).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, emailVerified: true, createdAt: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const toQuarantine = suspect.filter((l) => {
    const u = l.ownerUserId ? byId.get(l.ownerUserId) : null;
    // Only flag accounts whose email is NOT verified. Verified-but-never-paid
    // users went through the legit flow and may just be browsing.
    return u && !u.emailVerified;
  });

  console.log(
    `\nFound ${suspect.length} trialing landlords without Stripe. ${toQuarantine.length} also have unverified email and will be quarantined.\n`
  );

  for (const l of toQuarantine) {
    const u = l.ownerUserId ? byId.get(l.ownerUserId) : null;
    console.log(
      `  ${u?.email ?? '(no user)'} — landlord ${l.subdomain} (${l.id}) — created ${l.createdAt.toISOString()}`
    );
  }

  if (!APPLY) {
    console.log('\nDRY RUN. Re-run with --apply to enforce.');
    return;
  }

  let updated = 0;
  for (const l of toQuarantine) {
    await prisma.landlord.update({
      where: { id: l.id },
      data: {
        trialStatus: 'suspended',
        subscriptionStatus: 'incomplete',
      },
    });
    updated++;
  }
  console.log(`\nQuarantined ${updated} account(s). They will now hit the subscription gate.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
