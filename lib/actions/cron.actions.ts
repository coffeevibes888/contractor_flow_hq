'use server';

import { prisma } from '@/db/prisma';
import { formatError } from '../utils';

// This function is designed to be called by a cron job
export async function applyLateFees() {
  console.log('--- Starting Daily Late Fee Application Job ---');
  try {
    const today = new Date();
    
    // Find all landlords who have automatic late fees enabled
    const lateFeeSettings = await prisma.lateFeeSettings.findMany({
      where: { enabled: true },
    });

    if (lateFeeSettings.length === 0) {
      console.log('No landlords have late fees enabled. Exiting job.');
      return { success: true, message: 'No active settings.' };
    }

    let feesApplied = 0;

    for (const settings of lateFeeSettings) {
      const gracePeriod = settings.gracePeriodDays;

      // Find overdue payments for this landlord that are past the grace period
      const overduePayments = await prisma.rentPayment.findMany({
        where: {
          status: 'overdue',
          lease: {
            unit: {
              property: {
                landlordId: settings.landlordId,
              },
            },
          },
          dueDate: {
            lt: new Date(today.getTime() - gracePeriod * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          lease: true,
        },
      });

      for (const payment of overduePayments) {
        // Check if a late fee has already been applied for this specific payment
        const existingLateFee = await prisma.tenantInvoice.findFirst({
          where: {
            leaseId: payment.leaseId,
            reason: 'Automatic Late Fee',
            // Check if fee was generated for this specific overdue payment's period
            description: `For overdue payment due ${payment.dueDate.toISOString()}`,
          },
        });

        if (existingLateFee) {
          continue; // Skip if fee already applied
        }

        let feeAmount = 0;
        if (settings.feeType === 'flat') {
          feeAmount = Number(settings.feeAmount);
        } else if (settings.feeType === 'percentage') {
          const rentAmount = Number(payment.amount);
          const calculatedFee = rentAmount * (Number(settings.feeAmount) / 100);
          feeAmount = settings.maxFee ? Math.min(Number(settings.maxFee), calculatedFee) : calculatedFee;
        }

        if (feeAmount > 0) {
          // Create a new invoice for the late fee
          await prisma.tenantInvoice.create({
            data: {
              propertyId: payment.lease.unit.propertyId,
              tenantId: payment.tenantId,
              leaseId: payment.leaseId,
              amount: feeAmount,
              reason: 'Automatic Late Fee',
              description: `For overdue payment due ${payment.dueDate.toISOString()}`,
              dueDate: today,
              status: 'pending',
            },
          });
          feesApplied++;
        }
      }
    }

    console.log(`--- Late Fee Job Complete. Applied ${feesApplied} fees. ---`);
    return { success: true, message: `Applied ${feesApplied} late fees.` };
  } catch (error) {
    console.error('Failed to apply late fees:', error);
    return { success: false, message: formatError(error) };
  }
}


/**
 * Process recurring charges (e.g., monthly pet rent)
 * Creates RentPayment records for charges due today
 */
export async function processRecurringCharges() {
  console.log('--- Starting Recurring Charges Processing Job ---');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all active recurring charges due today
    const dueCharges = await prisma.recurringCharge.findMany({
      where: {
        status: 'active',
        nextPostDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        lease: {
          select: {
            id: true,
            status: true,
            tenantId: true,
          },
        },
      },
    });

    if (dueCharges.length === 0) {
      console.log('No recurring charges due today. Exiting job.');
      return { success: true, message: 'No charges due today.', chargesPosted: 0 };
    }

    let chargesPosted = 0;

    for (const charge of dueCharges) {
      // Skip if lease is not active
      if (charge.lease.status !== 'active') {
        continue;
      }

      // Check if charge was already posted for this period
      const existingPayment = await prisma.rentPayment.findFirst({
        where: {
          leaseId: charge.leaseId,
          metadata: {
            path: ['recurringChargeId'],
            equals: charge.id,
          },
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existingPayment) {
        continue; // Already posted
      }

      // Create the rent payment for this recurring charge
      await prisma.rentPayment.create({
        data: {
          leaseId: charge.leaseId,
          tenantId: charge.tenantId,
          amount: charge.amount,
          dueDate: today,
          status: 'pending',
          metadata: {
            type: 'recurring_charge',
            recurringChargeId: charge.id,
            description: charge.description,
          },
        },
      });

      // Update the next post date
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(charge.dayOfMonthToPost);

      // Handle end date
      if (charge.endDate && nextMonth > charge.endDate) {
        await prisma.recurringCharge.update({
          where: { id: charge.id },
          data: {
            status: 'ended',
            lastPostedDate: today,
          },
        });
      } else {
        await prisma.recurringCharge.update({
          where: { id: charge.id },
          data: {
            lastPostedDate: today,
            nextPostDate: nextMonth,
          },
        });
      }

      chargesPosted++;
    }

    console.log(`--- Recurring Charges Job Complete. Posted ${chargesPosted} charges. ---`);
    return { success: true, message: `Posted ${chargesPosted} recurring charges.`, chargesPosted };
  } catch (error) {
    console.error('Failed to process recurring charges:', error);
    return { success: false, message: formatError(error) };
  }
}

/**
 * Mark overdue payments
 * Updates status of pending payments past their due date to 'overdue'
 */
export async function markOverduePayments() {
  console.log('--- Starting Mark Overdue Payments Job ---');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await prisma.rentPayment.updateMany({
      where: {
        status: 'pending',
        dueDate: {
          lt: today,
        },
      },
      data: {
        status: 'overdue',
      },
    });

    console.log(`--- Mark Overdue Job Complete. Updated ${result.count} payments to overdue. ---`);
    return { success: true, message: `Marked ${result.count} payments as overdue.`, count: result.count };
  } catch (error) {
    console.error('Failed to mark overdue payments:', error);
    return { success: false, message: formatError(error) };
  }
}
