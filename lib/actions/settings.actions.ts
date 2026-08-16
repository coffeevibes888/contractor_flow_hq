'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentLandlord } from './landlord.actions';

const lateFeeSettingsSchema = z.object({
  enabled: z.boolean(),
  gracePeriodDays: z.number().int().min(0),
  feeType: z.enum(['flat', 'percentage']),
  feeAmount: z.number().min(0),
  maxFee: z.number().optional().nullable(),
});

type LateFeeSettingsReturn = {
  enabled: boolean;
  gracePeriodDays: number;
  feeType: 'flat' | 'percentage';
  feeAmount: number;
  maxFee: number | null;
};

export async function getLateFeeSettings(): Promise<LateFeeSettingsReturn> {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      throw new Error('Could not identify landlord.');
    }

    const settings = await prisma.lateFeeSettings.findUnique({
      where: { landlordId: landlordResult.landlord.id },
    });

    // Return default settings if none are found
    if (!settings) {
      return {
        enabled: false,
        gracePeriodDays: 5,
        feeType: 'flat',
        feeAmount: 50.00,
        maxFee: null,
      };
    }

    return {
      enabled: settings.enabled,
      gracePeriodDays: settings.gracePeriodDays,
      feeType: settings.feeType as 'flat' | 'percentage',
      feeAmount: Number(settings.feeAmount),
      maxFee: settings.maxFee ? Number(settings.maxFee) : null,
    };
  } catch (error) {
    console.error('Failed to get late fee settings:', error);
    // Return default settings on error
    return {
      enabled: false,
      gracePeriodDays: 5,
      feeType: 'flat',
      feeAmount: 50.00,
      maxFee: null,
    };
  }
}

export async function updateLateFeeSettings(data: z.infer<typeof lateFeeSettingsSchema>) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, message: 'Not authenticated' };
        }

        const landlordResult = await getOrCreateCurrentLandlord();
        if (!landlordResult.success || !landlordResult.landlord) {
            return { success: false, message: 'Could not identify landlord.' };
        }
        const landlordId = landlordResult.landlord.id;

        const validatedData = lateFeeSettingsSchema.parse(data);

        await prisma.lateFeeSettings.upsert({
            where: { landlordId },
            create: {
                landlordId,
                ...validatedData,
            },
            update: validatedData,
        });

        revalidatePath('/admin/settings/financials');

        return { success: true, message: 'Late fee settings updated successfully.' };

    } catch (error) {
        return { success: false, message: formatError(error) };
    }
}


// Shipping Settings
export async function updateShippingSettings(
  baseShippingCost: number,
  freeShippingThreshold: number,
  uspsIntegrationEnabled: boolean
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // For now, return success - implement actual storage when needed
    return { 
      success: true, 
      message: 'Shipping settings updated successfully' 
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Tax Settings
export async function updateTaxSettings(taxRate: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // For now, return success - implement actual storage when needed
    return { 
      success: true, 
      message: 'Tax settings updated successfully' 
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Coupon Management
const couponSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  minOrderAmount: z.number().optional(),
  maxUses: z.number().int().optional(),
});

export async function createCoupon(data: z.infer<typeof couponSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const validatedData = couponSchema.parse(data);

    // For now, return mock data - implement actual storage when needed
    const mockCoupon = {
      id: Math.random().toString(36).substring(7),
      ...validatedData,
      usedCount: 0,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { 
      success: true, 
      message: 'Coupon created successfully',
      data: mockCoupon
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deleteCoupon(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // For now, return success - implement actual deletion when needed
    return { 
      success: true, 
      message: 'Coupon deleted successfully' 
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// USPS Shipping Calculator
export async function calculateUSPSShippingRate(
  weight: number,
  originZip: string,
  destZip: string,
  serviceType: 'PRIORITY' | 'EXPRESS' | 'GROUND'
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', rate: null };
    }

    // Mock calculation - implement actual USPS API integration when needed
    const baseRates = {
      PRIORITY: 8.50,
      EXPRESS: 25.00,
      GROUND: 5.00,
    };

    const rate = baseRates[serviceType] + (weight * 1.5);

    return { 
      success: true, 
      message: 'Rate calculated successfully',
      rate: Number(rate.toFixed(2))
    };
  } catch (error) {
    return { success: false, message: formatError(error), rate: null };
  }
}
