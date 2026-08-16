/**
 * Check Treasury Requirements
 * 
 * Shows what's needed to activate Treasury on connected accounts
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
  const stripeSecretKey = process.env.STRIPE_TREASURY_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ No Stripe key found');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey);

  // Load test accounts
  let testAccounts: Record<string, any> = {};
  try {
    const data = fs.readFileSync('scripts/treasury-test-accounts.json', 'utf-8');
    testAccounts = JSON.parse(data);
  } catch {
    console.error('❌ No test accounts found');
    process.exit(1);
  }

  console.log('🔍 Checking Treasury Requirements\n');
  console.log('='.repeat(60));

  for (const [role, account] of Object.entries(testAccounts)) {
    if (!account.connectedAccountId) continue;

    console.log(`\n📋 ${role.toUpperCase()}: ${account.connectedAccountId}`);
    
    try {
      const connectedAccount = await stripe.accounts.retrieve(account.connectedAccountId);
      
      // Capabilities
      console.log('\n  Capabilities:');
      console.log(`    transfers: ${connectedAccount.capabilities?.transfers || 'not requested'}`);
      console.log(`    treasury: ${connectedAccount.capabilities?.treasury || 'not requested'}`);
      console.log(`    us_bank_account_ach_payments: ${connectedAccount.capabilities?.us_bank_account_ach_payments || 'not requested'}`);

      // Requirements
      console.log('\n  Requirements:');
      
      if (connectedAccount.requirements?.currently_due?.length) {
        console.log('    Currently Due:');
        connectedAccount.requirements.currently_due.forEach(req => {
          console.log(`      - ${req}`);
        });
      } else {
        console.log('    Currently Due: None ✓');
      }

      if (connectedAccount.requirements?.eventually_due?.length) {
        console.log('    Eventually Due:');
        connectedAccount.requirements.eventually_due.forEach(req => {
          console.log(`      - ${req}`);
        });
      }

      if (connectedAccount.requirements?.past_due?.length) {
        console.log('    ⚠️  Past Due:');
        connectedAccount.requirements.past_due.forEach(req => {
          console.log(`      - ${req}`);
        });
      }

      if (connectedAccount.requirements?.errors?.length) {
        console.log('    ❌ Errors:');
        connectedAccount.requirements.errors.forEach(err => {
          console.log(`      - ${err.requirement}: ${err.reason}`);
        });
      }

      // Future requirements for Treasury
      if (connectedAccount.future_requirements?.currently_due?.length) {
        console.log('    Future Requirements (for Treasury):');
        connectedAccount.future_requirements.currently_due.forEach(req => {
          console.log(`      - ${req}`);
        });
      }

      // External accounts
      console.log('\n  External Accounts:');
      if (connectedAccount.external_accounts?.data?.length) {
        connectedAccount.external_accounts.data.forEach((ext: any) => {
          console.log(`    - ${ext.object}: ****${ext.last4} (${ext.status || 'active'})`);
        });
      } else {
        console.log('    ⚠️  No external accounts - need to add bank account');
      }

      // Update JSON with latest status
      testAccounts[role].treasuryStatus = connectedAccount.capabilities?.treasury || 'not requested';

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  // Save updated status
  fs.writeFileSync(
    'scripts/treasury-test-accounts.json',
    JSON.stringify(testAccounts, null, 2)
  );

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 To activate Treasury, ensure:');
  console.log('   1. All "Currently Due" requirements are fulfilled');
  console.log('   2. External bank account is added');
  console.log('   3. Treasury is enabled on your Stripe platform');
  console.log('\n   Check: https://dashboard.stripe.com/test/settings/connect');
}

main().catch(console.error);
