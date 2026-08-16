/**
 * Automated Rent Reminder Service
 * Sends reminders to tenants before rent is due
 */

import { prisma } from '@/db/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface RentReminder {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  leaseId: string;
  unitName: string;
  propertyName: string;
  rentAmount: number;
  dueDate: Date;
  daysUntilDue: number;
  landlordName: string;
}

/**
 * Get all rent payments due within the specified days
 */
export async function getUpcomingRentPayments(daysAhead: number): Promise<RentReminder[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + daysAhead);
  targetDate.setHours(23, 59, 59, 999);

  const leases = await prisma.lease.findMany({
    where: {
      status: 'active',
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          notificationPreferences: true,
        },
      },
      unit: {
        select: {
          name: true,
          property: {
            select: {
              name: true,
              landlord: {
                select: {
                  name: true,
                  notifyLatePayments: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const reminders: RentReminder[] = [];

  for (const lease of leases) {
    // Calculate next due date based on billing day
    const nextDueDate = getNextDueDate(lease.billingDayOfMonth);
    const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue === daysAhead) {
      // Check if payment already exists for this period
      const existingPayment = await prisma.rentPayment.findFirst({
        where: {
          leaseId: lease.id,
          dueDate: nextDueDate,
          status: { in: ['paid', 'processing'] },
        },
      });

      if (!existingPayment && lease.tenant && lease.unit?.property?.landlord) {
        reminders.push({
          tenantId: lease.tenant.id,
          tenantName: lease.tenant.name,
          tenantEmail: lease.tenant.email,
          leaseId: lease.id,
          unitName: lease.unit.name,
          propertyName: lease.unit.property.name,
          rentAmount: Number(lease.rentAmount),
          dueDate: nextDueDate,
          daysUntilDue,
          landlordName: lease.unit.property.landlord.name,
        });
      }
    }
  }

  return reminders;
}

/**
 * Calculate the next rent due date based on billing day
 */
function getNextDueDate(billingDay: number): Date {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  let dueDate: Date;

  if (currentDay <= billingDay) {
    // Due date is this month
    dueDate = new Date(currentYear, currentMonth, billingDay);
  } else {
    // Due date is next month
    dueDate = new Date(currentYear, currentMonth + 1, billingDay);
  }

  // Handle months with fewer days
  const lastDayOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
  if (billingDay > lastDayOfMonth) {
    dueDate.setDate(lastDayOfMonth);
  }

  return dueDate;
}

/**
 * Send rent reminder email
 */
export async function sendRentReminderEmail(reminder: RentReminder): Promise<boolean> {
  try {
    const subject = reminder.daysUntilDue === 1
      ? `Rent Due Tomorrow - ${reminder.propertyName}`
      : `Rent Due in ${reminder.daysUntilDue} Days - ${reminder.propertyName}`;

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(reminder.rentAmount);

    const formattedDate = reminder.dueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Rent Payment Reminder</h2>
        <p>Hi ${reminder.tenantName},</p>
        <p>This is a friendly reminder that your rent payment of <strong>${formattedAmount}</strong> is due on <strong>${formattedDate}</strong>.</p>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Property:</strong> ${reminder.propertyName}</p>
          <p style="margin: 8px 0 0;"><strong>Unit:</strong> ${reminder.unitName}</p>
          <p style="margin: 8px 0 0;"><strong>Amount Due:</strong> ${formattedAmount}</p>
          <p style="margin: 8px 0 0;"><strong>Due Date:</strong> ${formattedDate}</p>
        </div>
        
        <p>
          <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/user/rent" 
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Pay Rent Now
          </a>
        </p>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
          If you've already made this payment, please disregard this reminder.
        </p>
        
        <p style="color: #64748b; font-size: 14px;">
          Best regards,<br>
          ${reminder.landlordName}
        </p>
      </div>
    `;

    const senderEmail = process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';
    
    await resend.emails.send({
      from: `${reminder.landlordName} <${senderEmail}>`,
      to: reminder.tenantEmail,
      subject,
      html,
    });

    // Log the reminder
    await prisma.notification.create({
      data: {
        userId: reminder.tenantId,
        type: 'reminder',
        title: subject,
        message: `Rent payment of ${formattedAmount} is due on ${formattedDate}`,
        actionUrl: '/user/rent',
        metadata: {
          leaseId: reminder.leaseId,
          dueDate: reminder.dueDate.toISOString(),
          amount: reminder.rentAmount,
        },
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to send rent reminder:', error);
    return false;
  }
}

/**
 * Process all rent reminders for a specific day offset
 */
export async function processRentReminders(daysAhead: number): Promise<{
  sent: number;
  failed: number;
}> {
  const reminders = await getUpcomingRentPayments(daysAhead);
  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const success = await sendRentReminderEmail(reminder);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Run all configured rent reminders (7 days, 3 days, 1 day before)
 */
export async function runAllRentReminders(): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  const reminderDays = [7, 3, 1];
  let totalSent = 0;
  let totalFailed = 0;

  for (const days of reminderDays) {
    const result = await processRentReminders(days);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return {
    total: totalSent + totalFailed,
    sent: totalSent,
    failed: totalFailed,
  };
}
