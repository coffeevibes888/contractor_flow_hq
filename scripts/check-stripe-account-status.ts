/**
 * Check Stripe Account Status
 * 
 * Checks the current status of all Stripe Connect accounts
 * Run with: npx tsx scripts/check-stripe-account-status.ts [email]
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

async function checkAccountStatus(emailFilter?: string) {
  console.log('🔍 Checking Stripe Connect Account Status\n');

  try {
    // Find landlords
    const landlords = await prisma.landlord.findMany({
      where: emailFilter ? {
        email: { contains: emailFilter },
      } : {},
      select: {
        id: true,
        name: true,
        email: true,
        stripeConnectAccountId: true,
        stripeOnboardingStatus: true,
      },
    });

    console.log(`Found ${landlords.length} landlord(s)\n`);

    for (const landlord of landlords) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 ${landlord.name || landlord.email}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Email: ${landlord.email}`);
      console.log(`Local Status: ${landlord.stripeOnboardingStatus || 'not_started'}`);

      if (!landlord.stripeConnectAccountId) {
        console.log(`\n⚠️  No Stripe Connect account\n`);
        console.log(`💡 Action: Visit /admin/payouts and click "Set Up Payouts"`);
        continue;
      }

      console.log(`Account ID: ${landlord.stripeConnectAccountId}`);

      try {
        const account = await stripe.accounts.retrieve(landlord.stripeConnectAccountId);

        console.log(`\n📊 Account Details:`);
        console.log(`   Type: ${account.type}`);
        console.log(`   Country: ${account.country}`);
        console.log(`   Email: ${account.email}`);
        console.log(`   Details Submitted: ${account.details_submitted ? '✅' : '❌'}`);
        console.log(`   Charges Enabled: ${account.charges_enabled ? '✅' : '❌'}`);
        console.log(`   Payouts Enabled: ${account.payouts_enabled ? '✅' : '❌'}`);

        console.log(`\n🔧 Capabilities:`);
        console.log(`   card_payments: ${account.capabilities?.card_payments || 'not_requested'}`);
        console.log(`   transfers: ${account.capabilities?.transfers || 'not_requested'}`);

        if (account.requirements?.currently_due?.length) {
          console.log(`\n⚠️  Requirements Currently Due:`);
          account.requirements.currently_due.forEach(req => {
            console.log(`   - ${req}`);
          });
        }

        if (account.requirements?.eventually_due?.length) {
          console.log(`\n📋 Requirements Eventually Due:`);
          account.requirements.eventually_due.forEach(req => {
            console.log(`   - ${req}`);
          });
        }

        if (account.requirements?.errors?.length) {
          console.log(`\n❌ Errors:`);
          account.requirements.errors.forEach(err => {
            console.log(`   - ${err.requirement}: ${err.reason}`);
          });
        }

        // Overall status
        console.log(`\n📈 Overall Status:`);
        if (account.payouts_enabled && account.charges_enabled) {
          console.log(`   ✅ READY - Can receive payments`);
        } else if (account.details_submitted) {
          console.log(`   ⏳ PENDING - Verification in progress`);
        } else {
          console.log(`   ⚠️  INCOMPLETE - Onboarding not finished`);
        }

        // Check capabilities issue
        const cardPayments = account.capabilities?.card_payments;
        const transfers = account.capabilities?.transfers;

        if (transfers && !cardPayments) {
          console.log(`\n❌ ISSUE DETECTED:`);
          console.log(`   Account has 'transfers' but not 'card_payments'`);
          console.log(`   This requires special Stripe approval`);
          console.log(`\n💡 Solution:`);
          console.log(`   Run: npx tsx scripts/fix-landlord-stripe-capabilities.ts`);
        }

      } catch (error: any) {
        if (error.code === 'account_invalid') {
          console.log(`\n❌ Account is INVALID`);
          console.log(`   This account needs to be recreated`);
          console.log(`\n💡 Solution:`);
          console.log(`   Run: npx tsx scripts/fix-landlord-stripe-capabilities.ts`);
        } else {
          console.error(`\n❌ Error: ${error.message}`);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}\n`);

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

checkAccountStatus(emailFilter)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
