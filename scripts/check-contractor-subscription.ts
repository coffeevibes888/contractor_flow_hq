/**
 * Check Contractor Subscription Details
 * 
 * Verifies contractor subscription tier and access
 * Run with: npx tsx scripts/check-contractor-subscription.ts [email]
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';

async function checkSubscription(emailFilter?: string) {
  console.log('🔍 Checking Contractor Subscription Details\n');

  try {
    const contractors = await prisma.contractorProfile.findMany({
      where: emailFilter ? {
        email: { contains: emailFilter },
      } : {},
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        usageTracking: true,
      },
    });

    console.log(`Found ${contractors.length} contractor(s)\n`);

    for (const contractor of contractors) {
      console.log(`${'='.repeat(60)}`);
      console.log(`👤 ${contractor.businessName}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Email: ${contractor.email}`);
      console.log(`User Email: ${contractor.user?.email}`);
      console.log(`\n📊 Subscription Details:`);
      console.log(`   Tier: ${contractor.subscriptionTier || 'null'}`);
      console.log(`   Status: ${contractor.subscriptionStatus || 'null'}`);
      console.log(`   Period Start: ${contractor.currentPeriodStart || 'Not set'}`);
      console.log(`   Period End: ${contractor.currentPeriodEnd || 'Not set'}`);
      
      // Check if lifetime
      if (contractor.currentPeriodEnd) {
        const now = new Date();
        const endDate = new Date(contractor.currentPeriodEnd);
        const yearsFromNow = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        if (yearsFromNow > 50) {
          console.log(`   🎉 LIFETIME ACCESS (expires in ${Math.floor(yearsFromNow)} years)`);
        } else {
          console.log(`   ⏰ Expires: ${endDate.toLocaleDateString()}`);
        }
      }

      console.log(`\n📈 Usage Tracking:`);
      if (contractor.usageTracking) {
        console.log(`   Active Jobs: ${contractor.usageTracking.activeJobsCount}`);
        console.log(`   Invoices This Month: ${contractor.usageTracking.invoicesThisMonth}`);
        console.log(`   Total Customers: ${contractor.usageTracking.totalCustomers}`);
        console.log(`   Team Members: ${contractor.usageTracking.teamMembersCount}`);
        console.log(`   Inventory Items: ${contractor.usageTracking.inventoryCount}`);
        console.log(`   Equipment: ${contractor.usageTracking.equipmentCount}`);
        console.log(`   Active Leads: ${contractor.usageTracking.activeLeadsCount}`);
      } else {
        console.log(`   ⚠️  No usage tracking found`);
      }

      console.log(`\n💳 Stripe Info:`);
      console.log(`   Customer ID: ${contractor.stripeCustomerId || 'Not set'}`);
      console.log(`   Subscription ID: ${contractor.stripeSubscriptionId || 'Not set'}`);

      // Check what tier allows
      const tier = contractor.subscriptionTier || 'starter';
      console.log(`\n✅ Access Levels for '${tier}' tier:`);
      
      if (tier === 'enterprise') {
        console.log(`   ✅ UNLIMITED - All features unlocked`);
        console.log(`   ✅ Unlimited jobs`);
        console.log(`   ✅ Unlimited invoices`);
        console.log(`   ✅ Unlimited customers`);
        console.log(`   ✅ Unlimited team members`);
        console.log(`   ✅ Unlimited inventory`);
        console.log(`   ✅ Unlimited equipment`);
        console.log(`   ✅ All premium features`);
      } else if (tier === 'pro') {
        console.log(`   ✅ 50 active jobs`);
        console.log(`   ✅ 100 invoices/month`);
        console.log(`   ✅ 500 customers`);
        console.log(`   ✅ 6 team members`);
        console.log(`   ✅ Advanced features`);
      } else {
        console.log(`   ✅ 5 active jobs`);
        console.log(`   ✅ 10 invoices/month`);
        console.log(`   ✅ 50 customers`);
        console.log(`   ✅ Basic features only`);
      }

      console.log(`\n`);
    }

    console.log(`${'='.repeat(60)}\n`);

  } catch (error: any) {
    console.error('❌ Script failed:', error.message);
    throw error;
  }
}

// Get email filter from command line
const emailFilter = process.argv[2];

if (emailFilter) {
  console.log(`Filtering by email: ${emailFilter}\n`);
}

checkSubscription(emailFilter)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
