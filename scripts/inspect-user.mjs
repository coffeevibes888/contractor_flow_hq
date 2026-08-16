/* eslint-disable no-console */
// One-shot diagnostic: show the reported user + any related landlord/login
// records. Safe to delete once triage is done.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const patterns = ['%aunwitcher%'];

async function main() {
  for (const pattern of patterns) {
    const users = await prisma.$queryRaw`
      SELECT id, email, name, role, "onboardingCompleted", "emailVerified",
             "twoFactorEnabled", "createdAt"
      FROM "User"
      WHERE email ILIKE ${pattern}
      ORDER BY "createdAt" DESC;
    `;
    console.log('\n=== User rows for pattern', pattern, '===');
    console.dir(users, { depth: null });

    if (Array.isArray(users)) {
      for (const u of users) {
        const ll = await prisma.landlord.findMany({
          where: { ownerUserId: u.id },
          select: {
            id: true, name: true, subdomain: true,
            subscriptionStatus: true, subscriptionTier: true,
            trialStatus: true, trialStartDate: true, trialEndDate: true,
            stripeSubscriptionId: true, stripeCustomerId: true,
            createdAt: true, updatedAt: true,
          },
        });
        console.log(`\n  Landlord(s) owned by ${u.email}:`);
        console.dir(ll, { depth: null });

        const logins = await prisma.loginAttempt.findMany({
          where: { OR: [{ userId: u.id }, { email: u.email }] },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            success: true, reason: true, ipAddress: true,
            country: true, city: true, createdAt: true,
          },
        }).catch(() => []);
        console.log(`  Recent login attempts for ${u.email}:`);
        console.dir(logins, { depth: null });

        const audit = await prisma.auditLog.findMany({
          where: { userId: u.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { action: true, severity: true, ipAddress: true, createdAt: true, metadata: true },
        }).catch(() => []);
        console.log(`  Audit log rows for ${u.email}:`);
        console.dir(audit, { depth: null });
      }
    }
  }

  // Also show the 10 most recent landlords for a sanity baseline.
  const recent = await prisma.$queryRaw`
    SELECT u.email, u.role, u."createdAt" AS user_created,
           l.subdomain, l."subscriptionStatus", l."trialStatus",
           l."stripeSubscriptionId", l."createdAt" AS landlord_created
    FROM "User" u
    LEFT JOIN "Landlord" l ON l."ownerUserId" = u.id
    ORDER BY u."createdAt" DESC
    LIMIT 15;
  `;
  console.log('\n=== 15 most recent users (with landlord joined) ===');
  console.dir(recent, { depth: null });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
