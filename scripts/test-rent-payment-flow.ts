/**
 * Test Rent Payment Flow: Tenant → Landlord
 * 
 * This script simulates the complete rent payment flow:
 * 1. Creates a test PaymentIntent (like tenant initiating payment)
 * 2. Confirms the payment (simulates card/ACH payment)
 * 3. Verifies landlord receives funds via Connect transfer
 * 
 * DIRECT PAYMENT MODEL:
 * - Tenant pays rent
 * - Money goes directly to landlord's Stripe Connect account
 * - No platform fees (subscription model)
 * - Stripe takes their processing fee
 * 
 * RUN: npx ts-node scripts/test-rent-payment-flow.ts
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables - check .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  console.log('Loading .env.local');
  dotenv.config({ path: envLocalPath });
} else {
  console.log('Loading .env');
  dotenv.config({ path: envPath });
}

interface TestResult {
  step: string;
  success: boolean;
  details: Record<string, any>;
  error?: string;
}

async function main() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    process.exit(1);
  }

  console.log(`Using key: ${stripeSecretKey.substring(0, 12)}...`);

  if (!stripeSecretKey.startsWith('sk_test_')) {
    console.error('❌ This script only works in TEST mode (sk_test_...)');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey);
  const results: TestResult[] = [];

  console.log('\n💳 RENT PAYMENT FLOW TEST');
  console.log('='.repeat(60));
  console.log('\nThis simulates a tenant paying rent to a landlord.\n');

  // Test parameters
  const RENT_AMOUNT = 1500; // $1,500 rent
  const rentAmountCents = RENT_AMOUNT * 100;

  // Step 1: Get or create a test landlord Connect account
  console.log('📋 STEP 1: Setting up test landlord Connect account...');
  
  let landlordConnectId: string;
  
  // Check if we have existing test accounts
  let testAccounts: Record<string, any> = {};
  try {
    const data = fs.readFileSync('scripts/treasury-test-accounts.json', 'utf-8');
    testAccounts = JSON.parse(data);
    if (testAccounts.landlord?.connectedAccountId) {
      landlordConnectId = testAccounts.landlord.connectedAccountId;
      console.log(`   Using existing landlord account: ${landlordConnectId}`);
    }
  } catch {
    // No existing accounts, will create new one
  }

  if (!landlordConnectId!) {
    // Create a new test Connect account
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: 'test-landlord@example.com',
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          type: 'landlord',
          test: 'true',
        },
      });
      landlordConnectId = account.id;
      console.log(`   ✓ Created new landlord account: ${landlordConnectId}`);
      
      // Save for future use
      testAccounts.landlord = {
        connectedAccountId: landlordConnectId,
        email: 'test-landlord@example.com',
      };
      fs.writeFileSync('scripts/treasury-test-accounts.json', JSON.stringify(testAccounts, null, 2));
    } catch (error: any) {
      console.error(`   ❌ Failed to create account: ${error.message}`);
      process.exit(1);
    }
  }

  results.push({
    step: 'Setup Landlord Account',
    success: true,
    details: { accountId: landlordConnectId },
  });

  // Step 2: Check landlord account status
  console.log('\n📋 STEP 2: Checking landlord account status...');
  
  try {
    const account = await stripe.accounts.retrieve(landlordConnectId);
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Charges Enabled: ${account.charges_enabled}`);
    console.log(`   Payouts Enabled: ${account.payouts_enabled}`);
    console.log(`   Details Submitted: ${account.details_submitted}`);
    
    if (!account.charges_enabled) {
      console.log('\n   ⚠️  Account not fully onboarded - payments may fail');
      console.log('   In production, landlord would complete Stripe onboarding first.');
      console.log('   For testing, we\'ll proceed anyway...');
    }
    
    results.push({
      step: 'Check Account Status',
      success: true,
      details: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    results.push({
      step: 'Check Account Status',
      success: false,
      details: {},
      error: error.message,
    });
  }

  // Step 3: Create PaymentIntent with destination charge
  console.log('\n📋 STEP 3: Creating PaymentIntent (tenant initiates payment)...');
  console.log(`   Rent Amount: $${RENT_AMOUNT.toFixed(2)}`);
  console.log(`   Destination: ${landlordConnectId}`);
  
  let paymentIntent: Stripe.PaymentIntent;
  
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: rentAmountCents,
      currency: 'usd',
      // DIRECT PAYMENT: Money goes to landlord's Connect account
      transfer_data: {
        destination: landlordConnectId,
      },
      // No application_fee_amount - subscription model
      metadata: {
        type: 'rent_payment',
        tenantId: 'test-tenant-123',
        landlordId: 'test-landlord-456',
        rentAmount: rentAmountCents.toString(),
        test: 'true',
      },
      // For testing, we'll use automatic payment methods
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      confirm: false, // We'll confirm separately
    });

    console.log(`   ✓ PaymentIntent created: ${paymentIntent.id}`);
    console.log(`   Status: ${paymentIntent.status}`);
    console.log(`   Client Secret: ${paymentIntent.client_secret?.substring(0, 30)}...`);
    
    results.push({
      step: 'Create PaymentIntent',
      success: true,
      details: {
        paymentIntentId: paymentIntent.id,
        amount: RENT_AMOUNT,
        status: paymentIntent.status,
      },
    });
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    results.push({
      step: 'Create PaymentIntent',
      success: false,
      details: {},
      error: error.message,
    });
    printSummary(results);
    process.exit(1);
  }

  // Step 4: Confirm payment with test card
  console.log('\n📋 STEP 4: Confirming payment (simulating card payment)...');
  
  try {
    // Use Stripe's test payment method
    const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_visa', // Test Visa card
      return_url: 'https://example.com/return', // Required but not used in test
    });

    console.log(`   ✓ Payment confirmed!`);
    console.log(`   Status: ${confirmedPayment.status}`);
    console.log(`   Amount: $${(confirmedPayment.amount / 100).toFixed(2)}`);
    
    if (confirmedPayment.latest_charge) {
      const chargeId = typeof confirmedPayment.latest_charge === 'string' 
        ? confirmedPayment.latest_charge 
        : confirmedPayment.latest_charge.id;
      console.log(`   Charge ID: ${chargeId}`);
    }
    
    results.push({
      step: 'Confirm Payment',
      success: confirmedPayment.status === 'succeeded',
      details: {
        status: confirmedPayment.status,
        chargeId: confirmedPayment.latest_charge,
      },
    });

    paymentIntent = confirmedPayment;
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    
    // Common error: account not fully onboarded
    if (error.message.includes('destination')) {
      console.log('\n   💡 TIP: The landlord Connect account may not be fully onboarded.');
      console.log('   In test mode, you can use stripe.accounts.update() to enable charges.');
    }
    
    results.push({
      step: 'Confirm Payment',
      success: false,
      details: {},
      error: error.message,
    });
  }

  // Step 5: Check transfer to landlord
  console.log('\n📋 STEP 5: Verifying transfer to landlord...');
  
  if (paymentIntent.status === 'succeeded') {
    try {
      // Get the charge to find the transfer
      const chargeId = typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id;
      
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId, {
          expand: ['transfer'],
        });
        
        if (charge.transfer) {
          const transfer = typeof charge.transfer === 'string'
            ? await stripe.transfers.retrieve(charge.transfer)
            : charge.transfer;
          
          console.log(`   ✓ Transfer found: ${transfer.id}`);
          console.log(`   Amount transferred: $${(transfer.amount / 100).toFixed(2)}`);
          console.log(`   Destination: ${transfer.destination}`);
          
          // Calculate what landlord receives (after Stripe fees)
          const stripeFee = charge.balance_transaction 
            ? (typeof charge.balance_transaction === 'string' ? 0 : charge.balance_transaction.fee / 100)
            : 0;
          
          console.log(`   Stripe processing fee: ~$${stripeFee.toFixed(2)} (2.9% + $0.30)`);
          console.log(`   Landlord receives: $${(transfer.amount / 100).toFixed(2)}`);
          
          results.push({
            step: 'Verify Transfer',
            success: true,
            details: {
              transferId: transfer.id,
              amountTransferred: transfer.amount / 100,
              destination: transfer.destination,
            },
          });
        } else {
          console.log('   ⚠️  No transfer found on charge');
          results.push({
            step: 'Verify Transfer',
            success: false,
            details: {},
            error: 'No transfer found',
          });
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        step: 'Verify Transfer',
        success: false,
        details: {},
        error: error.message,
      });
    }
  } else {
    console.log('   ⏭️  Skipping - payment not succeeded');
  }

  // Step 6: Check landlord's Connect balance
  console.log('\n📋 STEP 6: Checking landlord Connect account balance...');
  
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: landlordConnectId,
    });
    
    const availableUSD = balance.available.find(b => b.currency === 'usd');
    const pendingUSD = balance.pending.find(b => b.currency === 'usd');
    
    console.log(`   Available: $${((availableUSD?.amount || 0) / 100).toFixed(2)}`);
    console.log(`   Pending: $${((pendingUSD?.amount || 0) / 100).toFixed(2)}`);
    
    results.push({
      step: 'Check Landlord Balance',
      success: true,
      details: {
        available: (availableUSD?.amount || 0) / 100,
        pending: (pendingUSD?.amount || 0) / 100,
      },
    });
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    results.push({
      step: 'Check Landlord Balance',
      success: false,
      details: {},
      error: error.message,
    });
  }

  // Print summary
  printSummary(results);
}

function printSummary(results: TestResult[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.step}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Rent payment flow is working correctly.');
    console.log('\nFlow Summary:');
    console.log('  1. Tenant initiates payment → PaymentIntent created');
    console.log('  2. Payment confirmed → Charge succeeds');
    console.log('  3. Transfer created → Money sent to landlord Connect account');
    console.log('  4. Landlord receives funds (minus Stripe processing fees)');
    console.log('\nNo platform fees - landlord pays subscription instead.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    console.log('\nCommon issues:');
    console.log('  - Landlord Connect account not fully onboarded');
    console.log('  - Invalid API key (must be sk_test_...)');
    console.log('  - Connect account capabilities not enabled');
  }
}

main().catch(console.error);
