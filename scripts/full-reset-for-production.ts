/**
 * Full Reset for Production Script
 * 
 * WARNING: This will DELETE all test data including:
 * - All properties and units
 * - All leases and rent payments
 * - All tenants and applications
 * - All payouts and wallet data
 * - All maintenance tickets
 * - All messages and notifications
 * 
 * Only landlord accounts and users will be preserved (with Stripe data cleared)
 * 
 * Run with: npx ts-node scripts/full-reset-for-production.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function fullResetForProduction() {
  console.log('🚨 FULL PRODUCTION RESET 🚨\n');
  console.log('This will DELETE all test data!\n');

  try {
    // Delete in order of dependencies (child tables first)

    // 1. Notifications
    console.log('1. Deleting notifications...');
    const notifResult = await prisma.notification.deleteMany({});
    console.log(`   ✓ Deleted ${notifResult.count} notifications\n`);

    // 2. Messages and threads
    console.log('2. Deleting messages...');
    const msgResult = await prisma.message.deleteMany({});
    console.log(`   ✓ Deleted ${msgResult.count} messages`);
    try {
      const participantResult = await prisma.threadParticipant.deleteMany({});
      console.log(`   ✓ Deleted ${participantResult.count} thread participants`);
    } catch { /* table may not exist */ }
    const threadResult = await prisma.thread.deleteMany({});
    console.log(`   ✓ Deleted ${threadResult.count} threads`);
    try {
      const teamMsgResult = await prisma.teamMessage.deleteMany({});
      console.log(`   ✓ Deleted ${teamMsgResult.count} team messages\n`);
    } catch {
      console.log('   ⚠ No team messages or already empty\n');
    }

    // 3. Maintenance tickets
    console.log('3. Deleting maintenance tickets...');
    const ticketResult = await prisma.maintenanceTicket.deleteMany({});
    console.log(`   ✓ Deleted ${ticketResult.count} maintenance tickets\n`);

    // 4. Rent payments
    console.log('4. Deleting rent payments...');
    const rentResult = await prisma.rentPayment.deleteMany({});
    console.log(`   ✓ Deleted ${rentResult.count} rent payments\n`);

    // 5. Signature requests (skip if model doesn't exist)
    console.log('5. Skipping signature requests (handled by lease deletion)...\n');

    // 6. Leases
    console.log('6. Deleting leases...');
    const leaseResult = await prisma.lease.deleteMany({});
    console.log(`   ✓ Deleted ${leaseResult.count} leases\n`);

    // 7. Rental applications and verification
    console.log('7. Deleting rental applications...');
    const verifyResult = await prisma.applicationVerification.deleteMany({});
    console.log(`   ✓ Deleted ${verifyResult.count} verifications`);
    const appResult = await prisma.rentalApplication.deleteMany({});
    console.log(`   ✓ Deleted ${appResult.count} applications\n`);

    // 8. Property bank accounts
    console.log('8. Deleting property bank accounts...');
    const bankResult = await prisma.propertyBankAccount.deleteMany({});
    console.log(`   ✓ Deleted ${bankResult.count} property bank accounts\n`);

    // 9. Expenses
    console.log('9. Deleting expenses...');
    const expenseResult = await prisma.expense.deleteMany({});
    console.log(`   ✓ Deleted ${expenseResult.count} expenses\n`);

    // 10. Units
    console.log('10. Deleting units...');
    const unitResult = await prisma.unit.deleteMany({});
    console.log(`   ✓ Deleted ${unitResult.count} units\n`);

    // 11. Properties
    console.log('11. Deleting properties...');
    const propResult = await prisma.property.deleteMany({});
    console.log(`   ✓ Deleted ${propResult.count} properties\n`);

    // 12. Payouts and wallet data
    console.log('12. Clearing payout and wallet data...');
    const payoutResult = await prisma.payout.deleteMany({});
    console.log(`   ✓ Deleted ${payoutResult.count} payouts`);
    const walletTxResult = await prisma.walletTransaction.deleteMany({});
    console.log(`   ✓ Deleted ${walletTxResult.count} wallet transactions`);
    const walletResult = await prisma.landlordWallet.updateMany({
      data: {
        availableBalance: 0,
        pendingBalance: 0
      }
    });
    console.log(`   ✓ Reset ${walletResult.count} wallets to $0\n`);

    // 13. Clear Stripe Connect account IDs
    console.log('13. Clearing Stripe Connect accounts...');
    const landlordResult = await prisma.landlord.updateMany({
      data: {
        stripeConnectAccountId: null,
        stripeOnboardingStatus: null
      }
    });
    console.log(`   ✓ Cleared ${landlordResult.count} landlord Stripe accounts\n`);

    // 14. Subscription events (keep subscriptions, clear events)
    console.log('14. Clearing subscription events...');
    const subEventResult = await prisma.subscriptionEvent.deleteMany({});
    console.log(`   ✓ Deleted ${subEventResult.count} subscription events\n`);

    // 15. Cash payments
    console.log('15. Clearing cash payments...');
    try {
      const cashResult = await prisma.cashPayment.deleteMany({});
      console.log(`   ✓ Deleted ${cashResult.count} cash payments\n`);
    } catch {
      console.log('   ⚠ No cash payments table or already empty\n');
    }

    // 16. Invoices
    console.log('16. Clearing invoices...');
    try {
      const invoiceResult = await prisma.tenantInvoice.deleteMany({});
      console.log(`   ✓ Deleted ${invoiceResult.count} invoices\n`);
    } catch {
      console.log('   ⚠ No invoices table or already empty\n');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ FULL RESET COMPLETE!\n');
    console.log('What was preserved:');
    console.log('  • User accounts (login credentials)');
    console.log('  • Landlord records (but Stripe IDs cleared)');
    console.log('  • Subscription tiers\n');
    console.log('Next steps:');
    console.log('  1. Update STRIPE_WEBHOOK_SECRET in Vercel with live webhook secret');
    console.log('  2. Redeploy your app');
    console.log('  3. Go to /admin/payouts and complete Stripe Connect onboarding');
    console.log('  4. Add your first real property');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fullResetForProduction()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
