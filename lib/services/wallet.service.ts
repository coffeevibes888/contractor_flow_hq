/**
 * Wallet Service
 * Handles crediting landlord wallets when rent payments are received
 * 
 * PLATFORM-HELD FUNDS MODEL:
 * - All payments go to YOUR platform Stripe account
 * - Funds are held in pending until Stripe releases them (2 days card, 5-7 days ACH)
 * - Once available, landlords can cash out via instant/same-day/standard
 */

import { prisma } from '@/db/prisma';

// Hold periods based on payment method (business days)
const HOLD_PERIODS = {
  card: 2,           // Card payments: 2 business days
  us_bank_account: 5, // ACH: 5-7 business days (using 5 as minimum)
  ach_debit: 5,
  link: 2,           // Stripe Link: same as card
  apple_pay: 2,
  google_pay: 2,
  default: 2,
};

/**
 * Calculate when funds will be available based on payment method
 */
function calculateAvailableAt(paymentMethod: string): Date {
  const holdDays = HOLD_PERIODS[paymentMethod as keyof typeof HOLD_PERIODS] || HOLD_PERIODS.default;
  
  const availableAt = new Date();
  let daysAdded = 0;
  
  // Add business days (skip weekends)
  while (daysAdded < holdDays) {
    availableAt.setDate(availableAt.getDate() + 1);
    const dayOfWeek = availableAt.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return availableAt;
}

interface CreditWalletParams {
  landlordId: string;
  amount: number;
  paymentMethod: string;
  description: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Credit a landlord's wallet when a rent payment is received
 * 
 * PLATFORM-HELD MODEL:
 * - ALL payments go to pendingBalance first
 * - Funds move to availableBalance when Stripe releases them to your account
 * - Card: 2 business days, ACH: 5-7 business days
 */
export async function creditLandlordWallet({
  landlordId,
  amount,
  paymentMethod,
  description,
  referenceId,
  metadata,
}: CreditWalletParams) {
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
  }

  // Calculate when funds will be available
  const availableAt = calculateAvailableAt(paymentMethod);
  const holdDays = HOLD_PERIODS[paymentMethod as keyof typeof HOLD_PERIODS] || HOLD_PERIODS.default;

  // ALL payments go to pending first (platform-held model)
  await prisma.landlordWallet.update({
    where: { id: wallet.id },
    data: {
      pendingBalance: { increment: amount },
    },
  });

  // Record wallet transaction with availableAt date
  const transaction = await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: 'credit',
      amount,
      description,
      status: 'pending',
      referenceId,
      availableAt,
      metadata: {
        ...metadata,
        paymentMethod,
        holdDays,
      },
    },
  });

  // ✅ NEW: Emit event for pending payment (replaces cron job)
  try {
    const { dbTriggers } = await import('@/lib/event-system');
    await dbTriggers.onPaymentCreate(transaction);
  } catch (error) {
    console.error('Failed to emit payment event:', error);
  }

  return { 
    success: true, 
    availableAt,
    holdDays,
    paymentMethod,
  };
}

/**
 * Move pending balance to available balance
 * Called by cron job when funds are ready (based on availableAt date)
 */
export async function releasePendingBalance(transactionId: string) {
  const transaction = await prisma.walletTransaction.findUnique({
    where: { id: transactionId },
    include: { wallet: true },
  });

  if (!transaction || transaction.status !== 'pending') {
    return { success: false, message: 'Transaction not found or not pending' };
  }

  const amount = Number(transaction.amount);

  await prisma.$transaction([
    // Move from pending to available
    prisma.landlordWallet.update({
      where: { id: transaction.walletId },
      data: {
        pendingBalance: { decrement: amount },
        availableBalance: { increment: amount },
      },
    }),
    // Update transaction status
    prisma.walletTransaction.update({
      where: { id: transactionId },
      data: { status: 'completed' },
    }),
  ]);

  return { success: true };
}

/**
 * Get wallet balance for a landlord
 */
export async function getWalletBalance(landlordId: string) {
  const wallet = await prisma.landlordWallet.findUnique({
    where: { landlordId },
  });

  if (!wallet) {
    return {
      availableBalance: 0,
      pendingBalance: 0,
      totalBalance: 0,
    };
  }

  return {
    availableBalance: Number(wallet.availableBalance),
    pendingBalance: Number(wallet.pendingBalance),
    totalBalance: Number(wallet.availableBalance) + Number(wallet.pendingBalance),
  };
}

/**
 * Get pending transactions with their availability dates
 */
export async function getPendingTransactions(landlordId: string) {
  const wallet = await prisma.landlordWallet.findUnique({
    where: { landlordId },
  });

  if (!wallet) {
    return [];
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
      status: 'pending',
      type: 'credit',
    },
    orderBy: { availableAt: 'asc' },
  });

  return transactions.map(t => ({
    id: t.id,
    amount: Number(t.amount),
    description: t.description,
    availableAt: t.availableAt,
    createdAt: t.createdAt,
    metadata: t.metadata as Record<string, unknown>,
  }));
}
