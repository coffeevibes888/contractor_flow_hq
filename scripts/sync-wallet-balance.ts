/**
 * One-time script to sync existing paid rent payments to landlord wallets
 * Run with: npx tsx scripts/sync-wallet-balance.ts
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

async function syncWalletBalances() {
  console.log('Starting wallet balance sync...\n');

  // Get all paid rent payments that haven't been credited to wallet
  const paidRentPayments = await prisma.rentPayment.findMany({
    where: {
      status: 'paid',
      paidAt: { not: null },
    },
    include: {
      lease: {
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenant: {
            select: { name: true },
          },
        },
      },
    },
  });

  console.log(`Found ${paidRentPayments.length} paid rent payments\n`);

  // Group by landlord
  const landlordPayments = new Map<string, typeof paidRentPayments>();
  
  for (const payment of paidRentPayments) {
    const landlordId = payment.lease.unit.property.landlordId;
    if (!landlordId) continue;
    
    if (!landlordPayments.has(landlordId)) {
      landlordPayments.set(landlordId, []);
    }
    landlordPayments.get(landlordId)!.push(payment);
  }

  console.log(`Processing ${landlordPayments.size} landlords...\n`);

  for (const [landlordId, payments] of landlordPayments) {
    // Get or create wallet
    let wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId },
    });

    if (!wallet) {
      wallet = await prisma.landlordWallet.create({
        data: {
          landlordId,
          availableBalance: 0,
          pendingBalance: 0,
        },
      });
      console.log(`Created wallet for landlord ${landlordId}`);
    }

    // Check which payments are already credited
    const existingTransactions = await prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        type: 'credit',
      },
      select: { referenceId: true },
    });

    const creditedPaymentIds = new Set(existingTransactions.map(t => t.referenceId));

    // Credit uncredited payments
    let totalCredited = 0;
    for (const payment of payments) {
      if (creditedPaymentIds.has(payment.id)) {
        continue; // Already credited
      }

      const amount = Number(payment.amount);
      const isACH = payment.paymentMethod === 'us_bank_account' || payment.paymentMethod === 'ach_debit';

      // For historical payments, credit directly to available (they've already cleared)
      await prisma.landlordWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: amount },
        },
      });

      // Record transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'credit',
          amount,
          description: `Rent payment from ${payment.lease.tenant?.name || 'Tenant'} (synced)`,
          status: 'completed',
          referenceId: payment.id,
          metadata: {
            type: 'rent_payment',
            synced: true,
            originalPaymentMethod: payment.paymentMethod,
          },
        },
      });

      totalCredited += amount;
    }

    if (totalCredited > 0) {
      console.log(`Landlord ${landlordId}: Credited $${totalCredited.toFixed(2)}`);
    }
  }

  console.log('\nWallet sync complete!');
}

syncWalletBalances()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
