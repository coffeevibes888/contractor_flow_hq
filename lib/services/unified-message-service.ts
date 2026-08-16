import { prisma } from '@/db/prisma';
import { NotificationService } from './notification-service';

/**
 * Unified Message Service
 * 
 * Central service for handling all messaging across the platform.
 * Supports PM ↔ Tenant, PM ↔ Contractor, Contractor ↔ Client, etc.
 */

export type ThreadType =
  | 'contact'              // Website contact form
  | 'support'              // Support ticket
  | 'dm'                   // Direct message (generic)
  | 'email'                // Email-style message
  | 'pm_tenant'            // PM ↔ Tenant
  | 'pm_contractor'        // PM ↔ Contractor
  | 'contractor_client'    // Contractor ↔ Client
  | 'homeowner_contractor' // Homeowner ↔ Contractor
  | 'team';                // Team chat (uses TeamMessage model)

export type MessageRole = 'user' | 'admin' | 'system' | 'ai';

export interface SendMessageParams {
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  recipientId?: string;
  recipientEmail?: string;
  subject?: string;
  content: string;
  threadId?: string;
  threadType?: ThreadType;
  metadata?: Record<string, any>;
}

export interface GetThreadsParams {
  userId: string;
  userRole?: string;
  folder?: 'inbox' | 'sent' | 'archived' | 'spam' | 'trash';
  limit?: number;
  offset?: number;
}

export interface ThreadWithMessages {
  id: string;
  type: string;
  subject: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    content: string;
    senderName: string | null;
    senderEmail: string | null;
    role: string;
    createdAt: Date;
  }>;
  participants: Array<{
    userId: string;
    lastReadAt: Date | null;
  }>;
  unreadCount?: number;
}

