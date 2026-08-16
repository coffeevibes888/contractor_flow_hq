/**
 * Check Contractor Profile
 * 
 * Verifies contractor profile exists and creates one if needed
 * Run with: npx tsx scripts/check-contractor-profile.ts [email]
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';

async function checkContractorProfile(emailFilter?: string) {
  console.log('🔍 Checking Contractor Profiles\n');

  try {
    // Find users with contractor role
    const users = await prisma.user.findMany({
      where: {
        role: 'contractor',
        ...(emailFilter && { email: { contains: emailFilter } }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    console.log(`Found ${users.length} contractor user(s)\n`);

    for (const user of users) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 ${user.name || user.email}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`User ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);

      // Check for ContractorProfile
      const profile = await prisma.contractorProfile.findFirst({
        where: { userId: user.id },
        select: {
          id: true,
          businessName: true,
          email: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          stripeConnectAccountId: true,
          stripeOnboardingStatus: true,
          isPaymentReady: true,
        },
      });

      if (profile) {
        console.log(`\n✅ ContractorProfile exists`);
        console.log(`   Profile ID: ${profile.id}`);
        console.log(`   Business Name: ${profile.businessName || 'Not set'}`);
        console.log(`   Email: ${profile.email || 'Not set'}`);
        console.log(`   Subscription: ${profile.subscriptionTier} (${profile.subscriptionStatus})`);
        console.log(`   Stripe Connect: ${profile.stripeConnectAccountId || 'Not connected'}`);
        console.log(`   Onboarding Status: ${profile.stripeOnboardingStatus || 'not_started'}`);
        console.log(`   Payment Ready: ${profile.isPaymentReady ? '✅' : '❌'}`);
      } else {
        console.log(`\n⚠️  No ContractorProfile found`);
        console.log(`\n💡 Creating ContractorProfile...`);

        const newProfile = await prisma.contractorProfile.create({
          data: {
            userId: user.id,
            email: user.email,
            businessName: user.name || 'My Business',
            subscriptionTier: 'starter',
            subscriptionStatus: 'active',
          },
        });

        console.log(`✅ Created ContractorProfile: ${newProfile.id}`);

        // Create usage tracking
        await prisma.contractorUsageTracking.create({
          data: {
            contractorId: newProfile.id,
            activeJobsCount: 0,
            invoicesThisMonth: 0,
            totalCustomers: 0,
          },
        });

        console.log(`✅ Created usage tracking`);
      }

      // Check for old Contractor model (landlord's directory)
      const oldContractor = await prisma.contractor.findFirst({
        where: { userId: user.id },
      });

      if (oldContractor) {
        console.log(`\nℹ️  Also has old Contractor record (landlord's directory)`);
        console.log(`   This is separate from ContractorProfile`);
      }
    }

    console.log(`\n${'='.repeat(60)}\n`);
    console.log('✅ Check complete!\n');

    if (users.length === 0) {
      console.log('💡 No contractor users found.');
      console.log('   Create a user with role="contractor" first.\n');
    }

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

checkContractorProfile(emailFilter)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
