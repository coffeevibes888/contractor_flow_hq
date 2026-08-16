'use server';

import { prisma } from '@/db/prisma';

/**
 * Send rent reminders for payments due in 1-3 days
 * This should be called by a cron job daily
 */
export async function sendRentReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate start and end dates for the reminder window (1-3 days from now)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 3);
  endDate.setHours(23, 59, 59, 999);

  // Find pending rent payments due in the next 1-3 days
  const upcomingPayments = await prisma.rentPayment.findMany({
    where: {
      status: 'pending',
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      lease: {
        include: {
          unit: {
            include: {
              property: {
                include: {
                  landlord: true,
                },
              },
            },
          },
        },
      },
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const results = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  for (const payment of upcomingPayments) {
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    // Calculate days until due (round to nearest day)
    const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Only send reminders for exactly 3, 2, or 1 day(s) before
    if (daysUntilDue < 1 || daysUntilDue > 3) {
      continue;
    }

    const landlordId = payment.lease.unit.property.landlordId;
    const landlord = payment.lease.unit.property.landlord;
    const tenant = payment.tenant;
    const propertyName = payment.lease.unit.property.name;
    const unitName = payment.lease.unit.name;
    const rentAmount = payment.amount.toFixed(2);
    const dueDateStr = dueDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const paymentUrl = `${baseUrl}/user/profile?tab=rent`;

    if (tenant && landlord) {
      try {
        // Check if we've already sent a reminder for this payment today
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: tenant.id,
            type: 'reminder',
            metadata: { path: ['paymentId'], equals: payment.id },
            createdAt: { gte: today },
          },
        });

        // Only send one reminder per day per payment
        if (existingNotification) {
          continue;
        }

        // Create in-app notification
        const { NotificationService } = await import('@/lib/services/notification-service');
        await NotificationService.createNotification({
          userId: tenant.id,
          type: 'reminder',
          title: `Rent Due in ${daysUntilDue} ${daysUntilDue === 1 ? 'Day' : 'Days'}`,
          message: `Your rent payment of $${rentAmount} for ${propertyName} - ${unitName} is due on ${dueDateStr}.`,
          actionUrl: paymentUrl,
          metadata: { 
            paymentId: payment.id, 
            daysUntilDue,
            dueDate: payment.dueDate.toISOString(),
          },
          landlordId,
        });

        // Import and send email reminder
        const { sendRentReminder } = await import('@/lib/services/email-service');
        await sendRentReminder(
          tenant.email,
          tenant.name,
          propertyName,
          unitName,
          rentAmount,
          dueDateStr,
          landlordId,
          paymentUrl
        );

        results.push({
          paymentId: payment.id,
          tenantId: tenant.id,
          daysUntilDue,
          success: true,
        });
      } catch (error) {
        console.error(`Failed to send rent reminder for payment ${payment.id}:`, error);
        results.push({
          paymentId: payment.id,
          tenantId: tenant.id,
          daysUntilDue,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  return results;
}


/**
 * Get notifications for the current user
 */
export async function getMyNotifications(limit: number = 20) {
  const { auth } = await import('@/auth');
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return notifications;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const { auth } = await import('@/auth');
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' };
  }

  await prisma.notification.update({
    where: { 
      id: notificationId,
      userId: session.user.id, // Ensure user owns this notification
    },
    data: { isRead: true },
  });

  return { success: true };
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead() {
  const { auth } = await import('@/auth');
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' };
  }

  await prisma.notification.updateMany({
    where: { 
      userId: session.user.id,
      isRead: false,
    },
    data: { isRead: true },
  });

  return { success: true };
}

/**
 * Send a direct message to a tenant via the Thread system
 * so it appears in the tenant's inbox at /user/profile/inbox
 */
export async function sendMessageToTenant(data: {
  recipientId: string;
  subject: string;
  message: string;
}) {
  const { auth } = await import('@/auth');
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' };
  }

  const thread = await prisma.thread.create({
    data: {
      type: 'email',
      subject: data.subject,
      status: 'active',
      createdByUserId: session.user.id,
      fromEmail: session.user.email ?? undefined,
      toEmail: undefined,
      participants: {
        create: [
          { userId: session.user.id },
          { userId: data.recipientId },
        ],
      },
      messages: {
        create: {
          content: data.message,
          senderName: session.user.name ?? 'Management',
          senderEmail: session.user.email ?? undefined,
        },
      },
    },
  });

  return { success: true, threadId: thread.id };
}

/**
 * Reply to an existing thread
 */
export async function replyToThread(data: {
  threadId: string;
  message: string;
}) {
  const { auth } = await import('@/auth');
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' };
  }

  const participant = await prisma.threadParticipant.findFirst({
    where: { threadId: data.threadId, userId: session.user.id },
  });

  if (!participant) {
    return { success: false, message: 'Not a participant in this thread' };
  }

  await prisma.message.create({
    data: {
      threadId: data.threadId,
      content: data.message,
      senderName: session.user.name ?? 'User',
      senderEmail: session.user.email ?? undefined,
    },
  });

  await prisma.thread.update({
    where: { id: data.threadId },
    data: { updatedAt: new Date() },
  });

  return { success: true };
}

/**
 * Create a message/notification
 */
export async function createMessage(data: {
  recipientId: string;
  title: string;
  message: string;
  type?: string;
}) {
  const { auth } = await import('@/auth');
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' };
  }

  const notification = await prisma.notification.create({
    data: {
      userId: data.recipientId,
      type: data.type || 'message',
      title: data.title,
      message: data.message,
      isRead: false,
      metadata: {
        senderId: session.user.id,
        senderName: session.user.name,
      },
    },
  });

  return { success: true, notification };
}

/**
 * Get messages for the current user (sent and received)
 */
export async function getMyMessages(limit: number = 50) {
  const { auth } = await import('@/auth');
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  // Get notifications that are messages
  const messages = await prisma.notification.findMany({
    where: {
      OR: [
        { userId: session.user.id, type: 'message' },
        { 
          type: 'message',
          metadata: { path: ['senderId'], equals: session.user.id }
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages;
}
