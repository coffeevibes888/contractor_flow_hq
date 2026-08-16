/**
 * Move-In Charges Service
 * Creates initial move-in payments when a lease is activated
 * Includes: first month rent, last month rent, security deposit, pet deposit, cleaning fee
 */

import { prisma } from '@/db/prisma';
import { getEffectiveFeeSettings, LandlordFeeSettings } from '@/lib/utils/fee-settings.utils';

export interface MoveInChargeResult {
  success: boolean;
  payments: {
    type: string;
    amount: number;
    id: string;
  }[];
  totalAmount: number;
  error?: string;
}

/**
 * Generate move-in charges for a newly activated lease
 * Called when landlord signs the lease (lease becomes active)
 */
export async function generateMoveInCharges(leaseId: string): Promise<MoveInChargeResult> {
  try {
    // Get lease with all related data
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: { select: { id: true, name: true } },
        unit: {
          include: {
            property: {
              include: {
                landlord: {
                  select: {
                    id: true,
                    securityDepositMonths: true,
                    lastMonthRentRequired: true,
                    petDepositEnabled: true,
                    petDepositAmount: true,
                    petRentEnabled: true,
                    petRentAmount: true,
                    cleaningFeeEnabled: true,
                    cleaningFeeAmount: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lease) {
      return { success: false, payments: [], totalAmount: 0, error: 'Lease not found' };
    }

    if (!lease.tenant) {
      return { success: false, payments: [], totalAmount: 0, error: 'Tenant not found' };
    }

    const landlord = lease.unit.property?.landlord;
    if (!landlord) {
      return { success: false, payments: [], totalAmount: 0, error: 'Landlord not found' };
    }

    const propertyId = lease.unit.property?.id;
    if (!propertyId) {
      return { success: false, payments: [], totalAmount: 0, error: 'Property not found' };
    }

    // Check if move-in charges already exist for this lease
    const existingCharges = await prisma.rentPayment.findMany({
      where: {
        leaseId,
        metadata: {
          path: ['type'],
          string_contains: '_',
        },
      },
    });

    // Check for move-in type payments
    const moveInTypes = ['first_month_rent', 'last_month_rent', 'security_deposit', 'pet_deposit_annual', 'cleaning_fee'];
    const hasExistingMoveIn = existingCharges.some(p => {
      const type = (p.metadata as any)?.type;
      return moveInTypes.includes(type);
    });

    if (hasExistingMoveIn) {
      return { 
        success: true, 
        payments: [], 
        totalAmount: 0, 
        error: 'Move-in charges already exist for this lease' 
      };
    }

    // Get effective fee settings (landlord defaults + property overrides)
    const landlordSettings: LandlordFeeSettings = {
      securityDepositMonths: Number(landlord.securityDepositMonths) || 1,
      petDepositEnabled: landlord.petDepositEnabled ?? false,
      petDepositAmount: landlord.petDepositAmount ? Number(landlord.petDepositAmount) : null,
      petRentEnabled: landlord.petRentEnabled ?? false,
      petRentAmount: landlord.petRentAmount ? Number(landlord.petRentAmount) : null,
      cleaningFeeEnabled: landlord.cleaningFeeEnabled ?? false,
      cleaningFeeAmount: landlord.cleaningFeeAmount ? Number(landlord.cleaningFeeAmount) : null,
      lastMonthRentRequired: landlord.lastMonthRentRequired ?? false,
    };

    const effectiveFees = await getEffectiveFeeSettings(propertyId, landlordSettings);

    const rentAmount = Number(lease.rentAmount);
    const dueDate = lease.startDate || new Date();
    const payments: { type: string; amount: number; id: string }[] = [];

    // 1. First Month's Rent (always required)
    const firstMonthPayment = await prisma.rentPayment.create({
      data: {
        leaseId,
        tenantId: lease.tenant.id,
        amount: rentAmount,
        dueDate,
        status: 'pending',
        metadata: { type: 'first_month_rent', description: 'First Month Rent' },
      },
    });
    payments.push({ type: 'first_month_rent', amount: rentAmount, id: firstMonthPayment.id });

    // 2. Security Deposit
    if (effectiveFees.securityDepositMonths > 0) {
      const securityAmount = rentAmount * effectiveFees.securityDepositMonths;
      const securityPayment = await prisma.rentPayment.create({
        data: {
          leaseId,
          tenantId: lease.tenant.id,
          amount: securityAmount,
          dueDate,
          status: 'pending',
          metadata: { 
            type: 'security_deposit', 
            description: `Security Deposit (${effectiveFees.securityDepositMonths} month${effectiveFees.securityDepositMonths !== 1 ? 's' : ''})` 
          },
        },
      });
      payments.push({ type: 'security_deposit', amount: securityAmount, id: securityPayment.id });
    }

    // 3. Last Month's Rent
    if (effectiveFees.lastMonthRentRequired) {
      const lastMonthPayment = await prisma.rentPayment.create({
        data: {
          leaseId,
          tenantId: lease.tenant.id,
          amount: rentAmount,
          dueDate,
          status: 'pending',
          metadata: { type: 'last_month_rent', description: 'Last Month Rent' },
        },
      });
      payments.push({ type: 'last_month_rent', amount: rentAmount, id: lastMonthPayment.id });
    }

    // 4. Pet Deposit (one-time)
    if (effectiveFees.petDepositEnabled && effectiveFees.petDepositAmount) {
      const petDepositPayment = await prisma.rentPayment.create({
        data: {
          leaseId,
          tenantId: lease.tenant.id,
          amount: effectiveFees.petDepositAmount,
          dueDate,
          status: 'pending',
          metadata: { type: 'pet_deposit_annual', description: 'Pet Deposit' },
        },
      });
      payments.push({ type: 'pet_deposit_annual', amount: effectiveFees.petDepositAmount, id: petDepositPayment.id });
    }

    // 5. Cleaning Fee (one-time)
    if (effectiveFees.cleaningFeeEnabled && effectiveFees.cleaningFeeAmount) {
      const cleaningPayment = await prisma.rentPayment.create({
        data: {
          leaseId,
          tenantId: lease.tenant.id,
          amount: effectiveFees.cleaningFeeAmount,
          dueDate,
          status: 'pending',
          metadata: { type: 'cleaning_fee', description: 'Cleaning Fee' },
        },
      });
      payments.push({ type: 'cleaning_fee', amount: effectiveFees.cleaningFeeAmount, id: cleaningPayment.id });
    }

    // 6. Create recurring charge for monthly pet rent if enabled
    if (effectiveFees.petRentEnabled && effectiveFees.petRentAmount) {
      const billingDay = lease.billingDayOfMonth || 1;
      const nextPostDate = getNextPostDate(billingDay);
      
      await prisma.recurringCharge.create({
        data: {
          landlordId: landlord.id,
          leaseId,
          tenantId: lease.tenant.id,
          description: 'Monthly Pet Rent',
          amount: effectiveFees.petRentAmount,
          dayOfMonthToPost: billingDay,
          status: 'active',
          startDate: lease.startDate || new Date(),
          endDate: lease.endDate || null,
          nextPostDate,
        },
      });
    }

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      success: true,
      payments,
      totalAmount,
    };
  } catch (error) {
    console.error('Error generating move-in charges:', error);
    return {
      success: false,
      payments: [],
      totalAmount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate the next post date for a recurring charge
 */
function getNextPostDate(dayOfMonth: number): Date {
  const today = new Date();
  let postDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  
  if (postDate <= today) {
    postDate.setMonth(postDate.getMonth() + 1);
  }
  
  return postDate;
}
