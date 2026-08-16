/**
 * Test Wallet-to-Wallet Transfer (Intra-Stripe Flow)
 * 
 * This simulates the contractor marketplace flow:
 * 1. Landlord hires contractor for a job
 * 2. Landlord's wallet sends payment to contractor's wallet
 * 
 * Uses OutboundPayment with intra_stripe_flows feature.
 * 
 * RUN: npx ts-node scripts/treasury-test-transfer.ts
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

  const landlord = testAccounts.landlord;
  const contractor = testAccounts.contractor;

  if (!landlord?.financialAccountId || !contractor?.financialAccountId) {
    console.error('❌ Both landlord and contractor need financial accounts');
    console.log('Run treasury-create-financial-accounts.ts first');
    process.exit(1);
  }

  console.log('💸 Testing Wallet-to-Wallet Transfer\n');
  console.log('='.repeat(50));
  console.log('\nScenario: Landlord pays contractor for completed work order\n');

  // Transfer amount
  const TRANSFER_AMOUNT = 500; // $500 for a plumbing job

  console.log('📤 FROM (Landlord):');
  console.log(`   Account: ${landlord.connectedAccountId}`);
  console.log(`   Financial Account: ${landlord.financialAccountId}`);

  console.log('\n📥 TO (Contractor):');
  console.log(`   Account: ${contractor.connectedAccountId}`);
  console.log(`   Financial Account: ${contractor.financialAccountId}`);

  console.log(`\n💵 Amount: $${TRANSFER_AMOUNT.toFixed(2)}`);

  // Get initial balances
  console.log('\n--- Initial Balances ---');
  
  const landlordFA = await stripe.treasury.financialAccounts.retrieve(
    landlord.financialAccountId,
    {},
    { stripeAccount: landlord.connectedAccountId }
  );
  const landlordBalance = (landlordFA.balance?.cash?.usd || 0) / 100;
  console.log(`Landlord: $${landlordBalance.toFixed(2)}`);

  const contractorFA = await stripe.treasury.financialAccounts.retrieve(
    contractor.financialAccountId,
    {},
    { stripeAccount: contractor.connectedAccountId }
  );
  const contractorBalance = (contractorFA.balance?.cash?.usd || 0) / 100;
  console.log(`Contractor: $${contractorBalance.toFixed(2)}`);

  if (landlordBalance < TRANSFER_AMOUNT) {
    console.error(`\n❌ Insufficient funds! Landlord has $${landlordBalance.toFixed(2)}`);
    console.log('Run treasury-fund-test-accounts.ts to add funds');
    process.exit(1);
  }

  // For Treasury-to-Treasury transfers within the same platform,
  // In TEST MODE: We simulate both the debit and credit
  // In PRODUCTION: You'd use OutboundPayment with the destination's real bank details
  
  console.log('\n--- Creating Transfer (Test Mode Simulation) ---');

  try {
    // Step 1: Debit from landlord using OutboundTransfer to a test bank
    console.log('Step 1: Debiting landlord wallet...');
    
    const outboundTransfer = await stripe.treasury.outboundTransfers.create(
      {
        financial_account: landlord.financialAccountId,
        amount: TRANSFER_AMOUNT * 100,
        currency: 'usd',
        destination_payment_method: 'pm_usBankAccount', // Use default test payment method
        statement_descriptor: 'WO Payment',
        description: 'Work order payment',
      },
      { stripeAccount: landlord.connectedAccountId }
    );

    console.log(`✓ OutboundTransfer created: ${outboundTransfer.id}`);
    console.log(`  Status: ${outboundTransfer.status}`);

    // Step 2: Credit the contractor (simulating the receipt)
    console.log('\nStep 2: Crediting contractor wallet...');
    
    const receivedCredit = await stripe.testHelpers.treasury.receivedCredits.create(
      {
        financial_account: contractor.financialAccountId,
        amount: TRANSFER_AMOUNT * 100,
        currency: 'usd',
        network: 'ach',
        description: 'WO Payment', // Max 10 chars
      },
      { stripeAccount: contractor.connectedAccountId }
    );

    console.log(`✓ ReceivedCredit created: ${receivedCredit.id}`);
    console.log(`  Status: ${receivedCredit.status}`);

    // Get final balances
    console.log('\n--- Final Balances ---');
    
    const landlordFAFinal = await stripe.treasury.financialAccounts.retrieve(
      landlord.financialAccountId,
      {},
      { stripeAccount: landlord.connectedAccountId }
    );
    const landlordFinalBalance = (landlordFAFinal.balance?.cash?.usd || 0) / 100;
    const landlordPending = (landlordFAFinal.balance?.outbound_pending?.usd || 0) / 100;
    console.log(`Landlord: $${landlordFinalBalance.toFixed(2)} (pending outbound: $${landlordPending.toFixed(2)})`);

    const contractorFAFinal = await stripe.treasury.financialAccounts.retrieve(
      contractor.financialAccountId,
      {},
      { stripeAccount: contractor.connectedAccountId }
    );
    const contractorFinalBalance = (contractorFAFinal.balance?.cash?.usd || 0) / 100;
    const contractorPending = (contractorFAFinal.balance?.inbound_pending?.usd || 0) / 100;
    console.log(`Contractor: $${contractorFinalBalance.toFixed(2)} (pending inbound: $${contractorPending.toFixed(2)})`);

    console.log('\n✅ Transfer completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Landlord debited: $${TRANSFER_AMOUNT}`);
    console.log(`  - Contractor credited: $${TRANSFER_AMOUNT}`);

  } catch (error: any) {
    console.error(`\n❌ Transfer failed: ${error.message}`);
    
    // Try simpler approach - just credit/debit simulation
    console.log('\n--- Trying simplified simulation ---');
    
    try {
      // Just simulate the contractor receiving funds
      const receivedCredit = await stripe.testHelpers.treasury.receivedCredits.create(
        {
          financial_account: contractor.financialAccountId,
          amount: TRANSFER_AMOUNT * 100,
          currency: 'usd',
          network: 'ach',
          description: 'WO Payment',
        },
        { stripeAccount: contractor.connectedAccountId }
      );

      console.log(`✓ Contractor credited: ${receivedCredit.id}`);
      
      // Get final balances
      const contractorFAFinal = await stripe.treasury.financialAccounts.retrieve(
        contractor.financialAccountId,
        {},
        { stripeAccount: contractor.connectedAccountId }
      );
      const contractorFinalBalance = (contractorFAFinal.balance?.cash?.usd || 0) / 100;
      console.log(`Contractor new balance: $${contractorFinalBalance.toFixed(2)}`);
      
      console.log('\n✅ Simulation complete!');
      console.log('Note: In production, use OutboundPayment with real bank details');
      
    } catch (e: any) {
      console.error(`Simplified simulation also failed: ${e.message}`);
    }
  }
}

main().catch(console.error);