export class UnifiedMessageService {
  /**
   * Send a message - creates thread if needed, adds message, notifies recipient
   */
  static async sendMessage(params: SendMessageParams): Promise<{ success: boolean; threadId: string; messageId: string; error?: string }> {
    try {
      const {
        senderId,
        senderName,
        senderEmail,
        recipientId,
        recipientEmail,
        subject,
        content,
        threadId,
        threadType,
        metadata,
      } = params;

      // Get sender info
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!sender) {
        return { success: false, threadId: '', messageId: '', error: 'Sender not found' };
      }

      let thread: any;
      let isNewThread = false;

      // If threadId provided, use existing thread
      if (threadId) {
        thread = await prisma.thread.findUnique({
          where: { id: threadId },
          include: { participants: true },
        });

        if (!thread) {
          return { success: false, threadId: '', messageId: '', error: 'Thread not found' };
        }

        // Verify sender is a participant
        const isParticipant = thread.participants.some((p: any) => p.userId === senderId);
        if (!isParticipant) {
          return { success: false, threadId: '', messageId: '', error: 'Not authorized to send to this thread' };
        }
      } else {
        // Create new thread
        if (!recipientId && !recipientEmail) {
          return { success: false, threadId: '', messageId: '', error: 'Recipient required for new thread' };
        }

        // Determine thread type based on sender and recipient roles
        const determinedThreadType = threadType || await this.determineThreadType(sender.role, recipientId);

        thread = await prisma.thread.create({
          data: {
            type: determinedThreadType,
            subject: subject || 'New Message',
            fromEmail: sender.email || senderEmail || '',
            toEmail: recipientEmail || '',
            createdByUserId: senderId,
            status: 'open',
          },
          include: { participants: true },
        });

        // Add participants
        const participantIds = [senderId];
        if (recipientId && recipientId !== senderId) {
          participantIds.push(recipientId);
        }

        await prisma.threadParticipant.createMany({
          data: participantIds.map(userId => ({
            threadId: thread.id,
            userId,
          })),
          skipDuplicates: true,
        });

        isNewThread = true;
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          threadId: thread.id,
          senderUserId: senderId,
          senderName: sender.name || senderName || '',
          senderEmail: sender.email || senderEmail || '',
          content,
          role: this.determineMessageRole(sender.role),
        },
      });

      // Update thread timestamp
      await prisma.thread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      });

      // Send notifications to other participants
      const otherParticipants = await prisma.threadParticipant.findMany({
        where: {
          threadId: thread.id,
          userId: { not: senderId },
        },
        select: { userId: true },
      });

      for (const participant of otherParticipants) {
        await NotificationService.createNotification({
          userId: participant.userId,
          type: 'message',
          title: isNewThread ? `New message: ${subject || 'Message'}` : `Reply: ${thread.subject || 'Message'}`,
          message: content.slice(0, 120),
          actionUrl: this.getMessageUrl(participant.userId, thread.id),
        });
      }

      return {
        success: true,
        threadId: thread.id,
        messageId: message.id,
      };
    } catch (error) {
      console.error('UnifiedMessageService.sendMessage error:', error);
      return {
        success: false,
        threadId: '',
        messageId: '',
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Get threads for a user based on their role and folder
   */
  static async getThreads(params: GetThreadsParams): Promise<ThreadWithMessages[]> {
    try {
      const { userId, userRole, folder = 'inbox', limit = 50, offset = 0 } = params;

      // Build where clause based on folder
      let statusFilter: string[] = [];
      let createdByFilter: any = undefined;

      switch (folder) {
        case 'inbox':
          statusFilter = ['open'];
          createdByFilter = { not: userId };
          break;
        case 'sent':
          createdByFilter = userId;
          statusFilter = ['open', 'archived'];
          break;
        case 'archived':
          statusFilter = ['archived'];
          break;
        case 'spam':
          statusFilter = ['spam'];
          break;
        case 'trash':
          statusFilter = ['trash'];
          break;
        default:
          statusFilter = ['open'];
      }

      // Get threads where user is a participant
      const threadParticipants = await prisma.threadParticipant.findMany({
        where: {
          userId,
          isDeleted: false,
          thread: {
            status: { in: statusFilter },
            ...(createdByFilter && { createdByUserId: createdByFilter }),
          },
        },
        include: {
          thread: {
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
              participants: {
                select: {
                  userId: true,
                  lastReadAt: true,
                },
              },
            },
          },
        },
        orderBy: {
          thread: { updatedAt: 'desc' },
        },
        take: limit,
        skip: offset,
      });

      // Filter out null threads and format response
      const threads: ThreadWithMessages[] = threadParticipants
        .filter(tp => tp.thread !== null)
        .map(tp => {
          const thread = tp.thread;
          const userParticipant = thread.participants.find(p => p.userId === userId);
          const lastMessage = thread.messages[0];
          
          // Calculate unread count
          let unreadCount = 0;
          if (lastMessage && userParticipant) {
            if (!userParticipant.lastReadAt || new Date(lastMessage.createdAt) > new Date(userParticipant.lastReadAt)) {
              unreadCount = 1; // Simplified - could count all unread messages
            }
          }

          return {
            id: thread.id,
            type: thread.type,
            subject: thread.subject,
            fromEmail: thread.fromEmail,
            toEmail: thread.toEmail,
            status: thread.status,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
            messages: thread.messages.map(m => ({
              id: m.id,
              content: m.content,
              senderName: m.senderName,
              senderEmail: m.senderEmail,
              role: m.role,
              createdAt: m.createdAt,
            })),
            participants: thread.participants,
            unreadCount,
          };
        });

      return threads;
    } catch (error) {
      console.error('UnifiedMessageService.getThreads error:', error);
      return [];
    }
  }

  /**
   * Get a specific thread with all messages
   */
  static async getThread(threadId: string, userId: string): Promise<ThreadWithMessages | null> {
    try {
      // Verify user is a participant
      const participant = await prisma.threadParticipant.findFirst({
        where: {
          threadId,
          userId,
          isDeleted: false,
        },
      });

      if (!participant) {
        return null;
      }

      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          participants: {
            select: {
              userId: true,
              lastReadAt: true,
            },
          },
        },
      });

      if (!thread) {
        return null;
      }

      // Mark as read
      await prisma.threadParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });

      return {
        id: thread.id,
        type: thread.type,
        subject: thread.subject,
        fromEmail: thread.fromEmail,
        toEmail: thread.toEmail,
        status: thread.status,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        messages: thread.messages.map(m => ({
          id: m.id,
          content: m.content,
          senderName: m.senderName,
          senderEmail: m.senderEmail,
          role: m.role,
          createdAt: m.createdAt,
        })),
        participants: thread.participants,
      };
    } catch (error) {
      console.error('UnifiedMessageService.getThread error:', error);
      return null;
    }
  }

  /**
   * Archive a thread
   */
  static async archiveThread(threadId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify user is a participant
      const participant = await prisma.threadParticipant.findFirst({
        where: { threadId, userId },
      });

      if (!participant) {
        return { success: false, error: 'Not authorized' };
      }

      await prisma.thread.update({
        where: { id: threadId },
        data: { status: 'archived' },
      });

      return { success: true };
    } catch (error) {
      console.error('UnifiedMessageService.archiveThread error:', error);
      return { success: false, error: 'Failed to archive thread' };
    }
  }

  /**
   * Delete a thread (move to trash)
   */
  static async deleteThread(threadId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify user is a participant
      const participant = await prisma.threadParticipant.findFirst({
        where: { threadId, userId },
      });

      if (!participant) {
        return { success: false, error: 'Not authorized' };
      }

      await prisma.thread.update({
        where: { id: threadId },
        data: { status: 'trash' },
      });

      return { success: true };
    } catch (error) {
      console.error('UnifiedMessageService.deleteThread error:', error);
      return { success: false, error: 'Failed to delete thread' };
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const participants = await prisma.threadParticipant.findMany({
        where: {
          userId,
          isDeleted: false,
          thread: {
            status: 'open',
          },
        },
        include: {
          thread: {
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      let unreadCount = 0;
      for (const p of participants) {
        const lastMessage = p.thread.messages[0];
        if (lastMessage) {
          if (!p.lastReadAt || new Date(lastMessage.createdAt) > new Date(p.lastReadAt)) {
            unreadCount++;
          }
        }
      }

      return unreadCount;
    } catch (error) {
      console.error('UnifiedMessageService.getUnreadCount error:', error);
      return 0;
    }
  }

  // ─── Private Helper Methods ───────────────────────────────────────────────

  /**
   * Determine thread type based on sender and recipient roles
   */
  private static async determineThreadType(senderRole: string, recipientId?: string): Promise<ThreadType> {
    if (!recipientId) {
      return 'contact';
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { role: true },
    });

    if (!recipient) {
      return 'dm';
    }

    // PM/Admin to Tenant
    if ((senderRole === 'admin' || senderRole === 'landlord') && recipient.role === 'tenant') {
      return 'pm_tenant';
    }

    // PM/Admin to Contractor
    if ((senderRole === 'admin' || senderRole === 'landlord') && recipient.role === 'contractor') {
      return 'pm_contractor';
    }

    // Contractor to Client
    if (senderRole === 'contractor' && (recipient.role === 'user' || recipient.role === 'homeowner')) {
      return 'contractor_client';
    }

    // Homeowner to Contractor
    if (senderRole === 'homeowner' && recipient.role === 'contractor') {
      return 'homeowner_contractor';
    }

    // Tenant to PM
    if (senderRole === 'tenant' && (recipient.role === 'admin' || recipient.role === 'landlord')) {
      return 'pm_tenant';
    }

    // Default to DM
    return 'dm';
  }

  /**
   * Determine message role based on user role
   */
  private static determineMessageRole(userRole: string): MessageRole {
    if (userRole === 'admin' || userRole === 'landlord' || userRole === 'superAdmin') {
      return 'admin';
    }
    return 'user';
  }

  /**
   * Get the appropriate message URL based on user role
   */
  private static getMessageUrl(userId: string, threadId: string): string {
    // This is a simplified version - in production, you'd check the user's role
    // and return the appropriate URL for their dashboard
    return `/user/profile/inbox/${threadId}`;
  }
}

// Made with Bob
