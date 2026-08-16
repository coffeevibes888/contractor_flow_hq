'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatError } from '@/lib/utils';
import { SERVER_URL } from '@/lib/constants';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { PAYOUT_FEES, calculatePayoutFee, getEstimatedArrival, type PayoutType } from '@/lib/config/payout-fees';
import { runPayoutSecurityChecks, logPayoutAttempt } from '@/lib/security/payout-security';
import { logFinancialEvent } from '@/lib/security/audit-logger';

function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(stripeSecretKey);
}

export async function addBankAccount(data: {
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

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    const stripe = getStripe();

    // Create a bank account token
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

    // Get or create Stripe customer for this landlord
    let customerId = landlord.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: landlord.name,
        metadata: {
          landlordId: landlord.id,
          type: 'landlord_payout',
        },
      });
      customerId = customer.id;

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Attach bank account to customer
    const bankAccount = await stripe.customers.createSource(customerId, {
      source: token.id,
    }) as Stripe.BankAccount;

    // Check if this should be default
    const existingMethods = await prisma.savedPayoutMethod.count({
      where: { landlordId: landlord.id },
    });

    // Save to database
    await prisma.savedPayoutMethod.create({
      data: {
        landlordId: landlord.id,
        stripePaymentMethodId: bankAccount.id,
        type: 'bank_account',
        accountHolderName: data.accountHolderName,
        last4: bankAccount.last4 || data.accountNumber.slice(-4),
        bankName: bankAccount.bank_name || 'Bank Account',
        accountType: data.accountType,
        routingNumber: data.routingNumber.slice(-4),
        isDefault: existingMethods === 0,
        isVerified: bankAccount.status === 'verified',
      },
    });

    revalidatePath('/admin/payouts');

    return {
      success: true,
      message: 'Bank account added successfully',
      bankAccountId: bankAccount.id,
      last4: bankAccount.last4,
    };
  } catch (error) {
    console.error('Error adding bank account:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= ADD DEBIT CARD FOR INSTANT PAYOUTS =============

/**
 * Add a debit card for instant payouts
 * NOTE: For security, card details should be collected client-side using Stripe Elements
 * and passed as a PaymentMethod ID. This function accepts a pre-created PaymentMethod.
 */
export async function addDebitCardFromPaymentMethod(paymentMethodId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    const stripe = getStripe();

    // Get or create Stripe customer
    let customerId = landlord.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: landlord.name,
        metadata: {
          landlordId: landlord.id,
          type: 'landlord_payout',
        },
      });
      customerId = customer.id;

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Attach payment method to customer
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    if (paymentMethod.type !== 'card' || !paymentMethod.card) {
      return { success: false, message: 'Invalid payment method type' };
    }

    // Verify it's a debit card (required for instant payouts)
    if (paymentMethod.card.funding !== 'debit') {
      // Detach the payment method since it's not debit
      await stripe.paymentMethods.detach(paymentMethodId);
      return { 
        success: false, 
        message: 'Only debit cards are accepted for instant payouts. Please use a debit card.' 
      };
    }

    // Check if this should be default
    const existingMethods = await prisma.savedPayoutMethod.count({
      where: { landlordId: landlord.id, type: 'card' },
    });

    // Save to database
    await prisma.savedPayoutMethod.create({
      data: {
        landlordId: landlord.id,
        stripePaymentMethodId: paymentMethod.id,
        type: 'card',
        accountHolderName: paymentMethod.billing_details.name || 'Debit Card',
        last4: paymentMethod.card.last4,
        bankName: paymentMethod.card.brand || 'Debit Card',
        isDefault: existingMethods === 0,
        isVerified: true,
      },
    });

    revalidatePath('/admin/payouts');

    return {
      success: true,
      message: 'Debit card added successfully',
      cardId: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
    };
  } catch (error) {
    console.error('Error adding debit card:', error);
    return { success: false, message: formatError(error) };
  }
}

/**
 * @deprecated Use addDebitCardFromPaymentMethod with client-side Stripe Elements
 */
export async function addDebitCard(data: {
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  cardholderName: string;
}) {
  // For security, raw card details should not be sent to the server
  // Instead, use Stripe Elements on the client to create a PaymentMethod
  // and call addDebitCardFromPaymentMethod with the PaymentMethod ID
  return {
    success: false,
    message: 'Please use Stripe Elements to securely add your card. Raw card details cannot be processed server-side.',
  };
}

// ============= LIST PAYOUT METHODS =============

