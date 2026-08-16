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

export interface ExternalBankAccount {
  id: string;
  last4: string;
  bankName: string | null;
  routingNumber: string | null;
  accountHolderName: string | null;
  accountHolderType: string | null;
  currency: string;
  country: string;
  status: string | null;
  isDefault: boolean;
}

/**
 * List all external bank accounts on the landlord's Stripe Connect account
 */
export async function listConnectBankAccounts() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', accounts: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return { success: false, message: landlordResult.message, accounts: [] };
    }

    const landlord = landlordResult.landlord;

    if (!landlord.stripeConnectAccountId) {
      return { 
        success: true, 
        message: 'No Stripe Connect account', 
        accounts: [],
        hasConnectAccount: false,
      };
    }

    const stripe = getStripe();

    const account = await stripe.accounts.retrieve(landlord.stripeConnectAccountId, {
      expand: ['external_accounts'],
    });

    const externalAccounts = account.external_accounts?.data || [];
    
    const bankAccounts: ExternalBankAccount[] = externalAccounts
      .filter((acc): acc is Stripe.BankAccount => acc.object === 'bank_account')
      .map((bank) => ({
        id: bank.id,
        last4: bank.last4 || '',
        bankName: bank.bank_name || null,
        routingNumber: bank.routing_number || null,
        accountHolderName: bank.account_holder_name || null,
        accountHolderType: bank.account_holder_type || null,
        currency: bank.currency,
        country: bank.country,
        status: bank.status || null,
        isDefault: bank.default_for_currency || false,
      }));

    return {
      success: true,
      accounts: bankAccounts,
      hasConnectAccount: true,
      isOnboarded: account.details_submitted || false,
      payoutsEnabled: account.payouts_enabled || false,
    };
  } catch (error) {
    console.error('Error listing Connect bank accounts:', error);
    return { success: false, message: formatError(error), accounts: [] };
  }
}

/**
 * Add a new bank account to the landlord's Stripe Connect account
 */
export async function addConnectBankAccount(data: {
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  setAsDefault?: boolean;
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

    if (!landlord.stripeConnectAccountId) {
      return { 
        success: false, 
        message: 'Please complete Stripe onboarding first before adding a bank account.',
        needsOnboarding: true,
      };
    }

    const stripe = getStripe();

    // Create a bank account token first
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

    // Add the bank account to the Connect account
    const externalAccount = await stripe.accounts.createExternalAccount(
      landlord.stripeConnectAccountId,
      {
        external_account: token.id,
        default_for_currency: data.setAsDefault || false,
      }
    ) as Stripe.BankAccount;

    revalidatePath('/admin/payouts');
    revalidatePath('/admin/settings');

    return {
      success: true,
      message: 'Bank account added successfully',
      bankAccount: {
        id: externalAccount.id,
        last4: externalAccount.last4,
        bankName: externalAccount.bank_name,
        isDefault: externalAccount.default_for_currency,
      },
    };
  } catch (error: any) {
    console.error('Error adding Connect bank account:', error);
    
    // Handle specific Stripe errors
    if (error?.type === 'StripeInvalidRequestError') {
      if (error?.code === 'routing_number_invalid') {
        return { success: false, message: 'Invalid routing number. Please check and try again.' };
      }
      if (error?.code === 'account_number_invalid') {
        return { success: false, message: 'Invalid account number. Please check and try again.' };
      }
    }
    
    return { success: false, message: formatError(error) };
  }
}


/**
 * Delete a bank account from the landlord's Stripe Connect account
 */
export async function deleteConnectBankAccount(bankAccountId: string) {
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
      return { success: false, message: 'No Stripe Connect account found' };
    }

    const stripe = getStripe();

    // First check how many external accounts exist
    const account = await stripe.accounts.retrieve(landlord.stripeConnectAccountId, {
      expand: ['external_accounts'],
    });

    const bankAccounts = account.external_accounts?.data?.filter(
      (acc) => acc.object === 'bank_account'
    ) || [];

    if (bankAccounts.length <= 1) {
      return { 
        success: false, 
        message: 'Cannot delete the only bank account. Add another bank account first, or complete a new onboarding to replace it.',
      };
    }

    // Delete the external account
    await stripe.accounts.deleteExternalAccount(
      landlord.stripeConnectAccountId,
      bankAccountId
    );

    revalidatePath('/admin/payouts');
    revalidatePath('/admin/settings');

    return { success: true, message: 'Bank account removed successfully' };
  } catch (error: any) {
    console.error('Error deleting Connect bank account:', error);
    
    if (error?.code === 'resource_missing') {
      return { success: false, message: 'Bank account not found or already removed' };
    }
    
    return { success: false, message: formatError(error) };
  }
}

/**
 * Set a bank account as the default for payouts
 */
export async function setDefaultConnectBankAccount(bankAccountId: string) {
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
      return { success: false, message: 'No Stripe Connect account found' };
    }

    const stripe = getStripe();

    // Update the external account to be the default
    await stripe.accounts.updateExternalAccount(
      landlord.stripeConnectAccountId,
      bankAccountId,
      {
        default_for_currency: true,
      }
    );

    revalidatePath('/admin/payouts');
    revalidatePath('/admin/settings');

    return { success: true, message: 'Default bank account updated' };
  } catch (error) {
    console.error('Error setting default Connect bank account:', error);
    return { success: false, message: formatError(error) };
  }
}

/**
 * Create a new account session for managing bank accounts via Stripe's embedded component
 * This allows landlords to use Stripe's UI to manage their external accounts
 */
export async function createBankAccountManagementSession() {
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
        success: false, 
        message: 'Please complete Stripe onboarding first.',
        needsOnboarding: true,
      };
    }

    const stripe = getStripe();

    // Create an account session with the payouts component enabled
    // This allows managing external accounts
    const accountSession = await stripe.accountSessions.create({
      account: landlord.stripeConnectAccountId,
      components: {
        payouts: {
          enabled: true,
          features: {
            external_account_collection: true,
            edit_payout_schedule: true,
            instant_payouts: true,
            standard_payouts: true,
          },
        },
      },
    });

    return {
      success: true,
      clientSecret: accountSession.client_secret,
      accountId: landlord.stripeConnectAccountId,
    };
  } catch (error) {
    console.error('Error creating bank account management session:', error);
    return { success: false, message: formatError(error) };
  }
}

/**
 * Restart the Stripe onboarding process to add/change bank account
 * This creates a new onboarding link that allows the landlord to update their info
 */
export async function restartStripeOnboarding() {
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
        success: false, 
        message: 'No existing Stripe account. Please complete initial onboarding.',
        needsOnboarding: true,
      };
    }

    const stripe = getStripe();

    // Create an account session for onboarding (allows updating info including bank)
    const accountSession = await stripe.accountSessions.create({
      account: landlord.stripeConnectAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
      },
    });

    return {
      success: true,
      clientSecret: accountSession.client_secret,
      accountId: landlord.stripeConnectAccountId,
    };
  } catch (error) {
    console.error('Error restarting Stripe onboarding:', error);
    return { success: false, message: formatError(error) };
  }
}
