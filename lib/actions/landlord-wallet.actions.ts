/**
 * Landlord Wallet & Bank Account Actions
 * Server actions for managing landlord wallets and bank account verification
 * 
 * Uses Stripe Financial Connections for instant bank verification (replaces Plaid)
 * - Free when used with Stripe payments
 * - Instant verification via OAuth bank login
 * - Falls back to micro-deposits if bank doesn't support instant verification
 */

'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { formatError } from '@/lib/utils';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';

// ============= SCHEMAS =============

const bankAccountSchema = z.object({
  accountHolderName: z.string().min(2, 'Account holder name is required'),
  routingNumber: z.string().length(9, 'Routing number must be 9 digits'),
  accountNumber: z.string().min(4, 'Account number is required'),
  accountType: z.enum(['checking', 'savings']),
  bankName: z.string().optional(),
});

// ============= STRIPE INITIALIZATION =============

function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(stripeSecretKey);
}

// ============= GET WALLET BALANCE =============

export async function getLandlordWallet() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', wallet: null };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, wallet: null };
    }

    const landlord = landlordResult.landlord;

    const wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId: landlord.id },
    });

    const recentPayouts = await prisma.payout.findMany({
      where: { landlordId: landlord.id },
      orderBy: { initiatedAt: 'desc' },
      take: 10,
    });

    return {
      success: true,
      wallet: {
        availableBalance: wallet ? Number(wallet.availableBalance) : 0,
        pendingBalance: wallet ? Number(wallet.pendingBalance) : 0,
        lastPayoutAt: recentPayouts[0]?.paidAt?.toISOString() || null,
      },
      recentTransactions: recentPayouts.map((p) => ({
        id: p.id,
        type: 'payout',
        amount: -Number(p.amount),
        description: 'Cash out to bank',
        status: p.status,
        createdAt: p.initiatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Error getting landlord wallet:', error);
    return { success: false, message: formatError(error), wallet: null };
  }
}

// ============= CREATE FINANCIAL CONNECTIONS SESSION =============

export async function createFinancialConnectionsSession() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    const stripe = getStripe();

    let stripeCustomerId = landlord.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: landlord.name,
        metadata: {
          landlordId: landlord.id,
          type: 'landlord_payout_account',
        },
      });
      stripeCustomerId = customer.id;

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { stripeCustomerId },
      });
    }

    const fcSession = await stripe.financialConnections.sessions.create({
      account_holder: {
        type: 'customer',
        customer: stripeCustomerId,
      },
      permissions: ['payment_method', 'balances'],
      filters: {
        countries: ['US'],
        account_subcategories: ['checking', 'savings'],
      },
      prefetch: ['balances'],
    });

    return {
      success: true,
      clientSecret: fcSession.client_secret,
      sessionId: fcSession.id,
    };
  } catch (error) {
    console.error('Error creating Financial Connections session:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= ATTACH FINANCIAL CONNECTIONS ACCOUNT =============

export async function attachFinancialConnectionsAccount(accountId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    const stripe = getStripe();

    if (!landlord.stripeCustomerId) {
      return { success: false, message: 'Stripe customer not found' };
    }

    const linkedAccount = await stripe.financialConnections.accounts.retrieve(accountId);

    const supportedPaymentMethods = linkedAccount.supported_payment_method_types || [];
    const supportsUsBankAccount = supportedPaymentMethods.includes('us_bank_account');

    const accountHolderName = (linkedAccount.account_holder as { name?: string })?.name 
      || landlord.name 
      || session.user.name 
      || 'Account Holder';

    let paymentMethodId: string;
    let isVerified = true;

    if (supportsUsBankAccount) {
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'us_bank_account',
        us_bank_account: {
          financial_connections_account: accountId,
        },
        billing_details: {
          name: accountHolderName,
          email: session.user.email || undefined,
        },
      });

      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: landlord.stripeCustomerId,
      });

      paymentMethodId = paymentMethod.id;
    } else {
      return {
        success: false,
        message: 'This bank does not support instant verification. Please use manual entry instead.',
        requiresManualEntry: true,
      };
    }

    const bankDetails = (await stripe.paymentMethods.retrieve(paymentMethodId)).us_bank_account;

    const existingMethod = await prisma.savedPayoutMethod.findFirst({
      where: { landlordId: landlord.id },
    });

    await prisma.savedPayoutMethod.create({
      data: {
        landlordId: landlord.id,
        stripePaymentMethodId: paymentMethodId,
        type: 'bank_account',
        accountHolderName,
        last4: bankDetails?.last4 || linkedAccount.last4 || '****',
        bankName: linkedAccount.institution_name || bankDetails?.bank_name || 'Bank',
        accountType: linkedAccount.subcategory === 'savings' ? 'savings' : 'checking',
        isDefault: !existingMethod,
        isVerified,
      },
    });

    revalidatePath('/admin/payouts');

    return {
      success: true,
      message: 'Bank account connected and verified!',
      bankAccountId: paymentMethodId,
      isVerified,
    };
  } catch (error) {
    console.error('Error attaching Financial Connections account:', error);
    
    const stripeError = error as { message?: string };
    if (stripeError?.message?.includes('supported_payment_method_types')) {
      return { 
        success: false, 
        message: 'This bank does not support instant verification. Please use manual entry instead.',
        requiresManualEntry: true,
      };
    }
    
    return { success: false, message: formatError(error) };
  }
}

// ============= ADD BANK ACCOUNT MANUALLY =============