export async function listPayoutMethods() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', methods: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message, methods: [] };
    }

    const methods = await prisma.savedPayoutMethod.findMany({
      where: { landlordId: landlordResult.landlord.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      methods: methods.map(m => ({
        id: m.id,
        stripeId: m.stripePaymentMethodId,
        type: m.type,
        last4: m.last4,
        bankName: m.bankName,
        accountType: m.accountType,
        accountHolderName: m.accountHolderName,
        isDefault: m.isDefault,
        isVerified: m.isVerified,
      })),
    };
  } catch (error) {
    console.error('Error listing payout methods:', error);
    return { success: false, message: formatError(error), methods: [] };
  }
}

// ============= REMOVE PAYOUT METHOD =============

export async function removePayoutMethod(methodId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    const method = await prisma.savedPayoutMethod.findFirst({
      where: { id: methodId, landlordId: landlord.id },
    });

    if (!method) {
      return { success: false, message: 'Payout method not found' };
    }

    // Remove from Stripe
    if (landlord.stripeCustomerId) {
      const stripe = getStripe();
      try {
        await stripe.customers.deleteSource(landlord.stripeCustomerId, method.stripePaymentMethodId);
      } catch {
        // Ignore if already deleted from Stripe
      }
    }

    // Remove from database
    await prisma.savedPayoutMethod.delete({
      where: { id: methodId },
    });

    // If this was default, make another one default
    if (method.isDefault) {
      const nextMethod = await prisma.savedPayoutMethod.findFirst({
        where: { landlordId: landlord.id },
        orderBy: { createdAt: 'desc' },
      });
      if (nextMethod) {
        await prisma.savedPayoutMethod.update({
          where: { id: nextMethod.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath('/admin/payouts');

    return { success: true, message: 'Payout method removed' };
  } catch (error) {
    console.error('Error removing payout method:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= SET DEFAULT PAYOUT METHOD =============

export async function setDefaultPayoutMethod(methodId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    // Unset all defaults
    await prisma.savedPayoutMethod.updateMany({
      where: { landlordId: landlord.id },
      data: { isDefault: false },
    });

    // Set new default
    await prisma.savedPayoutMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
    });

    revalidatePath('/admin/payouts');

    return { success: true, message: 'Default payout method updated' };
  } catch (error) {
    console.error('Error setting default payout method:', error);
    return { success: false, message: formatError(error) };
  }
}


// ============= CREATE PAYOUT =============

export interface CreatePayoutOptions {
  amount?: number; // If not provided, payout full available balance
  payoutMethodId?: string; // If not provided, use default
  payoutType?: PayoutType; // instant, same_day, or standard
}

export interface CreatePayoutResult {
  success: boolean;
  message: string;
  amount?: number;
  fee?: number;
  netAmount?: number;
  payoutId?: string;
  estimatedArrival?: string;
}

/**
 * Create a payout from landlord's available balance
 * Sends funds directly from YOUR platform Stripe account to landlord's bank/card
 */
export async function createPayout(options: CreatePayoutOptions = {}): Promise<CreatePayoutResult> {
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
    const payoutType = options.payoutType || 'standard';

    // Get wallet balance
    const wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId: landlord.id },
    });

    if (!wallet || Number(wallet.availableBalance) === 0) {
      return { success: false, message: 'No available balance to cash out.' };
    }

    const availableBalance = Number(wallet.availableBalance);
    const requestedAmount = options.amount || availableBalance;

    if (requestedAmount > availableBalance) {
      return { success: false, message: `Amount exceeds available balance of $${availableBalance.toFixed(2)}.` };
    }

    if (requestedAmount < 1) {
      return { success: false, message: 'Minimum payout is $1.00.' };
    }

    // Calculate fee
    const fee = calculatePayoutFee(requestedAmount, payoutType);
    const netAmount = requestedAmount - fee;

    if (netAmount <= 0) {
      return { success: false, message: 'Amount too small after fees.' };
    }

    // Get payout method
    let payoutMethod;
    if (options.payoutMethodId) {
      payoutMethod = await prisma.savedPayoutMethod.findFirst({
        where: { id: options.payoutMethodId, landlordId: landlord.id },
      });
    } else {
      payoutMethod = await prisma.savedPayoutMethod.findFirst({
        where: { landlordId: landlord.id, isDefault: true },
      });
    }

    if (!payoutMethod) {
      return { success: false, message: 'No payout method found. Please add a bank account or debit card.' };
    }

    // Validate payout type matches method
    if (payoutType === 'instant' && payoutMethod.type !== 'card') {
      return { success: false, message: 'Instant payouts require a debit card. Please add a debit card or choose a different payout speed.' };
    }

    if (!landlord.stripeCustomerId) {
      return { success: false, message: 'Payment setup incomplete. Please re-add your payout method.' };
    }

    // ============= SECURITY CHECKS =============
    const securityCheck = await runPayoutSecurityChecks({
      landlordId: landlord.id,
      amount: requestedAmount,
      payoutMethodId: payoutMethod.id,
    });

    if (!securityCheck.allowed) {
      return { success: false, message: securityCheck.reason || 'Payout blocked by security check.' };
    }

    // If large payout requires verification, return early
    if (securityCheck.requiresVerification) {
      return { 
        success: false, 
        message: securityCheck.reason || 'This payout requires additional verification.',
        // Could add a verification flow here in the future
      };
    }
    // ============= END SECURITY CHECKS =============

    const stripe = getStripe();

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        landlordId: landlord.id,
        amount: requestedAmount,
        status: 'pending',
        metadata: {
          payoutType,
          fee,
          netAmount,
          payoutMethodId: payoutMethod.id,
          payoutMethodLast4: payoutMethod.last4,
        },
      },
    });

    try {
      // For platform-held funds, we use Stripe Transfers to send money out
      // First, check your platform's available balance
      const balance = await stripe.balance.retrieve();
      const availableStripeBalance = balance.available.find(b => b.currency === 'usd')?.amount || 0;
      
      if (availableStripeBalance < Math.round(netAmount * 100)) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'failed' },
        });
        return { 
          success: false, 
          message: 'Insufficient platform balance. Please try again later or contact support.' 
        };
      }

      // Create payout to the landlord's bank account or card
      const stripePayout = await stripe.payouts.create({
        amount: Math.round(netAmount * 100),
        currency: 'usd',
        destination: payoutMethod.stripePaymentMethodId,
        method: payoutType === 'instant' ? 'instant' : 'standard',
        metadata: {
          landlordId: landlord.id,
          payoutId: payout.id,
          payoutType,
          originalAmount: requestedAmount.toString(),
          fee: fee.toString(),
        },
      });

      // Update payout record
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          stripeTransferId: stripePayout.id,
          status: 'paid',
          paidAt: new Date(),
        },
      });

      // Deduct from wallet (full amount including fee)
      await prisma.landlordWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: requestedAmount },
          lastPayoutAt: new Date(),
        },
      });

      // Record wallet transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'payout',
          amount: -requestedAmount,
          description: `${payoutType === 'instant' ? 'Instant' : payoutType === 'same_day' ? 'Same-day' : 'Standard'} payout to ****${payoutMethod.last4}`,
          status: 'completed',
          referenceId: payout.id,
          metadata: {
            payoutType,
            fee,
            netAmount,
            stripePayoutId: stripePayout.id,
          },
        },
      });

      // Record fee if any
      if (fee > 0) {
        await prisma.platformFee.create({
          data: {
            payoutId: payout.id,
            landlordId: landlord.id,
            amount: fee,
            type: `${payoutType}_payout_fee`,
          },
        });
      }

      revalidatePath('/admin/payouts');

      const estimatedArrival = getEstimatedArrival(payoutType);

      // Log successful payout for audit trail
      await logPayoutAttempt({
        landlordId: landlord.id,
        amount: requestedAmount,
        payoutMethodId: payoutMethod.id,
        status: 'success',
      });

      // Log payout completion to audit trail
      logFinancialEvent('PAYOUT_COMPLETED', {
        landlordId: landlord.id,
        amount: netAmount,
        currency: 'USD',
        transactionId: stripePayout.id,
        paymentMethod: payoutType,
        additionalData: {
          payoutId: payout.id,
          fee,
          payoutMethodLast4: payoutMethod.last4,
        },
      }).catch(console.error);

      return {
        success: true,
        message: `$${netAmount.toFixed(2)} sent to ****${payoutMethod.last4}. ${estimatedArrival}.`,
        amount: requestedAmount,
        fee,
        netAmount,
        payoutId: payout.id,
        estimatedArrival,
      };
    } catch (stripeError) {
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'failed' },
      });

      const err = stripeError as { message?: string; code?: string };
      console.error('Payout error:', err);
      
      // Log failed payout to audit trail
      logFinancialEvent('PAYOUT_FAILED', {
        landlordId: landlord.id,
        amount: requestedAmount,
        currency: 'USD',
        additionalData: {
          payoutId: payout.id,
          errorCode: err.code,
          errorMessage: err.message,
        },
      }).catch(console.error);
      
      // Provide helpful error messages
      if (err.code === 'balance_insufficient') {
        return { success: false, message: 'Platform balance insufficient. Please try again later.' };
      }
      if (err.code === 'invalid_bank_account') {
        return { success: false, message: 'Invalid bank account. Please update your payout method.' };
      }
      
      return { success: false, message: err.message || 'Failed to process payout.' };
    }
  } catch (error) {
    console.error('Error creating payout:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= GET PAYOUT PREVIEW =============

/**
 * Preview payout fees and net amount before confirming
 */
export async function getPayoutPreview(amount: number, payoutType: PayoutType = 'standard') {
  const fee = calculatePayoutFee(amount, payoutType);
  const netAmount = amount - fee;
  const estimatedArrival = getEstimatedArrival(payoutType);

  return {
    amount,
    fee,
    netAmount,
    payoutType,
    estimatedArrival,
    feeBreakdown: payoutType === 'instant' 
      ? `${PAYOUT_FEES.INSTANT.percentage}% (min $${PAYOUT_FEES.INSTANT.minimum.toFixed(2)})`
      : payoutType === 'same_day'
      ? `$${PAYOUT_FEES.SAME_DAY.flat.toFixed(2)} flat fee`
      : 'Free',
  };
}

// ============= GET WALLET SUMMARY =============

/**
 * Get complete wallet summary for landlord dashboard
 */
export async function getWalletSummary() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    const wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId: landlord.id },
    });

    if (!wallet) {
      return {
        success: true,
        summary: {
          availableBalance: 0,
          pendingBalance: 0,
          totalBalance: 0,
          pendingTransactions: [],
          recentPayouts: [],
        },
      };
    }

    // Get pending transactions with availability dates
    const pendingTransactions = await prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        status: 'pending',
        type: 'credit',
      },
      orderBy: { availableAt: 'asc' },
      take: 10,
    });

    // Get recent payouts
    const recentPayouts = await prisma.payout.findMany({
      where: { landlordId: landlord.id },
      orderBy: { initiatedAt: 'desc' },
      take: 5,
    });

    return {
      success: true,
      summary: {
        availableBalance: Number(wallet.availableBalance),
        pendingBalance: Number(wallet.pendingBalance),
        totalBalance: Number(wallet.availableBalance) + Number(wallet.pendingBalance),
        lastPayoutAt: wallet.lastPayoutAt,
        pendingTransactions: pendingTransactions.map(t => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description,
          availableAt: t.availableAt,
          createdAt: t.createdAt,
        })),
        recentPayouts: recentPayouts.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          status: p.status,
          initiatedAt: p.initiatedAt,
          paidAt: p.paidAt,
          metadata: p.metadata,
        })),
      },
    };
  } catch (error) {
    console.error('Error getting wallet summary:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= DEPRECATED: CONNECT ACCOUNT FUNCTIONS =============
// These are kept for backward compatibility but are no longer needed

/**
 * @deprecated No longer needed - landlords don't need Connect accounts
 */
export async function createConnectAccount() {
  return { 
    success: false, 
    message: 'Connect accounts are no longer required. Please add a bank account or debit card for payouts.' 
  };
}

/**
 * @deprecated No longer needed - landlords don't need Connect accounts
 */
export async function createConnectAccountSession() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    const stripe = getStripe();

    let connectAccountId = landlord.stripeConnectAccountId || undefined;

    if (connectAccountId) {
      try {
        const existing = await stripe.accounts.retrieve(connectAccountId);
        const hasCardPayments =
          existing.capabilities?.card_payments === 'active' ||
          existing.capabilities?.card_payments === 'pending';
        if (!hasCardPayments) {
          try {
            await stripe.accounts.update(connectAccountId, {
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
            });
          } catch {
            connectAccountId = undefined;
            await prisma.landlord.update({
              where: { id: landlord.id },
              data: { stripeConnectAccountId: null, stripeOnboardingStatus: 'not_started' },
            });
          }
        }
      } catch (retrieveError: any) {
        if (retrieveError?.code === 'account_invalid') {
          connectAccountId = undefined;
          await prisma.landlord.update({
            where: { id: landlord.id },
            data: { stripeConnectAccountId: null, stripeOnboardingStatus: 'not_started' },
          });
        } else {
          throw retrieveError;
        }
      }
    }

    if (!connectAccountId) {
      // Use explicit `controller` properties (newer Connect API) so loss
      // + fee responsibility lives on the platform. Required so Stripe
      // will issue Express dashboard sessions on platforms where the
      // dashboard "loss liability" toggle isn't surfaced.
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: 'application' },
          fees: { payer: 'application' },
          stripe_dashboard: { type: 'express' },
          requirement_collection: 'stripe',
        },
        country: 'US',
        email: session.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Property management software with rent collection and payouts',
        },
        metadata: {
          landlordId: landlord.id,
        },
      });

      connectAccountId = account.id;

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          stripeConnectAccountId: connectAccountId,
          stripeOnboardingStatus: 'pending',
        },
      });
    }

    const accountSession = await stripe.accountSessions.create({
      account: connectAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
      },
    });

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        stripeOnboardingStatus: 'pending',
      },
    });

    revalidatePath('/admin/payouts');

    return {
      success: true,
      accountId: connectAccountId,
      clientSecret: accountSession.client_secret,
    };
  } catch (error) {
    console.error('Error creating Connect account session:', error);
    return { success: false, message: formatError(error) };
  }
}

