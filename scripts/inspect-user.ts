/* eslint-disable no-console */
// One-shot diagnostic used after the signup-bypass incident. Safe to delete
// once triage is complete. Run with: npx tsx --env-file=.env scripts/inspect-user.ts
import { prisma } from '../db/prisma';

async function main() {
  const emails = ['aunwitcher@gmail.com', 'allenyoung37@yahoo.com'];

  for (const email of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true, email: true, name: true, role: true,
        onboardingCompleted: true, emailVerified: true,
        twoFactorEnabled: true, createdAt: true,
      },
    });
    console.log(`\n=== ${email} ===`);
    console.dir(user, { depth: null });
    if (!user) continue;

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: user.id },
      select: {
        id: true, subdomain: true,
        subscriptionStatus: true, subscriptionTier: true,
        trialStatus: true, trialStartDate: true, trialEndDate: true,
        stripeSubscriptionId: true, stripeCustomerId: true,
        createdAt: true, updatedAt: true,
      },
    });
    console.log('  landlord:');
    console.dir(landlord, { depth: null });

    const audit = await prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, severity: true, ipAddress: true, userAgent: true, createdAt: true, metadata: true },
    });
    console.log('  audit entries:');
    console.dir(audit, { depth: null });

    try {
      const logins = await (prisma as any).loginAttempt.findMany({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { success: true, reason: true, ipAddress: true, country: true, city: true, userAgent: true, createdAt: true },
      });
      console.log('  login attempts:');
      console.dir(logins, { depth: null });
    } catch (e) {
      console.log('  (LoginAttempt table not available)', e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
