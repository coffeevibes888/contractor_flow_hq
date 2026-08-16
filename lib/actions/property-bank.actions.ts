/**
 * Property Bank Account Actions
 * Server actions for landlords to manage property-specific bank accounts
 */

'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { formatError } from '@/lib/utils';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { propertyBankAccountSchema } from '@/lib/validators';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';

// ============= ADD PROPERTY BANK ACCOUNT =============

/**
 * Add a bank account for a specific property
 * This allows landlords to cash out to different accounts per property
 */
export async function addPropertyBankAccount(
  data: z.infer<typeof propertyBankAccountSchema>
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { success: false, message: 'Stripe is not configured on the server.' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const validatedData = propertyBankAccountSchema.parse(data);

    const landlord = landlordResult.landlord;
    if (!landlord.stripeConnectAccountId) {
      return { success: false, message: 'Stripe payouts not set up. Complete onboarding first.' };
    }

    // Verify the property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: {
        id: validatedData.propertyId,
        landlordId: landlord.id,
      },
    });

    if (!property) {
      return { success: false, message: 'Property not found or access denied' };
    }

    const stripe = new Stripe(stripeSecretKey);

    // Attach the bank account token as an external account on the landlord's Connect account.
    // The returned object's id is the external account ID (e.g. ba_...) and is what Stripe uses
    // as a payout destination.
    const externalAccount = (await stripe.accounts.createExternalAccount(
      landlord.stripeConnectAccountId,
      {
        external_account: validatedData.stripeBankAccountTokenId,
        default_for_currency: false,
        metadata: {
          landlordId: landlord.id,
          propertyId: property.id,
        },
      }
    )) as Stripe.BankAccount;

    const externalAccountId = externalAccount.id;
    const last4 = validatedData.last4 || externalAccount.last4 || '';
    const bankName = validatedData.bankName || externalAccount.bank_name || undefined;
    const accountType = validatedData.accountType || (externalAccount.account_type as any) || undefined;
    const routingLast4 = validatedData.routingNumber ? validatedData.routingNumber.slice(-4) : undefined;

    // Check if property already has a bank account
    const existingAccount = await prisma.propertyBankAccount.findUnique({
      where: { propertyId: validatedData.propertyId },
    });

    if (existingAccount) {
      // Update existing account
      await prisma.propertyBankAccount.update({
        where: { propertyId: validatedData.propertyId },
        data: {
          stripePaymentMethodId: externalAccountId,
          accountHolderName: validatedData.accountHolderName,
          last4,
          bankName,
          accountType,
          routingNumber: routingLast4,
          isVerified: true,
        },
      });

      revalidatePath('/admin/dashboard/properties');
      revalidatePath('/admin/payouts');

      return {
        success: true,
        message: 'Property bank account updated',
      };
    }

    // Create new bank account for property
    await prisma.propertyBankAccount.create({
      data: {
        propertyId: validatedData.propertyId,
        stripePaymentMethodId: externalAccountId,
        accountHolderName: validatedData.accountHolderName,
        last4,
        bankName,
        accountType,
        routingNumber: routingLast4,
        isVerified: true,
      },
    });

    revalidatePath('/admin/dashboard/properties');
    revalidatePath('/admin/payouts');

    return {
      success: true,
      message: 'Property bank account added.',
    };
  } catch (error) {
    console.error('Error adding property bank account:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= GET PROPERTY BANK ACCOUNT =============

/**
 * Get the bank account for a specific property
 */
export async function getPropertyBankAccount(propertyId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', account: null };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, account: null };
    }

    // Verify the property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!property) {
      return { success: false, message: 'Property not found or access denied', account: null };
    }

    const account = await prisma.propertyBankAccount.findUnique({
      where: { propertyId },
    });

    if (!account) {
      return { success: true, account: null };
    }

    return {
      success: true,
      account: {
        id: account.id,
        propertyId: account.propertyId,
        accountHolderName: account.accountHolderName,
        last4: account.last4,
        bankName: account.bankName,
        accountType: account.accountType,
        isVerified: account.isVerified,
        createdAt: account.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error), account: null };
  }
}

// ============= DELETE PROPERTY BANK ACCOUNT =============

/**
 * Remove the bank account from a property
 */
export async function deletePropertyBankAccount(propertyId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { success: false, message: 'Stripe is not configured on the server.' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;

    // Verify the property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        landlordId: landlord.id,
      },
    });

    if (!property) {
      return { success: false, message: 'Property not found or access denied' };
    }

    const existing = await prisma.propertyBankAccount.findUnique({
      where: { propertyId },
      select: { stripePaymentMethodId: true },
    });

    if (!existing?.stripePaymentMethodId) {
      return { success: true, message: 'No property bank account to remove.' };
    }

    await prisma.propertyBankAccount.delete({
      where: { propertyId },
    });

    // If this external account isn't used by any other property, remove it from Stripe.
    // This prevents accumulating unused external accounts on the Connect account.
    const remainingUsage = await prisma.propertyBankAccount.count({
      where: { stripePaymentMethodId: existing.stripePaymentMethodId },
    });

    if (remainingUsage === 0 && landlord.stripeConnectAccountId) {
      const stripe = new Stripe(stripeSecretKey);
      try {
        await stripe.accounts.deleteExternalAccount(
          landlord.stripeConnectAccountId,
          existing.stripePaymentMethodId
        );
      } catch {
        // Ignore if already removed/invalid
      }
    }

    revalidatePath('/admin/dashboard/properties');
    revalidatePath('/admin/payouts');

    return { success: true, message: 'Property bank account removed' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= GET ALL PROPERTIES WITH BANK ACCOUNTS =============

/**
 * Get all properties with their bank account status
 */
export async function getPropertiesWithBankAccounts() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', properties: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, properties: [] };
    }

    const properties = await prisma.property.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        status: { not: 'deleted' }, // Exclude soft-deleted properties
      },
      include: {
        bankAccount: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      properties: properties.map((prop) => ({
        id: prop.id,
        name: prop.name,
        slug: prop.slug,
        hasBankAccount: !!prop.bankAccount,
        bankAccount: prop.bankAccount
          ? {
              last4: prop.bankAccount.last4,
              bankName: prop.bankAccount.bankName,
              isVerified: prop.bankAccount.isVerified,
            }
          : null,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), properties: [] };
  }
}