/**
 * @deprecated No longer needed - landlords don't need Connect accounts
 */
export async function getConnectAccountStatus() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    if (!landlord.stripeConnectAccountId) {
      return {
        success: true,
        status: {
          hasAccount: false,
          isOnboarded: false,
          canReceivePayouts: false,
          payoutsEnabled: false,
          chargesEnabled: false,
          bankAccountLast4: null,
        },
      };
    }

    const stripe = getStripe();

    try {
      const account = await stripe.accounts.retrieve(landlord.stripeConnectAccountId, {
        expand: ['external_accounts'],
      });

      const isOnboarded = account.details_submitted || false;
      const payoutsEnabled = account.payouts_enabled || false;
      const chargesEnabled = account.charges_enabled || false;
      const canReceivePayouts = payoutsEnabled;

      const externalAccounts = (account as any).external_accounts?.data as
        | Array<{ object?: string; last4?: string; type?: string }>
        | undefined;

      const bankAccountLast4 =
        externalAccounts?.find((a) => a.object === 'bank_account' || a.type === 'bank_account')?.last4 || null;

      let onboardingStatus = 'pending';

      if (isOnboarded && canReceivePayouts) {
        onboardingStatus = 'active';
      } else if (isOnboarded && !canReceivePayouts) {
        onboardingStatus = 'pending_verification';
      } else if ((account.requirements?.currently_due?.length ?? 0) > 0) {
        onboardingStatus = 'action_required';
      }

      if (landlord.stripeOnboardingStatus !== onboardingStatus) {
        await prisma.landlord.update({
          where: { id: landlord.id },
          data: { stripeOnboardingStatus: onboardingStatus },
        });
      }

      return {
        success: true,
        status: {
          hasAccount: true,
          isOnboarded,
          canReceivePayouts,
          payoutsEnabled,
          chargesEnabled,
          bankAccountLast4,
        },
      };
    } catch (stripeError: any) {
      if (stripeError?.code === 'account_invalid') {
        if (landlord.stripeOnboardingStatus !== 'invalid') {
          await prisma.landlord.update({
            where: { id: landlord.id },
            data: { stripeOnboardingStatus: 'invalid' },
          });
        }

        return {
          success: true,
          status: {
            hasAccount: true,
            isOnboarded: false,
            canReceivePayouts: false,
            payoutsEnabled: false,
            chargesEnabled: false,
            bankAccountLast4: null,
          },
        };
      }
      throw stripeError;
    }
  } catch (error) {
    console.error('Error getting Connect account status:', error);
    return { success: false, message: formatError(error) };
  }
}

