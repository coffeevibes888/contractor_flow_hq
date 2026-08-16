/**
 * Create Financial Accounts for Treasury Test Accounts
 * 
 * Run this AFTER Treasury capability is active on your connected accounts.
 * 
 * RUN: npx ts-node scripts/treasury-create-financial-accounts.ts
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
  // Try Treasury-specific key first, fall back to regular key
  const stripeSecretKey = process.env.STRIPE_TREASURY_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY or STRIPE_TREASURY_SECRET_KEY not found');
    console.log('\nMake sure your .env file has one of these keys set.');
    process.exit(1);
  }

  console.log(`Using key: ${stripeSecretKey.substring(0, 12)}...`);

  const stripe = new Stripe(stripeSecretKey);

  // Load test accounts from previous setup
  let testAccounts: Record<string, any> = {};
  try {
    const data = fs.readFileSync('scripts/treasury-test-accounts.json', 'utf-8');
    testAccounts = JSON.parse(data);
  } catch {
    console.error('❌ No test accounts found. Run setup-treasury-test-accounts.ts first.');
    process.exit(1);
  }

  console.log('🏦 Creating Financial Accounts for Treasury\n');
  console.log('='.repeat(50));

  for (const [role, account] of Object.entries(testAccounts)) {
    if (!account.connectedAccountId) continue;

    console.log(`\n📝 Processing ${role}: ${account.email}`);
    console.log(`   Connected Account: ${account.connectedAccountId}`);

    try {
      // Check Treasury capability status
      const connectedAccount = await stripe.accounts.retrieve(account.connectedAccountId);
      const treasuryStatus = connectedAccount.capabilities?.treasury;

      console.log(`   Treasury Status: ${treasuryStatus || 'not requested'}`);

      if (treasuryStatus !== 'active') {
        console.log(`   ⚠️  Treasury not active yet - skipping`);
        continue;
      }

      // Check if financial account already exists
      const existingFAs = await stripe.treasury.financialAccounts.list(
        {},
        { stripeAccount: account.connectedAccountId }
      );

      if (existingFAs.data.length > 0) {
        const fa = existingFAs.data[0];
        console.log(`   ✓ Financial Account already exists: ${fa.id}`);
        
        // Get balance
        const balance = fa.balance?.cash?.usd || 0;
        console.log(`   💰 Balance: $${(balance / 100).toFixed(2)}`);

        // Get routing info
        const abaAddress = fa.financial_addresses?.find(a => a.type === 'aba')?.aba;
        if (abaAddress) {
          console.log(`   🏦 Routing: ${abaAddress.routing_number}`);
          console.log(`   🔢 Account: ****${abaAddress.account_number_last4}`);
        }

        testAccounts[role].financialAccountId = fa.id;
        testAccounts[role].balance = balance / 100;
        continue;
      }

      // Create new financial account
      console.log('   → Creating Financial Account...');

      const financialAccount = await stripe.treasury.financialAccounts.create(
        {
          supported_currencies: ['usd'],
          features: {
            financial_addresses: { aba: { requested: true } },
            deposit_insurance: { requested: true },
            inbound_transfers: { ach: { requested: true } },
            outbound_transfers: { ach: { requested: true } },
            outbound_payments: { ach: { requested: true } },
            intra_stripe_flows: { requested: true }, // IMPORTANT: For wallet-to-wallet
          },
        },
        { stripeAccount: account.connectedAccountId }
      );

      console.log(`   ✓ Created: ${financialAccount.id}`);

      // Get routing info
      const abaAddress = financialAccount.financial_addresses?.find(a => a.type === 'aba')?.aba;
      if (abaAddress) {
        console.log(`   🏦 Routing: ${abaAddress.routing_number}`);
        console.log(`   🔢 Account: ****${abaAddress.account_number_last4}`);
      }

      testAccounts[role].financialAccountId = financialAccount.id;
      testAccounts[role].balance = 0;

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Save updated accounts
  fs.writeFileSync(
    'scripts/treasury-test-accounts.json',
    JSON.stringify(testAccounts, null, 2)
  );

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY\n');

  for (const [role, account] of Object.entries(testAccounts)) {
    if (!account.connectedAccountId) continue;
    console.log(`${role.toUpperCase()}:`);
    console.log(`  Connected Account: ${account.connectedAccountId}`);
    console.log(`  Financial Account: ${account.financialAccountId || 'Not created'}`);
    console.log(`  Balance: $${account.balance?.toFixed(2) || '0.00'}`);
    console.log('');
  }

  console.log('💾 Updated scripts/treasury-test-accounts.json');
  console.log('\n✅ Done! Next: Run treasury-fund-test-accounts.ts to add test funds');
}

main().catch(console.error);
