/**
 * Reset for Production Script
 * 
 * This script clears all test Stripe data to prepare for live mode:
 * - Clears Stripe Connect account IDs from landlords
 * - Clears test payouts
 * - Resets wallet balances (optional)
 * - Clears property bank accounts created with test keys
 * 
 * Run with: npx ts-node scripts/reset-for-production.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetForProduction() {
  console.log('🚀 Starting production reset...\n');

  try {
    // 1. Clear Stripe Connect account IDs from all landlords
    console.log('1. Clearing Stripe Connect account IDs...');
    const landlordResult = await prisma.landlord.updateMany({
      where: {
        stripeConnectAccountId: { not: null }
      },
      data: {
        stripeConnectAccountId: null
      }
    });
    console.log(`   ✓ Cleared ${landlordResult.count} landlord Connect accounts\n`);

    // 2. Delete all test payouts
    console.log('2. Deleting test payouts...');
    const payoutResult = await prisma.payout.deleteMany({});
    console.log(`   ✓ Deleted ${payoutResult.count} payouts\n`);

    // 3. Delete all wallet transactions
    console.log('3. Deleting wallet transactions...');
    const walletTxResult = await prisma.walletTransaction.deleteMany({});
    console.log(`   ✓ Deleted ${walletTxResult.count} wallet transactions\n`);

    // 4. Reset wallet balances to zero
    console.log('4. Resetting wallet balances...');
    const walletResult = await prisma.landlordWallet.updateMany({
      data: {
        availableBalance: 0,
        pendingBalance: 0,
        lifetimeEarnings: 0
      }
    });
    console.log(`   ✓ Reset ${walletResult.count} wallets\n`);

    // 5. Clear property bank accounts (created with test Stripe tokens)
    console.log('5. Clearing property bank accounts...');
    const bankAccountResult = await prisma.propertyBankAccount.deleteMany({});
    console.log(`   ✓ Deleted ${bankAccountResult.count} property bank accounts\n`);

    // 6. Clear test rent payments (optional - uncomment if needed)
    // console.log('6. Clearing test rent payments...');
    // const rentPaymentResult = await prisma.rentPayment.deleteMany({
    //   where: {
    //     stripePaymentIntentId: { startsWith: 'pi_' } // Test payment intents
    //   }
    // });
    // console.log(`   ✓ Deleted ${rentPaymentResult.count} test rent payments\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Production reset complete!\n');
    console.log('Next steps:');
    console.log('  1. Verify your .env has LIVE Stripe keys (sk_live_*, pk_live_*)');
    console.log('  2. Go to /admin/payouts and complete Stripe Connect onboarding');
    console.log('  3. Test a small real transaction before advertising');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetForProduction()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
