/**
 * Cleanup script to remove test users created during test runs
 * This version loads env vars before importing Prisma
 * Run with: node --loader tsx scripts/cleanup-test-users-safe.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Make sure .env or .env.local contains DATABASE_URL');
  process.exit(1);
}

console.log('✅ Environment variables loaded');

// Now import Prisma
async function main() {
  const { prismaBase: db } = await import('@/db/prisma-base');

  console.log('Starting cleanup of test users...');

  try {
    // Find all test users
    const testUsers = await db.User.findMany({
      where: {
        OR: [
          { email: { contains: '@example.com' } },
          { email: { startsWith: 'test-' } },
          { email: { startsWith: 'contractor-' } },
          { email: { startsWith: 'customer-' } },
          { email: { startsWith: 'landlord-' } },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log(`Found ${testUsers.length} test users to clean up`);

    if (testUsers.length === 0) {
      console.log('No test users found. Exiting.');
      return;
    }

    // Show first 10 users that will be deleted
    console.log('\nSample of users to be deleted:');
    testUsers.slice(0, 10).forEach((u) => {
      console.log(`  - ${u.email} (${u.role})`);
    });
    if (testUsers.length > 10) {
      console.log(`  ... and ${testUsers.length - 10} more`);
    }

    // Get landlord profiles
    const landlordUsers = testUsers.filter((u) => u.role === 'landlord');
    const landlordProfiles = await db.landlord.findMany({
      where: {
        ownerUserId: { in: landlordUsers.map((u) => u.id) },
      },
      select: { id: true },
    });

    console.log(`\nFound ${landlordProfiles.length} landlord profiles to clean up`);

    // Delete related data for each landlord profile
    for (const profile of landlordProfiles) {
      // Delete dispute-related data
      await db.disputeTimeline.deleteMany({
        where: { dispute: { landlordId: profile.id } },
      });

      await db.disputeEvidence.deleteMany({
        where: { dispute: { landlordId: profile.id } },
      });

      await db.disputeMessage.deleteMany({
        where: { dispute: { landlordId: profile.id } },
      });

      await db.dispute.deleteMany({
        where: { landlordId: profile.id },
      });

      // Delete landlord profile
      await db.landlord.delete({
        where: { id: profile.id },
      });
    }

    // Delete job guarantee holds
    const userIds = testUsers.map((u) => u.id);
    const deletedHolds = await db.jobGuaranteeHold.deleteMany({
      where: {
        OR: [
          { contractorId: { in: userIds } },
          { customerId: { in: userIds } },
        ],
      },
    });
    console.log(`Deleted ${deletedHolds.count} job guarantee holds`);

    // Delete contractor profiles
    const deletedContractors = await db.contractor.deleteMany({
      where: { userId: { in: userIds } },
    });
    console.log(`Deleted ${deletedContractors.count} contractor profiles`);

    // Delete test users
    const deletedUsers = await db.User.deleteMany({
      where: { id: { in: userIds } },
    });
    console.log(`Deleted ${deletedUsers.count} test users`);

    console.log('\n✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the cleanup
main()
  .then(() => {
    console.log('Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
