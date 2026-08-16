'use server';

import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { checkFeatureAccess } from './subscription.actions';

// Type-safe prisma access for models that may not exist yet
const rentReminderSettingsModel = () => (prisma as any).rentReminderSettings;
const lateFeeSettingsModel = () => (prisma as any).lateFeeSettings;

// Rent Reminder Settings
export async function getRentReminderSettings() {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    // Check feature access
    const featureCheck = await checkFeatureAccess(landlordResult.landlord.id, 'automaticRentReminders');
    if (!featureCheck.allowed) {
      return { 
        success: false, 
        message: featureCheck.reason,
        featureLocked: true,
        upgradeTier: featureCheck.upgradeTier,
      };
    }

    let settings;
    try {
      settings = await rentReminderSettingsModel()?.findUnique?.({
        where: { landlordId: landlordResult.landlord.id },
      });

      // Create default settings if none exist
      if (!settings) {
        settings = await rentReminderSettingsModel()?.create?.({
          data: {
            landlordId: landlordResult.landlord.id,
            enabled: false,
            reminderDaysBefore: [7, 3, 1],
            reminderChannels: ['email'],
          },
        });
      }
    } catch {
      // Model doesn't exist yet
      return { 
        success: false, 
        message: 'Rent reminder settings require database migration. Please run: npx prisma migrate dev' 
      };
    }

    return { success: true, settings };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateRentReminderSettings(data: {
  enabled?: boolean;
  reminderDaysBefore?: number[];
  reminderChannels?: string[];
  customMessage?: string;
}) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    // Check feature access
    const featureCheck = await checkFeatureAccess(landlordResult.landlord.id, 'automaticRentReminders');
    if (!featureCheck.allowed) {
      return { 
        success: false, 
        message: featureCheck.reason,
        featureLocked: true,
        upgradeTier: featureCheck.upgradeTier,
      };
    }

    let settings;
    try {
      settings = await rentReminderSettingsModel()?.upsert?.({
        where: { landlordId: landlordResult.landlord.id },
        update: data,
        create: {
          landlordId: landlordResult.landlord.id,
          ...data,
        },
      });
    } catch {
      return { success: false, message: 'Database migration required' };
    }

    return { success: true, settings, message: 'Settings updated' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Late Fee Settings
export async function getLateFeeSettings() {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    // Check feature access
    const featureCheck = await checkFeatureAccess(landlordResult.landlord.id, 'automaticLateFees');
    if (!featureCheck.allowed) {
      return { 
        success: false, 
        message: featureCheck.reason,
        featureLocked: true,
        upgradeTier: featureCheck.upgradeTier,
      };
    }

    let settings;
    try {
      settings = await lateFeeSettingsModel()?.findUnique?.({
        where: { landlordId: landlordResult.landlord.id },
      });

      // Create default settings if none exist
      if (!settings) {
        settings = await lateFeeSettingsModel()?.create?.({
          data: {
            landlordId: landlordResult.landlord.id,
            enabled: false,
            gracePeriodDays: 5,
            feeType: 'flat',
            feeAmount: 50,
            notifyTenant: true,
          },
        });
      }
    } catch {
      return { 
        success: false, 
        message: 'Late fee settings require database migration. Please run: npx prisma migrate dev' 
      };
    }

    return { success: true, settings };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateLateFeeSettings(data: {
  enabled?: boolean;
  gracePeriodDays?: number;
  feeType?: 'flat' | 'percentage';
  feeAmount?: number;
  maxFee?: number;
  recurringFee?: boolean;
  recurringInterval?: 'daily' | 'weekly';
  notifyTenant?: boolean;
}) {
  try {
    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    // Check feature access
    const featureCheck = await checkFeatureAccess(landlordResult.landlord.id, 'automaticLateFees');
    if (!featureCheck.allowed) {
      return { 
        success: false, 
        message: featureCheck.reason,
        featureLocked: true,
        upgradeTier: featureCheck.upgradeTier,
      };
    }

    let settings;
    try {
      settings = await lateFeeSettingsModel()?.upsert?.({
        where: { landlordId: landlordResult.landlord.id },
        update: data,
        create: {
          landlordId: landlordResult.landlord.id,
          feeAmount: data.feeAmount || 50,
          ...data,
        },
      });
    } catch {
      return { success: false, message: 'Database migration required' };
    }

    return { success: true, settings, message: 'Settings updated' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Process rent reminders (called by cron job)
export async function processRentReminders() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all landlords with rent reminders enabled
    let reminderSettings: any[] = [];
    try {
      reminderSettings = await rentReminderSettingsModel()?.findMany?.({
        where: { enabled: true },
      }) || [];
    } catch {
      return { success: false, message: 'Database migration required' };
    }

    const results = [];

    for (const settings of reminderSettings) {
      // Get upcoming rent payments for this landlord
      const landlord = await prisma.landlord.findUnique({
        where: { id: settings.landlordId },
        include: {
          properties: {
            include: {
              units: {
                include: {
                  leases: {
                    where: { status: 'active' },
                    include: { tenant: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!landlord) continue;

      for (const daysBefore of settings.reminderDaysBefore) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysBefore);

        // Find leases with rent due on target date
        for (const property of landlord.properties) {
          for (const unit of property.units) {
            for (const lease of unit.leases) {
              const dueDay = lease.billingDayOfMonth;
              const currentMonth = targetDate.getMonth();
              const currentYear = targetDate.getFullYear();
              
              const dueDate = new Date(currentYear, currentMonth, dueDay);
              
              if (dueDate.toDateString() === targetDate.toDateString()) {
                // Send reminder notification
                await prisma.notification.create({
                  data: {
                    userId: lease.tenantId,
                    type: 'reminder',
                    title: 'Rent Payment Reminder',
                    message: settings.customMessage || 
                      `Your rent payment of $${lease.rentAmount} is due in ${daysBefore} day${daysBefore > 1 ? 's' : ''}.`,
                    actionUrl: '/user/payments',
                    metadata: {
                      leaseId: lease.id,
                      dueDate: dueDate.toISOString(),
                      amount: Number(lease.rentAmount),
                    },
                  },
                });

                results.push({
                  tenantId: lease.tenantId,
                  leaseId: lease.id,
                  daysBefore,
                  sent: true,
                });
              }
            }
          }
        }
      }
    }

    return { success: true, reminders: results };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Process late fees (called by cron job)
export async function processLateFees() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all landlords with late fees enabled
    let lateFeeSettingsList: any[] = [];
    try {
      lateFeeSettingsList = await lateFeeSettingsModel()?.findMany?.({
        where: { enabled: true },
      }) || [];
    } catch {
      return { success: false, message: 'Database migration required' };
    }

    const results = [];

    for (const settings of lateFeeSettingsList) {
      // Find overdue rent payments
      const overduePayments = await prisma.rentPayment.findMany({
        where: {
          status: 'pending',
          dueDate: {
            lt: new Date(today.getTime() - settings.gracePeriodDays * 24 * 60 * 60 * 1000),
          },
          lease: {
            unit: {
              property: {
                landlordId: settings.landlordId,
              },
            },
          },
        },
        include: {
          lease: {
            include: {
              tenant: true,
              unit: {
                include: { property: true },
              },
            },
          },
        },
      });

      for (const payment of overduePayments) {
        // Calculate late fee
        let lateFee: number;
        if (settings.feeType === 'percentage') {
          lateFee = Number(payment.amount) * (Number(settings.feeAmount) / 100);
        } else {
          lateFee = Number(settings.feeAmount);
        }

        // Apply max fee cap if set
        if (settings.maxFee && lateFee > Number(settings.maxFee)) {
          lateFee = Number(settings.maxFee);
        }

        // Update payment with late fee (add to metadata)
        const currentMetadata = (payment.metadata as any) || {};
        const existingLateFee = currentMetadata.lateFee || 0;

        // Only add fee if not already applied (or if recurring)
        if (!existingLateFee || settings.recurringFee) {
          await prisma.rentPayment.update({
            where: { id: payment.id },
            data: {
              status: 'overdue',
              metadata: {
                ...currentMetadata,
                lateFee: settings.recurringFee ? existingLateFee + lateFee : lateFee,
                lateFeeAppliedAt: new Date().toISOString(),
              },
            },
          });

          // Notify tenant if enabled
          if (settings.notifyTenant) {
            await prisma.notification.create({
              data: {
                userId: payment.tenantId,
                type: 'alert',
                title: 'Late Fee Applied',
                message: `A late fee of $${lateFee.toFixed(2)} has been applied to your overdue rent payment.`,
                actionUrl: '/user/payments',
                metadata: {
                  paymentId: payment.id,
                  lateFee,
                },
              },
            });
          }

          results.push({
            paymentId: payment.id,
            tenantId: payment.tenantId,
            lateFee,
            applied: true,
          });
        }
      }
    }

    return { success: true, lateFees: results };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
