/**
 * Test Stripe Connect Integration
 * 
 * This script tests the contractor Stripe Connect onboarding flow
 * Run with: npx tsx scripts/test-stripe-connect.ts
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

async function testStripeConnect() {
  console.log('🧪 Testing Stripe Connect Integration\n');

  try {
    // 1. Find a test contractor
    console.log('1️⃣ Finding test contractor...');
    const contractor = await prisma.contractor.findFirst({
      where: {
        email: { contains: 'test' },
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!contractor) {
      console.log('❌ No test contractor found. Creating one...');
      
      const user = await prisma.user.create({
        data: {
          email: `stripe-test-${Date.now()}@test.com`,
          name: 'Stripe Test Contractor',
          role: 'contractor',
        },
      });

      const newContractor = await prisma.contractor.create({
        data: {
          userId: user.id,
          email: user.email,
          businessName: 'Test Contracting LLC',
          phone: '555-0100',
        },
      });

      console.log('✅ Created test contractor:', newContractor.id);
      return testStripeConnect(); // Retry with new contractor
    }

    console.log('✅ Found contractor:', contractor.businessName || contractor.email);

    // 2. Check if Connect account exists
    console.log('\n2️⃣ Checking Stripe Connect account...');
    let connectAccountId = contractor.stripeConnectAccountId;

    if (!connectAccountId) {
      console.log('📝 Creating new Stripe Connect account...');
      
      const account = await stripe.accounts.create({
        type: 'express',
        email: contractor.email || contractor.user?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '1520',
          product_description: 'Contractor services for property management',
        },
        metadata: {
          contractorId: contractor.id,
          userId: contractor.userId,
          test: 'true',
        },
      });

      connectAccountId = account.id;

      await prisma.contractor.update({
        where: { id: contractor.id },
        data: {
          stripeConnectAccountId: connectAccountId,
          stripeOnboardingStatus: 'pending',
        },
      });

      console.log('✅ Created Connect account:', connectAccountId);
    } else {
      console.log('✅ Connect account exists:', connectAccountId);
    }

    // 3. Check account status
    console.log('\n3️⃣ Checking account status...');
    const account = await stripe.accounts.retrieve(connectAccountId);

    console.log('   Details submitted:', account.details_submitted);
    console.log('   Charges enabled:', account.charges_enabled);
    console.log('   Payouts enabled:', account.payouts_enabled);
    console.log('   Capabilities:', {
      card_payments: account.capabilities?.card_payments,
      transfers: account.capabilities?.transfers,
    });

    // 4. Create account session for onboarding
    console.log('\n4️⃣ Creating account session...');
    const accountSession = await stripe.accountSessions.create({
      account: connectAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
      },
    });

    console.log('✅ Account session created');
    console.log('   Client secret:', accountSession.client_secret.substring(0, 20) + '...');

    // 5. Alternative: Create account link
    console.log('\n5️⃣ Creating account link (alternative method)...');
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: 'http://localhost:3000/contractor/payouts?onboarding=refresh',
      return_url: 'http://localhost:3000/contractor/payouts?onboarding=complete',
      type: 'account_onboarding',
    });

    console.log('✅ Account link created');
    console.log('   URL:', accountLink.url);

    // 6. Test payment capability
    console.log('\n6️⃣ Testing payment capability...');
    if (account.payouts_enabled) {
      console.log('✅ Account can receive payouts');
      
      // Update local status
      await prisma.contractor.update({
        where: { id: contractor.id },
        data: {
          isPaymentReady: true,
          stripeOnboardingStatus: 'active',
        },
      });
    } else {
      console.log('⚠️  Account cannot receive payouts yet');
      console.log('   Contractor needs to complete onboarding');
      console.log('   Onboarding URL:', accountLink.url);
    }

    // 7. Summary
    console.log('\n📊 Summary:');
    console.log('   Contractor ID:', contractor.id);
    console.log('   Connect Account:', connectAccountId);
    console.log('   Status:', account.payouts_enabled ? 'Ready' : 'Pending');
    console.log('   Onboarding URL:', accountLink.url);

    console.log('\n✅ Stripe Connect test completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Visit the onboarding URL to complete setup');
    console.log('   2. Test the Connect Bank button in the UI');
    console.log('   3. Verify status updates in the database');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   Stripe error:', error.raw?.message);
    }
    throw error;
  }
}

// Run the test
testStripeConnect()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
