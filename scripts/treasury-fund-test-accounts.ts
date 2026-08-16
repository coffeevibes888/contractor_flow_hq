/**
 * Fund Treasury Test Accounts with Test Money
 * 
 * In TEST mode, you can use ReceivedCredits to simulate incoming funds.
 * This adds test money to your financial accounts.
 * 
 * RUN: npx ts-node scripts/treasury-fund-test-accounts.ts
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables - check .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: envPath });
}

async function main() {
  const stripeSecretKey = process.env.STRIPE_TREASURY_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY or STRIPE_TREASURY_SECRET_KEY not found');
    console.log('\nMake sure your .env file has one of these keys set.');
    process.exit(1);
  }

  console.log(`Using key: ${stripeSecretKey.substring(0, 12)}...`);

  if (!stripeSecretKey.startsWith('sk_test_')) {
    console.error('❌ This script only works in TEST mode');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey);

  // Load test accounts
  let testAccounts: Record<string, any> = {};
  try {
    const data = fs.readFileSync('scripts/treasury-test-accounts.json', 'utf-8');
    testAccounts = JSON.parse(data);
  } catch {
    console.error('❌ No test accounts found. Run previous scripts first.');
    process.exit(1);
  }

  console.log('💰 Funding Treasury Test Accounts\n');
  console.log('='.repeat(50));

  // Amount to fund each account (in dollars)
  const FUND_AMOUNT = 10000; // $10,000 for testing

  for (const [role, account] of Object.entries(testAccounts)) {
    if (!account.financialAccountId) {
      console.log(`\n⏭️  Skipping ${role} - no financial account`);
      continue;
    }

    console.log(`\n📝 Funding ${role}: ${account.email}`);
    console.log(`   Financial Account: ${account.financialAccountId}`);

    try {
      // In test mode, use test helpers to create a ReceivedCredit
      // This simulates money arriving in the financial account
      
      const receivedCredit = await stripe.testHelpers.treasury.receivedCredits.create(
        {
          financial_account: account.financialAccountId,
          amount: FUND_AMOUNT * 100, // Convert to cents
          currency: 'usd',
          network: 'ach',
          description: 'TestFund', // Max 10 chars for ACH
        },
        { stripeAccount: account.connectedAccountId }
      );

      console.log(`   ✓ Created ReceivedCredit: ${receivedCredit.id}`);
      console.log(`   💵 Amount: $${FUND_AMOUNT.toFixed(2)}`);
      console.log(`   📊 Status: ${receivedCredit.status}`);

      // Get updated balance
      const fa = await stripe.treasury.financialAccounts.retrieve(
        account.financialAccountId,
        {},
        { stripeAccount: account.connectedAccountId }
      );

      const newBalance = (fa.balance?.cash?.usd || 0) / 100;
      console.log(`   💰 New Balance: $${newBalance.toFixed(2)}`);

      testAccounts[role].balance = newBalance;

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      
      if (error.message.includes('test_helpers')) {
        console.log('\n   💡 TIP: Test helpers are only available in test mode.');
        console.log('   Make sure you\'re using sk_test_... key');
      }
    }
  }

  // Save updated balances
  fs.writeFileSync(
    'scripts/treasury-test-accounts.json',
    JSON.stringify(testAccounts, null, 2)
  );

  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL BALANCES\n');

  for (const [role, account] of Object.entries(testAccounts)) {
    if (!account.financialAccountId) continue;
    console.log(`${role.toUpperCase()}: $${account.balance?.toFixed(2) || '0.00'}`);
  }

  console.log('\n✅ Done! Accounts are funded and ready for testing.');
  console.log('\nNext: Run treasury-test-transfer.ts to test wallet-to-wallet transfers');
}

main().catch(console.error);
