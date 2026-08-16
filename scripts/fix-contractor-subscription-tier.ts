/**
 * Fix Contractor Subscription Tiers
 * Sets null subscription tiers to 'starter'
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';

async function fixSubscriptionTiers() {
  console.log('🔧 Fixing Contractor Subscription Tiers\n');

  const profiles = await prisma.contractorProfile.findMany({
    where: {
      OR: [
        { subscriptionTier: null },
        { subscriptionTier: 'none' },
      ],
    },
    select: {
      id: true,
      businessName: true,
      email: true,
      subscriptionTier: true,
    },
  });

  console.log(`Found ${profiles.length} profile(s) with null/none tier\n`);

  for (const profile of profiles) {
    console.log(`Fixing: ${profile.businessName}`);
    
    await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: { 
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      },
    });

    // Ensure usage tracking exists
    const usageTracking = await prisma.contractorUsageTracking.findUnique({
      where: { contractorId: profile.id },
    });

    if (!usageTracking) {
      await prisma.contractorUsageTracking.create({
        data: {
          contractorId: profile.id,
          activeJobsCount: 0,
          invoicesThisMonth: 0,
          totalCustomers: 0,
        },
      });
      console.log(`  ✅ Created usage tracking`);
    }

    console.log(`  ✅ Set to 'starter' tier\n`);
  }

  console.log('✅ All subscription tiers fixed!\n');
}

fixSubscriptionTiers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
