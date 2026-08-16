/**
 * Test Stripe Connect Payment Flow (ACH Bank Transfer)
 * 
 * Simple test to verify tenant → landlord payment via Stripe Connect.
 * Uses ACH bank transfer for lower fees (0.8% capped at $5 vs 2.9% + $0.30 for cards).
 * 
 * In TEST MODE: Uses Custom accounts with test data to auto-enable capabilities.
 * 
 * RUN: npx ts-node scripts/test-connect-payment.ts
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: envPath });
}

async function main() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    process.exit(1);
  }

  console.log(`Using key: ${stripeSecretKey.substring(0, 12)}...`);

  if (!stripeSecretKey.startsWith('sk_test_')) {
    console.error('❌ This script only works in TEST mode');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey);

  console.log('\n🏦 STRIPE CONNECT ACH PAYMENT TEST');
  console.log('='.repeat(50));

  // Load or create test accounts
  let testAccounts: Record<string, any> = {};
  const accountsFile = 'scripts/connect-test-accounts.json';
  
  try {
    const data = fs.readFileSync(accountsFile, 'utf-8');
    testAccounts = JSON.parse(data);
    console.log('\n📂 Loaded existing test accounts');
  } catch {
    console.log('\n📂 No existing accounts, will create new ones');
  }

  // Step 1: Ensure we have a landlord Connect account (Custom type for test mode)
  console.log('\n--- STEP 1: Setup Landlord Connect Account ---');
  
  let landlordAccountId = testAccounts.landlord?.accountId;
  let needsSetup = !landlordAccountId;

  // Check if existing account is valid
  if (landlordAccountId) {
    try {
      const existing = await stripe.accounts.retrieve(landlordAccountId);
      if (!existing.charges_enabled) {
        console.log('   Existing account not enabled, will create new one...');
        needsSetup = true;
      }
    } catch {
      needsSetup = true;
    }
  }

  if (needsSetup) {
    console.log('Creating CUSTOM Connect account (type: custom) with test data...');
    
    // Use Custom account type - allows us to provide all required info
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'US',
      email: 'test-landlord@propertyflow.test',
      capabilities: {
        transfers: { requested: true },
        us_bank_account_ach_payments: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: '6513',
        product_description: 'Property management rent collection',
        url: 'https://propertyflow.test',
      },
      individual: {
        first_name: 'Test',
        last_name: 'Landlord',
        email: 'test-landlord@propertyflow.test',
        phone: '+15555555555',
        dob: { day: 1, month: 1, year: 1980 },
        address: {
          line1: '123 Test Street',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94111',
          country: 'US',
        },
        ssn_last_4: '0000',
        id_number: '000000000',
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: '127.0.0.1',
      },
      controller: {
        fees: { payer: 'application' },
        losses: { payments: 'application' },
        stripe_dashboard: { type: 'none' },
        requirement_collection: 'application',
      },
      external_account: {
        object: 'bank_account',
        country: 'US',
        currency: 'usd',
        routing_number: '110000000',
        account_number: '000123456789',
        account_holder_name: 'Test Landlord',
        account_holder_type: 'individual',
      },
      metadata: { type: 'landlord', test: 'true' },
    });

    landlordAccountId = account.id;
    testAccounts.landlord = {
      accountId: account.id,
      email: 'test-landlord@propertyflow.test',
      created: new Date().toISOString(),
    };

    console.log(`✓ Created account: ${account.id}`);
    fs.writeFileSync(accountsFile, JSON.stringify(testAccounts, null, 2));

    console.log('   Waiting for capabilities to activate...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log(`✓ Using existing account: ${landlordAccountId}`);
  }

  // Check account status
  const account = await stripe.accounts.retrieve(landlordAccountId);
  console.log(`  Charges enabled: ${account.charges_enabled}`);
  console.log(`  Payouts enabled: ${account.payouts_enabled}`);
  console.log(`  Transfers: ${account.capabilities?.transfers}`);
  console.log(`  ACH: ${account.capabilities?.us_bank_account_ach_payments}`);

  if (!account.charges_enabled && account.requirements?.currently_due?.length) {
    console.log('   Requirements:', account.requirements.currently_due.join(', '));
  }

  // Get initial balance
  let initialBalance = 0;
  try {
    const balance = await stripe.balance.retrieve({ stripeAccount: landlordAccountId });
    const pending = balance.pending.find(b => b.currency === 'usd');
    const available = balance.available.find(b => b.currency === 'usd');
    initialBalance = ((pending?.amount || 0) + (available?.amount || 0)) / 100;
    console.log(`  Current balance: $${initialBalance.toFixed(2)}`);
  } catch (e: any) {
    console.log(`  Balance: ${e.message}`);
  }

  // Step 2: Process ACH payment
  console.log('\n--- STEP 2: Process ACH Rent Payment ---');
  
  const RENT_AMOUNT = 1500;
  const ACH_FEE = Math.min(RENT_AMOUNT * 0.008, 5.00);
  
  console.log(`Rent: $${RENT_AMOUNT.toFixed(2)}`);
  console.log(`ACH fee: $${ACH_FEE.toFixed(2)} (0.8% capped at $5)`);

  try {
    console.log('\nCreating ACH PaymentIntent...');
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: RENT_AMOUNT * 100,
      currency: 'usd',
      transfer_data: { destination: landlordAccountId },
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] },
          verification_method: 'instant',
        },
      },
      metadata: {
        type: 'rent_payment',
        tenantEmail: 'tenant@test.com',
        paymentMethod: 'ach',
      },
    });

    console.log(`✓ PaymentIntent: ${paymentIntent.id}`);

    // Create test bank account
    console.log('Creating test bank account...');
    
    const pm = await stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: {
        account_holder_type: 'individual',
        account_number: '000123456789',
        routing_number: '110000000',
        account_type: 'checking',
      },
      billing_details: { name: 'Test Tenant', email: 'tenant@test.com' },
    });

    console.log(`✓ Payment Method: ${pm.id}`);

    // Confirm ACH payment
    console.log('Confirming ACH payment...');
    
    const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: pm.id,
      mandate_data: { customer_acceptance: { type: 'offline' } },
    });

    console.log(`✓ Status: ${confirmed.status}`);

    if (confirmed.status === 'processing') {
      console.log('\n📋 ACH Payment processing (3-5 business days)');
      
      testAccounts.lastTest = {
        date: new Date().toISOString(),
        paymentIntentId: paymentIntent.id,
        amount: RENT_AMOUNT,
        status: 'processing',
        paymentMethod: 'ach',
        estimatedFee: ACH_FEE,
      };
      fs.writeFileSync(accountsFile, JSON.stringify(testAccounts, null, 2));

      console.log('\n' + '='.repeat(50));
      console.log('✅ ACH PAYMENT INITIATED!\n');
      console.log(`  Tenant paid: $${RENT_AMOUNT.toFixed(2)}`);
      console.log(`  ACH fee: ~$${ACH_FEE.toFixed(2)}`);
      console.log(`  Landlord receives: ~$${(RENT_AMOUNT - ACH_FEE).toFixed(2)}`);
      console.log(`  Platform fee: $0.00`);
      console.log('\nWebhook fires when payment completes.');

    } else if (confirmed.status === 'succeeded') {
      console.log('\n✅ Payment succeeded!');
      
      const bal = await stripe.balance.retrieve({ stripeAccount: landlordAccountId });
      const pend = bal.pending.find(b => b.currency === 'usd');
      console.log(`  Landlord pending: $${((pend?.amount || 0) / 100).toFixed(2)}`);
    }

  } catch (error: any) {
    console.error(`\n❌ ACH failed: ${error.message}`);
    
    if (error.message.includes('transfers') || error.message.includes('destination')) {
      console.log('\n💡 Falling back to card payment...');
      await testCardPayment(stripe, landlordAccountId, RENT_AMOUNT);
    }
  }
}

async function testCardPayment(stripe: Stripe, accountId: string, amount: number) {
  console.log('\n--- Card Payment Fallback ---');
  
  try {
    const pi = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'usd',
      transfer_data: { destination: accountId },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });

    const confirmed = await stripe.paymentIntents.confirm(pi.id, {
      payment_method: 'pm_card_visa',
      return_url: 'https://example.com/return',
    });

    console.log(`✓ Card payment ${confirmed.status}`);
    
    if (confirmed.status === 'succeeded') {
      const bal = await stripe.balance.retrieve({ stripeAccount: accountId });
      const pend = bal.pending.find(b => b.currency === 'usd');
      console.log(`  Landlord pending: $${((pend?.amount || 0) / 100).toFixed(2)}`);
      console.log('\n✅ Card payment successful!');
      console.log(`  Note: Card fees are 2.9% + $0.30 vs ACH 0.8% capped at $5`);
    }
  } catch (e: any) {
    console.error(`  Card failed: ${e.message}`);
  }
}

main().catch(console.error);
