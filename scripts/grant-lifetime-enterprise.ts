/**
 * Grant Lifetime Enterprise Access
 * 
 * Directly grants lifetime enterprise access to a contractor
 * Run with: npx tsx scripts/grant-lifetime-enterprise.ts [email]
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';

async function grantLifetimeEnterprise(email: string) {
  console.log('🎉 Granting Lifetime Enterprise Access\n');

  try {
    // Find contractor by email
    const contractor = await prisma.contractorProfile.findFirst({
      where: {
        OR: [
          { email: { contains: email } },
          { user: { email: { contains: email } } },
        ],
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!contractor) {
      console.error('❌ Contractor not found with email:', email);
      return;
    }

    console.log(`Found contractor: ${contractor.businessName}`);
    console.log(`Email: ${contractor.email}`);
    console.log(`Current tier: ${contractor.subscriptionTier || 'starter'}\n`);

    // Set lifetime enterprise
    const now = new Date();
    const farFuture = new Date(now);
    farFuture.setFullYear(farFuture.getFullYear() + 100); // 100 years from now

    console.log('Updating to Enterprise (Lifetime)...\n');

    const updated = await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        subscriptionTier: 'enterprise',
        subscriptionStatus: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: farFuture,
      },
    });

    console.log('✅ SUCCESS!\n');
    console.log('Updated subscription:');
    console.log(`   Tier: ${updated.subscriptionTier}`);
    console.log(`   Status: ${updated.subscriptionStatus}`);
    console.log(`   Period Start: ${updated.currentPeriodStart}`);
    console.log(`   Period End: ${updated.currentPeriodEnd}`);
    console.log(`\n🎊 ${contractor.businessName} now has LIFETIME ENTERPRISE access!`);
    console.log(`\n✨ Features unlocked:`);
    console.log(`   ✅ Unlimited jobs`);
    console.log(`   ✅ Unlimited invoices`);
    console.log(`   ✅ Unlimited customers`);
    console.log(`   ✅ Unlimited team members`);
    console.log(`   ✅ Unlimited inventory`);
    console.log(`   ✅ Unlimited equipment`);
    console.log(`   ✅ All premium features`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npx tsx scripts/grant-lifetime-enterprise.ts [email]');
  process.exit(1);
}

grantLifetimeEnterprise(email)
  .then(() => {
    console.log('\n✅ Done! Verify with:');
    console.log(`   npx tsx scripts/check-contractor-subscription.ts ${email}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
