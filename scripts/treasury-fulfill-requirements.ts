/**
 * Fulfill Treasury Requirements
 * 
 * Adds missing phone and accepts Treasury ToS for test accounts
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

  console.log('🔧 Fulfilling Treasury Requirements\n');
  console.log('='.repeat(60));

  for (const [role, account] of Object.entries(testAccounts)) {
    if (!account.connectedAccountId) continue;

    console.log(`\n📋 ${role.toUpperCase()}: ${account.connectedAccountId}`);
    
    try {
      // Update account with phone and Treasury ToS
      console.log('  → Adding phone number...');
      console.log('  → Accepting Treasury ToS...');
      
      await stripe.accounts.update(account.connectedAccountId, {
        individual: {
          phone: '+15555555555', // Test phone number
        },
        settings: {
          treasury: {
            tos_acceptance: {
              date: Math.floor(Date.now() / 1000),
              ip: '127.0.0.1',
            },
          },
        },
      });

      console.log('  ✓ Requirements fulfilled!');

      // Check updated status
      const updated = await stripe.accounts.retrieve(account.connectedAccountId);
      const treasuryStatus = updated.capabilities?.treasury;
      
      console.log(`  → Treasury status: ${treasuryStatus}`);
      
      testAccounts[role].treasuryStatus = treasuryStatus;

      if (treasuryStatus === 'active') {
        console.log('  🎉 Treasury is now ACTIVE!');
      } else if (treasuryStatus === 'pending') {
        console.log('  ⏳ Treasury is pending verification...');
      } else {
        // Check remaining requirements
        if (updated.requirements?.currently_due?.length) {
          console.log('  Still needed:');
          updated.requirements.currently_due.forEach(req => {
            console.log(`    - ${req}`);
          });
        }
      }

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      if (error.raw) {
        console.error(`  Details:`, JSON.stringify(error.raw, null, 2));
      }
    }
  }

  // Save updated status
  fs.writeFileSync(
    'scripts/treasury-test-accounts.json',
    JSON.stringify(testAccounts, null, 2)
  );

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Done! Run treasury-check-requirements.ts again to verify.');
}

main().catch(console.error);