/**
 * @deprecated Use createPayout instead
 */
export async function createOnboardingLink() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    const stripe = getStripe();

    let connectAccountId = landlord.stripeConnectAccountId || undefined;

    if (!connectAccountId) {
      // Use explicit `controller` properties (newer Connect API) so loss
      // + fee responsibility lives on the platform. Required so Stripe
      // will issue Express dashboard sessions on platforms where the
      // dashboard "loss liability" toggle isn't surfaced.
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: 'application' },
          fees: { payer: 'application' },
          stripe_dashboard: { type: 'express' },
          requirement_collection: 'stripe',
        },
        country: 'US',
        email: session.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Property management software with rent collection and payouts',
        },
        metadata: {
          landlordId: landlord.id,
        },
      });

      connectAccountId = account.id;

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          stripeConnectAccountId: connectAccountId,
          stripeOnboardingStatus: 'pending',
        },
      });
    }

    const urlBase = SERVER_URL;
    const returnUrl = `${urlBase}/admin/payouts`;
    const refreshUrl = `${urlBase}/admin/payouts`;

    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        stripeOnboardingStatus: 'pending',
      },
    });

    revalidatePath('/admin/payouts');

    return { success: true, url: accountLink.url };
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    return { success: false, message: formatError(error) };
  }
}
