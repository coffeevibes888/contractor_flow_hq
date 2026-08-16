/**
 * Contractor Payment Actions
 * 
 * Allows landlords to pay contractors directly from their wallet balance.
 * Payments are sent via ACH from YOUR platform Stripe account.
 */

'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatError } from '@/lib/utils';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';

function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(stripeSecretKey);
}

// ============= CONTRACTOR PAYMENT FEES =============
export const CONTRACTOR_PAYMENT_FEES = {
  STANDARD_ACH: {
    flat: 0, // Free standard ACH
    description: '1-2 business days',
  },
  SAME_DAY_ACH: {
    flat: 1.00,
    description: 'Same day if before 5pm ET',
  },
} as const;

export type ContractorPaymentSpeed = 'standard' | 'same_day';

// ============= PAY CONTRACTOR =============

export interface PayContractorOptions {
  contractorId: string;
  amount: number;
  description?: string;
  workOrderId?: string;
  paymentSpeed?: ContractorPaymentSpeed;
}

export interface PayContractorResult {
  success: boolean;
  message: string;
  paymentId?: string;
  amount?: number;
  fee?: number;
  estimatedArrival?: string;
}

/**
 * Pay a contractor from landlord's wallet balance
 */
export async function payContractor(options: PayContractorOptions): Promise<PayContractorResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message || 'Unable to get landlord' };
    }

    const landlord = landlordResult.landlord;
    const paymentSpeed = options.paymentSpeed || 'standard';

    // Validate amount
    if (options.amount < 1) {
      return { success: false, message: 'Minimum payment is $1.00' };
    }

    // Get contractor with their bank account info
    const contractor = await prisma.contractor.findFirst({
      where: {
        id: options.contractorId,
        landlordId: landlord.id,
      },
    });

    if (!contractor) {
      return { success: false, message: 'Contractor not found' };
    }

    // Check if contractor has bank account set up
    // Use type assertion since schema may not be regenerated yet
    const contractorData = contractor as typeof contractor & {
      stripeBankAccountId?: string | null;
      businessName?: string | null;
      contactName?: string | null;
    };

    if (!contractorData.stripeBankAccountId) {
      return { 
        success: false, 
        message: 'Contractor has not set up their bank account for payments. Please ask them to add their bank details.' 
      };
    }

    // Get wallet balance
    const wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId: landlord.id },
    });

    if (!wallet) {
      return { success: false, message: 'Wallet not found' };
    }

    // Calculate fee
    const fee = paymentSpeed === 'same_day' 
      ? CONTRACTOR_PAYMENT_FEES.SAME_DAY_ACH.flat 
      : CONTRACTOR_PAYMENT_FEES.STANDARD_ACH.flat;
    
    const totalDeduction = options.amount + fee;

    if (Number(wallet.availableBalance) < totalDeduction) {
      return { 
        success: false, 
        message: `Insufficient balance. You need $${totalDeduction.toFixed(2)} but only have $${Number(wallet.availableBalance).toFixed(2)} available.` 
      };
    }

    const stripe = getStripe();

    // Check platform Stripe balance
    const balance = await stripe.balance.retrieve();
    const availableStripeBalance = balance.available.find(b => b.currency === 'usd')?.amount || 0;
    
    if (availableStripeBalance < Math.round(options.amount * 100)) {
      return { 
        success: false, 
        message: 'Platform balance insufficient. Please try again later.' 
      };
    }

    // Get contractor display name
    const contractorName = contractorData.businessName || contractorData.contactName || contractor.name;

    // Create contractor payment record
    const paymentData: {
      contractorId: string;
      landlordId: string;
      amount: number;
      status: string;
      workOrderId?: string;
    } = {
      contractorId: contractor.id,
      landlordId: landlord.id,
      amount: options.amount,
      status: 'pending',
    };
    
    if (options.workOrderId) {
      paymentData.workOrderId = options.workOrderId;
    }

    const payment = await prisma.contractorPayment.create({
      data: paymentData as Parameters<typeof prisma.contractorPayment.create>[0]['data'],
    });

    try {
      // Create payout to contractor's bank account
      const payout = await stripe.payouts.create({
        amount: Math.round(options.amount * 100),
        currency: 'usd',
        destination: contractorData.stripeBankAccountId,
        method: 'standard', // ACH
        metadata: {
          type: 'contractor_payment',
          landlordId: landlord.id,
          contractorId: contractor.id,
          paymentId: payment.id,
          workOrderId: options.workOrderId || '',
        },
      });

      // Update payment record
      await prisma.contractorPayment.update({
        where: { id: payment.id },
        data: {
          stripeTransferId: payout.id,
          status: 'paid',
          paidAt: new Date(),
        },
      });

      // Deduct from landlord wallet
      await prisma.landlordWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: totalDeduction },
        },
      });

      // Record wallet transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'contractor_payment',
          amount: -totalDeduction,
          description: `Payment to ${contractorName}${options.workOrderId ? ' for work order' : ''}`,
          status: 'completed',
          referenceId: payment.id,
          metadata: {
            contractorId: contractor.id,
            contractorName,
            paymentSpeed,
            fee,
            workOrderId: options.workOrderId,
          },
        },
      });

      revalidatePath('/admin/contractors');
      revalidatePath('/admin/payouts');

      const estimatedArrival = paymentSpeed === 'same_day' 
        ? 'Today by end of day' 
        : '1-2 business days';

      return {
        success: true,
        message: `$${options.amount.toFixed(2)} sent to ${contractorName}. ${estimatedArrival}.`,
        paymentId: payment.id,
        amount: options.amount,
        fee,
        estimatedArrival,
      };
    } catch (stripeError) {
      await prisma.contractorPayment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });

      const err = stripeError as { message?: string };
      console.error('Contractor payment error:', err);
      return { success: false, message: err.message || 'Failed to process payment' };
    }
  } catch (error) {
    console.error('Error paying contractor:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= GET CONTRACTOR PAYMENT HISTORY =============

export async function getContractorPaymentHistory(contractorId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', payments: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message, payments: [] };
    }

    const where: { landlordId: string; contractorId?: string } = {
      landlordId: landlordResult.landlord.id,
    };

    if (contractorId) {
      where.contractorId = contractorId;
    }

    const payments = await prisma.contractorPayment.findMany({
      where,
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      payments: payments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        contractorName: p.contractor.name,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
    };
  } catch (error) {
    console.error('Error getting contractor payment history:', error);
    return { success: false, message: formatError(error), payments: [] };
  }
}

// ============= CONTRACTOR BANK ACCOUNT SETUP =============

/**
 * Add bank account for a contractor (called by contractor)
 */
export async function addContractorBankAccount(data: {
  contractorId: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // Verify the user is this contractor
    const contractor = await prisma.contractor.findFirst({
      where: {
        id: data.contractorId,
        userId: session.user.id,
      },
    });

    if (!contractor) {
      return { success: false, message: 'Contractor not found or access denied' };
    }

    const stripe = getStripe();

    // Create bank account token
    const token = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_holder_name: data.accountHolderName,
        account_holder_type: 'individual',
        routing_number: data.routingNumber,
        account_number: data.accountNumber,
      },
    });

    // Use type assertion for fields that may not be in generated types yet
    const contractorData = contractor as typeof contractor & {
      stripeCustomerId?: string | null;
    };

    // Create or get Stripe customer for contractor
    let customerId = contractorData.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: data.accountHolderName,
        metadata: {
          contractorId: contractor.id,
          type: 'contractor',
        },
      });
      customerId = customer.id;
    }

    // Attach bank account
    const bankAccount = await stripe.customers.createSource(customerId, {
      source: token.id,
    }) as Stripe.BankAccount;

    // Update contractor record with new fields
    await prisma.$executeRaw`
      UPDATE "Contractor" 
      SET "stripeCustomerId" = ${customerId},
          "stripeBankAccountId" = ${bankAccount.id},
          "bankAccountLast4" = ${bankAccount.last4},
          "bankName" = ${bankAccount.bank_name}
      WHERE id = ${contractor.id}::uuid
    `;

    revalidatePath('/contractor/settings');

    return {
      success: true,
      message: 'Bank account added successfully',
      last4: bankAccount.last4,
      bankName: bankAccount.bank_name,
    };
  } catch (error) {
    console.error('Error adding contractor bank account:', error);
    return { success: false, message: formatError(error) };
  }
}
