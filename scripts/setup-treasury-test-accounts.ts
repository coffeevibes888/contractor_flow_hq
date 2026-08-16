/**
 * Setup Treasury Test Accounts
 * 
 * This script creates Custom connected accounts with Treasury capability
 * and provisions Financial Accounts for testing.
 * 
 * PREREQUISITES:
 * 1. Activate Treasury in your Stripe Dashboard sandbox
 * 2. Use your TEST mode API keys (sk_test_...)
 * 
 * RUN: npx ts-node scripts/setup-treasury-test-accounts.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables - check .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: envPath });
}

// Test account emails
const TEST_ACCOUNTS = {
  landlord: {
    email: 'earthangelallen888@outlook.com',
    name: 'Test Landlord',
    type: 'landlord' as const,
  },
  tenant: {
    email: 'allenyoung1979@yahoo.com',
    name: 'Test Tenant',
    type: 'tenant' as const,
  },
  contractor: {
    email: 'warrioroflight778@outlook.com',
    name: 'Test Contractor',
    type: 'contractor' as const,
  },
};

// Test data for Custom account verification
const TEST_INDIVIDUAL = {
  first_name: 'Test',
  last_name: 'User',
  dob: { day: 1, month: 1, year: 1990 },
  address: {
    line1: '123 Test Street',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94111',
    country: 'US',
  },
  // Use Stripe test SSN for instant verification
  id_number: '000000000', // Test SSN that passes verification
  ssn_last_4: '0000',
};

async function main() {
  const stripeSecretKey = process.env.STRIPE_TREASURY_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY or STRIPE_TREASURY_SECRET_KEY not found in environment');
    console.log('Make sure you have a .env file with your Stripe test key');
    process.exit(1);
  }

  console.log(`Using key: ${stripeSecretKey.substring(0, 12)}...`);

  if (!stripeSecretKey.startsWith('sk_test_')) {
    console.error('❌ Please use TEST mode API key (sk_test_...)');
    console.log('Treasury testing should be done in test mode first');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey);

  console.log('🚀 Setting up Treasury Test Accounts\n');
  console.log('=' .repeat(50));

  const results: Record<string, any> = {};

  // Create accounts for landlord and contractor (they need Treasury)
  // Tenant doesn't need a connected account - they just pay rent
  
  for (const [role, config] of Object.entries(TEST_ACCOUNTS)) {
    if (role === 'tenant') {
      console.log(`\n⏭️  Skipping ${role} - tenants don't need Treasury accounts`);
      continue;
    }

    console.log(`\n📝 Creating ${role} account: ${config.email}`);
    
    try {
      // Step 1: Create Custom connected account with Treasury capability
      console.log('  → Creating Custom connected account...');
      
      const account = await stripe.accounts.create({
        country: 'US',
        email: config.email,
        capabilities: {
          transfers: { requested: true },
          treasury: { requested: true },
          us_bank_account_ach_payments: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name: config.name,
          mcc: role === 'landlord' ? '6513' : '1520',
          product_description: role === 'landlord' 
            ? 'Property management and rent collection'
            : 'Contractor services',
          url: 'https://propertyflowhq.com',
        },
        controller: {
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          stripe_dashboard: { type: 'none' },
          requirement_collection: 'application',
        },
        metadata: {
          role,
          testAccount: 'true',
        },
      });

      console.log(`  ✓ Connected account created: ${account.id}`);

      // Step 2: Add individual details for verification
      console.log('  → Adding individual details...');
      
      await stripe.accounts.update(account.id, {
        individual: {
          ...TEST_INDIVIDUAL,
          email: config.email,
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: '127.0.0.1',
        },
      });

      console.log('  ✓ Individual details added');

      // Step 3: Add external bank account (required for payouts)
      console.log('  → Adding test bank account...');
      
      await stripe.accounts.createExternalAccount(account.id, {
        external_account: {
          object: 'bank_account',
          country: 'US',
          currency: 'usd',
          routing_number: '110000000', // Stripe test routing number
          account_number: '000123456789', // Stripe test account number
          account_holder_name: config.name,
          account_holder_type: 'individual',
        },
      });

      console.log('  ✓ Test bank account added');

      // Step 4: Check capabilities status
      const updatedAccount = await stripe.accounts.retrieve(account.id);
      const treasuryStatus = updatedAccount.capabilities?.treasury;
      
      console.log(`  → Treasury capability status: ${treasuryStatus || 'pending'}`);

      // Step 5: Create Financial Account (if Treasury is active)
      let financialAccount = null;
      
      if (treasuryStatus === 'active') {
        console.log('  → Creating Financial Account...');
        
        financialAccount = await stripe.treasury.financialAccounts.create(
          {
            supported_currencies: ['usd'],
            features: {
              financial_addresses: { aba: { requested: true } },
              deposit_insurance: { requested: true },
              inbound_transfers: { ach: { requested: true } },
              outbound_transfers: { ach: { requested: true } },
              outbound_payments: { ach: { requested: true } },
              intra_stripe_flows: { requested: true },
            },
          },
          { stripeAccount: account.id }
        );

        console.log(`  ✓ Financial Account created: ${financialAccount.id}`);

        // Get routing info
        if (financialAccount.financial_addresses?.length > 0) {
          const aba = financialAccount.financial_addresses.find(a => a.type === 'aba')?.aba;
          if (aba) {
            console.log(`  → Routing: ${aba.routing_number}`);
            console.log(`  → Account: ****${aba.account_number_last4}`);
          }
        }
      } else {
        console.log('  ⚠️  Treasury not yet active - Financial Account creation skipped');
        console.log('     Run this script again after capabilities are verified');
      }

      results[role] = {
        email: config.email,
        connectedAccountId: account.id,
        treasuryStatus,
        financialAccountId: financialAccount?.id,
        status: 'created',
      };

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      
      // Log full error for debugging
      if (error.raw) {
        console.error(`  Raw error:`, JSON.stringify(error.raw, null, 2));
      }
      
      // Check if it's a capability error
      if (error.message.includes('treasury')) {
        console.log('\n  💡 TIP: Make sure you activated Treasury in your Stripe Dashboard:');
        console.log('     1. Go to Stripe Dashboard → Settings → Connect');
        console.log('     2. Click "Activate Issuing and Financial Accounts for platforms"');
        console.log('     3. Make sure you\'re in TEST mode');
      }
      
      results[role] = {
        email: config.email,
        error: error.message,
        status: 'failed',
      };
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY\n');

  for (const [role, result] of Object.entries(results)) {
    console.log(`${role.toUpperCase()}:`);
    console.log(`  Email: ${result.email}`);
    if (result.status === 'created') {
      console.log(`  Connected Account: ${result.connectedAccountId}`);
      console.log(`  Treasury Status: ${result.treasuryStatus || 'pending'}`);
      if (result.financialAccountId) {
        console.log(`  Financial Account: ${result.financialAccountId}`);
      }
    } else {
      console.log(`  Status: FAILED - ${result.error}`);
    }
    console.log('');
  }

  // Save results to file for reference
  const fs = await import('fs');
  fs.writeFileSync(
    'scripts/treasury-test-accounts.json',
    JSON.stringify(results, null, 2)
  );
  console.log('💾 Results saved to scripts/treasury-test-accounts.json');

  console.log('\n✅ Setup complete!');
  console.log('\nNEXT STEPS:');
  console.log('1. Check your Stripe Dashboard → Connect → Accounts');
  console.log('2. Verify the test accounts are created');
  console.log('3. If Treasury is pending, wait for capability verification');
  console.log('4. Run this script again to create Financial Accounts');
}

main().catch(console.error);
