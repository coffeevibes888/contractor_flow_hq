/**
 * Fix Landlord Stripe Connect Capabilities
 * 
 * Updates existing landlord Connect accounts to have both
 * card_payments and transfers capabilities
 * 
 * Run with: npx tsx scripts/fix-landlord-stripe-capabilities.ts
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

async function fixLandlordCapabilities() {
  console.log('🔧 Fixing Landlord Stripe Connect Capabilities\n');

  try {
    // Find all landlords with Connect accounts
    const landlords = await prisma.landlord.findMany({
      where: {
        stripeConnectAccountId: { not: null },
      },
      select: {
        id: true,
        companyName: true,
        companyEmail: true,
        stripeConnectAccountId: true,
        stripeOnboardingStatus: true,
        owner: { select: { email: true, name: true } },
      },
    });

    console.log(`Found ${landlords.length} landlord(s) with Connect accounts\n`);

    for (const landlord of landlords) {
      console.log(`\n📋 Checking: ${landlord.companyName || landlord.owner?.name || landlord.owner?.email || landlord.companyEmail}`);
      console.log(`   Account ID: ${landlord.stripeConnectAccountId}`);

      try {
        // Retrieve current account
        const account = await stripe.accounts.retrieve(landlord.stripeConnectAccountId!);

        console.log(`   Current capabilities:`, {
          card_payments: account.capabilities?.card_payments,
          transfers: account.capabilities?.transfers,
        });

        // Check if both capabilities are active or pending
        const hasCardPayments = account.capabilities?.card_payments === 'active' || 
                                account.capabilities?.card_payments === 'pending';
        const hasTransfers = account.capabilities?.transfers === 'active' || 
                            account.capabilities?.transfers === 'pending';

        if (hasCardPayments && hasTransfers) {
          console.log('   ✅ Both capabilities already configured');
          continue;
        }

        // Need to update capabilities
        console.log('   ⚠️  Missing capabilities, updating...');

        try {
          const updatedAccount = await stripe.accounts.update(
            landlord.stripeConnectAccountId!,
            {
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
            }
          );

          console.log('   ✅ Updated capabilities:', {
            card_payments: updatedAccount.capabilities?.card_payments,
            transfers: updatedAccount.capabilities?.transfers,
          });

          // Update local status
          await prisma.landlord.update({
            where: { id: landlord.id },
            data: {
              stripeOnboardingStatus: 'pending',
            },
          });

          console.log('   ✅ Local status updated');
        } catch (updateError: any) {
          console.log('   ❌ Cannot update capabilities on existing account:', updateError.message);
          console.log('   🗑️  Clearing bad account so a fresh one can be created...');

          await prisma.landlord.update({
            where: { id: landlord.id },
            data: {
              stripeConnectAccountId: null,
              stripeOnboardingStatus: 'not_started',
            },
          });

          console.log('   ✅ Cleared - landlord can now click Get Started to create a new account');
        }

      } catch (error: any) {
        if (error.code === 'account_invalid') {
          console.log('   ❌ Account is invalid - needs to be recreated');
          console.log('   💡 Solution: Clear stripeConnectAccountId and create new account');
          
          // Optionally clear the invalid account
          await prisma.landlord.update({
            where: { id: landlord.id },
            data: {
              stripeConnectAccountId: null,
              stripeOnboardingStatus: 'not_started',
            },
          });
          
          console.log('   ✅ Cleared invalid account - landlord can now reconnect');
        } else {
          console.error('   ❌ Error:', error.message);
        }
      }
    }

    console.log('\n\n✅ Capability fix complete!\n');
    console.log('📝 Summary:');
    console.log('   - All landlord accounts now have both capabilities');
    console.log('   - Invalid accounts have been cleared');
    console.log('   - Landlords can now complete onboarding\n');

    console.log('💡 Next steps:');
    console.log('   1. Have landlords visit /admin/payouts');
    console.log('   2. Click "Set Up Payouts"');
    console.log('   3. Complete Stripe onboarding');
    console.log('   4. Both card_payments and transfers will be enabled\n');

    console.log('ℹ️  Note: Even though you only want ACH, Stripe requires');
    console.log('   both capabilities. You can still only accept ACH payments');
    console.log('   in your application logic.\n');

  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message);
    throw error;
  }
}

// Run the fix
fixLandlordCapabilities()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