export async function addBankAccountManual(data: z.infer<typeof bankAccountSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const validatedData = bankAccountSchema.parse(data);
    const landlord = landlordResult.landlord;
    const stripe = getStripe();

    let stripeCustomerId = landlord.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: landlord.name,
        metadata: {
          landlordId: landlord.id,
          type: 'landlord_payout_account',
        },
      });
      stripeCustomerId = customer.id;

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { stripeCustomerId },
      });
    }

    const bankAccountToken = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_holder_name: validatedData.accountHolderName,
        account_holder_type: 'individual',
        routing_number: validatedData.routingNumber,
        account_number: validatedData.accountNumber,
      },
    });

    const bankAccount = await stripe.customers.createSource(
      stripeCustomerId,
      { source: bankAccountToken.id }
    ) as Stripe.BankAccount;

    const existingMethod = await prisma.savedPayoutMethod.findFirst({
      where: { landlordId: landlord.id },
    });

    await prisma.savedPayoutMethod.create({
      data: {
        landlordId: landlord.id,
        stripePaymentMethodId: bankAccount.id,
        type: 'bank_account',
        accountHolderName: validatedData.accountHolderName,
        last4: bankAccount.last4 || validatedData.accountNumber.slice(-4),
        bankName: validatedData.bankName || bankAccount.bank_name || 'Bank',
        accountType: validatedData.accountType,
        routingNumber: validatedData.routingNumber,
        isDefault: !existingMethod,
        isVerified: bankAccount.status === 'verified',
      },
    });

    revalidatePath('/admin/payouts');

    const needsVerification = bankAccount.status !== 'verified';

    return {
      success: true,
      message: needsVerification
        ? 'Bank account added! Two small deposits will appear in 1-2 days to verify.'
        : 'Bank account added and verified!',
      bankAccountId: bankAccount.id,
      needsVerification,
      status: bankAccount.status,
    };
  } catch (error) {
    console.error('Error adding bank account:', error);

    const stripeError = error as { type?: string; message?: string };
    if (stripeError?.type === 'StripeInvalidRequestError') {
      return { success: false, message: stripeError.message || 'Invalid bank details' };
    }

    return { success: false, message: formatError(error) };
  }
}

// ============= VERIFY BANK ACCOUNT WITH MICRO-DEPOSITS =============

export async function verifyBankAccountMicroDeposits(
  bankAccountId: string,
  amounts: [number, number]
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    if (!landlord.stripeCustomerId) {
      return { success: false, message: 'Stripe customer not found' };
    }

    const stripe = getStripe();

    const bankAccount = await stripe.customers.verifySource(
      landlord.stripeCustomerId,
      bankAccountId,
      {
        amounts: [Math.round(amounts[0] * 100), Math.round(amounts[1] * 100)],
      }
    ) as Stripe.BankAccount;

    if (bankAccount.status === 'verified') {
      await prisma.savedPayoutMethod.updateMany({
        where: {
          stripePaymentMethodId: bankAccountId,
          landlordId: landlord.id,
        },
        data: { isVerified: true },
      });

      revalidatePath('/admin/payouts');

      return { success: true, message: 'Bank account verified successfully!' };
    } else {
      return { success: false, message: 'Verification failed. Please check the amounts.' };
    }
  } catch (error) {
    console.error('Error verifying bank account:', error);

    const stripeError = error as { code?: string };
    if (stripeError?.code === 'bank_account_verification_failed') {
      return { success: false, message: 'Incorrect amounts. Limited attempts remaining.' };
    }

    return { success: false, message: formatError(error) };
  }
}

// ============= GET PAYOUT METHODS =============

export async function getPayoutMethods() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', methods: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, methods: [] };
    }

    const methods = await prisma.savedPayoutMethod.findMany({
      where: { landlordId: landlordResult.landlord.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      methods: methods.map((m) => ({
        id: m.id,
        stripePaymentMethodId: m.stripePaymentMethodId,
        type: m.type,
        accountHolderName: m.accountHolderName,
        last4: m.last4,
        bankName: m.bankName,
        accountType: m.accountType,
        isDefault: m.isDefault,
        isVerified: m.isVerified,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), methods: [] };
  }
}

// ============= DELETE PAYOUT METHOD =============

export async function deletePayoutMethod(payoutMethodId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const method = await prisma.savedPayoutMethod.findFirst({
      where: {
        id: payoutMethodId,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!method) {
      return { success: false, message: 'Payout method not found' };
    }

    if (landlordResult.landlord.stripeCustomerId) {
      const stripe = getStripe();
      try {
        await stripe.customers.deleteSource(
          landlordResult.landlord.stripeCustomerId,
          method.stripePaymentMethodId
        );
      } catch {
        // Ignore if already removed
      }
    }

    await prisma.savedPayoutMethod.delete({
      where: { id: payoutMethodId },
    });

    revalidatePath('/admin/payouts');

    return { success: true, message: 'Payout method removed' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= SET DEFAULT PAYOUT METHOD =============

export async function setDefaultPayoutMethod(payoutMethodId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlordId = landlordResult.landlord.id;

    const method = await prisma.savedPayoutMethod.findFirst({
      where: { id: payoutMethodId, landlordId },
    });

    if (!method) {
      return { success: false, message: 'Payout method not found' };
    }

    await prisma.savedPayoutMethod.updateMany({
      where: { landlordId },
      data: { isDefault: false },
    });

    await prisma.savedPayoutMethod.update({
      where: { id: payoutMethodId },
      data: { isDefault: true },
    });

    revalidatePath('/admin/payouts');

    return { success: true, message: 'Default payout method updated' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= CASH OUT TO BANK =============

/**
 * Cash out available balance via Stripe Connect
 * Transfers funds to landlord's connected account
 */
export async function cashOutToBank(options: {
  amount?: number;
  instant?: boolean;
  payoutMethodId?: string;
}) {
  // Import and use the Connect payout function
  const { createPayout } = await import('./stripe-connect.actions');
  return createPayout(options);
}
