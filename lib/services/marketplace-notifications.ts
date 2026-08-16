import { prisma } from '@/db/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Property Flow HQ';

interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
}

/**
 * Marketplace Notification Service
 * Handles all notifications for the contractor marketplace
 */
export class MarketplaceNotifications {
  /**
   * Create notification in database and send email
   */
  private static async createAndSendNotification(data: NotificationData) {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
      },
    });

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, name: true },
    });

    if (!user) return notification;

    // Send email
    try {
      await this.sendEmail({
        to: user.email,
        subject: data.title,
        html: this.generateEmailHTML({
          userName: user.name || 'there',
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          actionText: this.getActionText(data.type),
        }),
      });
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }

    return notification;
  }

  /**
   * Send email using Resend
   */
  private static async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    await resend.emails.send({
      from: `${APP_NAME} <${senderEmail}>`,
      to,
      subject,
      html,
    });
  }

  /**
   * Get action button text based on notification type
   */
  private static getActionText(type: string): string {
    const actionTexts: Record<string, string> = {
      bid_received: 'View Bids',
      bid_accepted: 'View Job Details',
      bid_rejected: 'View Other Jobs',
      payment_received: 'View Job',
      job_completed: 'Review & Approve',
      payment_released: 'View Earnings',
      review_received: 'View Review',
      dispute_filed: 'View Dispute',
      message_received: 'View Message',
      quote_received: 'View Quote',
      quote_accepted: 'View Lead',
      quote_rejected: 'View Leads',
      lead_received: 'View Lead',
    };
    return actionTexts[type] || 'View Details';
  }

  /**
   * Generate email HTML
   */
  private static generateEmailHTML({
    userName,
    title,
    message,
    actionUrl,
    actionText,
  }: {
    userName: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText: string;
  }): string {
    const baseUrl = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
    const fullActionUrl = actionUrl ? `${protocol}://${baseUrl}${actionUrl}` : null;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${APP_NAME}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.5;">
                Hi ${userName},
              </p>
              
              <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 24px; font-weight: 600;">
                ${title}
              </h2>
              
              <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                ${message}
              </p>
              
              ${
                fullActionUrl
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${fullActionUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      ${actionText}
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; line-height: 1.5;">
                Best regards,<br>
                The ${APP_NAME} Team
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * HOMEOWNER NOTIFICATIONS
   */

  // Notify homeowner when a new bid is received
  static async notifyBidReceived({
    homeownerId,
    jobId,
    jobTitle,
    contractorName,
    bidAmount,
  }: {
    homeownerId: string;
    jobId: string;
    jobTitle: string;
    contractorName: string;
    bidAmount: number;
  }) {
    return this.createAndSendNotification({
      userId: homeownerId,
      type: 'bid_received',
      title: '🎯 New Bid Received!',
      message: `${contractorName} has submitted a bid of $${bidAmount.toFixed(2)} for "${jobTitle}". Review and compare bids now.`,
      actionUrl: `/homeowner/jobs/${jobId}`,
      metadata: { jobId, contractorName, bidAmount },
    });
  }

  // Notify homeowner when job is completed
  static async notifyJobCompleted({
    homeownerId,
    jobId,
    jobTitle,
    contractorName,
  }: {
    homeownerId: string;
    jobId: string;
    jobTitle: string;
    contractorName: string;
  }) {
    return this.createAndSendNotification({
      userId: homeownerId,
      type: 'job_completed',
      title: '✅ Job Completed - Action Required',
      message: `${contractorName} has marked "${jobTitle}" as complete. Please review the work and approve payment release within 7 days.`,
      actionUrl: `/homeowner/jobs/${jobId}`,
      metadata: { jobId, contractorName },
    });
  }

  // Notify homeowner when payment is auto-released
  static async notifyPaymentAutoReleased({
    homeownerId,
    jobId,
    jobTitle,
    amount,
  }: {
    homeownerId: string;
    jobId: string;
    jobTitle: string;
    amount: number;
  }) {
    return this.createAndSendNotification({
      userId: homeownerId,
      type: 'payment_released',
      title: '💰 Payment Released',
      message: `Payment of $${amount.toFixed(2)} for "${jobTitle}" has been automatically released after 7 days. A 5-star review was posted on your behalf.`,
      actionUrl: `/homeowner/jobs/${jobId}`,
      metadata: { jobId, amount },
    });
  }

  /**
   * CONTRACTOR NOTIFICATIONS
   */

  // Notify contractor when bid is accepted
  static async notifyBidAccepted({
    contractorId,
    jobId,
    jobTitle,
    homeownerName,
    amount,
  }: {
    contractorId: string;
    jobId: string;
    jobTitle: string;
    homeownerName: string;
    amount: number;
  }) {
    return this.createAndSendNotification({
      userId: contractorId,
      type: 'bid_accepted',
      title: '🎉 Your Bid Was Accepted!',
      message: `Congratulations! ${homeownerName} has accepted your bid of $${amount.toFixed(2)} for "${jobTitle}". Payment has been secured in escrow.`,
      actionUrl: `/contractor-dashboard/jobs/${jobId}`,
      metadata: { jobId, homeownerName, amount },
    });
  }

  // Notify contractor when bid is rejected
  static async notifyBidRejected({
    contractorId,
    jobId,
    jobTitle,
    reason,
  }: {
    contractorId: string;
    jobId: string;
    jobTitle: string;
    reason?: string;
  }) {
    const message = reason
      ? `Your bid for "${jobTitle}" was not selected. Reason: ${reason}`
      : `Your bid for "${jobTitle}" was not selected. Keep bidding on other jobs!`;

    return this.createAndSendNotification({
      userId: contractorId,
      type: 'bid_rejected',
      title: 'Bid Not Selected',
      message,
      actionUrl: '/contractors?view=jobs',
      metadata: { jobId, reason },
    });
  }

  // Notify contractor when payment is received
  static async notifyPaymentReceived({
    contractorId,
    jobId,
    jobTitle,
    amount,
  }: {
    contractorId: string;
    jobId: string;
    jobTitle: string;
    amount: number;
  }) {
    return this.createAndSendNotification({
      userId: contractorId,
      type: 'payment_received',
      title: '💰 Payment Received',
      message: `Payment of $${amount.toFixed(2)} for "${jobTitle}" has been received and is held in escrow. Complete the work to release funds.`,
      actionUrl: `/contractor-dashboard/jobs/${jobId}`,
      metadata: { jobId, amount },
    });
  }

  // Notify contractor when payment is released
  static async notifyPaymentReleased({
    contractorId,
    jobId,
    jobTitle,
    amount,
    rating,
  }: {
    contractorId: string;
    jobId: string;
    jobTitle: string;
    amount: number;
    rating: number;
  }) {
    return this.createAndSendNotification({
      userId: contractorId,
      type: 'payment_released',
      title: '🎊 Payment Released!',
      message: `Great news! Payment of $${amount.toFixed(2)} for "${jobTitle}" has been released. You received a ${rating}-star review!`,
      actionUrl: `/contractor-dashboard/jobs/${jobId}`,
      metadata: { jobId, amount, rating },
    });
  }

  // Notify contractor when they receive a review
  static async notifyReviewReceived({
    contractorId,
    jobId,
    jobTitle,
    rating,
    reviewText,
  }: {
    contractorId: string;
    jobId: string;
    jobTitle: string;
    rating: number;
    reviewText?: string;
  }) {
    const stars = '⭐'.repeat(rating);
    const message = reviewText
      ? `You received a ${rating}-star review ${stars} for "${jobTitle}": "${reviewText.substring(0, 100)}${reviewText.length > 100 ? '...' : ''}"`
      : `You received a ${rating}-star review ${stars} for "${jobTitle}".`;

    return this.createAndSendNotification({
      userId: contractorId,
      type: 'review_received',
      title: '⭐ New Review Received',
      message,
      actionUrl: `/contractor-dashboard/jobs/${jobId}`,
      metadata: { jobId, rating, reviewText },
    });
  }

  /**
   * DISPUTE NOTIFICATIONS
   */

  // Notify contractor when dispute is filed
  static async notifyDisputeFiled({
    contractorId,
    jobId,
    jobTitle,
    homeownerName,
  }: {
    contractorId: string;
    jobId: string;
    jobTitle: string;
    homeownerName: string;
  }) {
    return this.createAndSendNotification({
      userId: contractorId,
      type: 'dispute_filed',
      title: '⚠️ Dispute Filed',
      message: `${homeownerName} has filed a dispute for "${jobTitle}". Our team will review and contact you within 24 hours. Payment is held during review.`,
      actionUrl: `/contractor-dashboard/jobs/${jobId}`,
      metadata: { jobId, homeownerName },
    });
  }

  // Notify homeowner about dispute status
  static async notifyDisputeUpdate({
    homeownerId,
    disputeId,
    jobTitle,
    status,
    message,
  }: {
    homeownerId: string;
    disputeId: string;
    jobTitle: string;
    status: string;
    message: string;
  }) {
    return this.createAndSendNotification({
      userId: homeownerId,
      type: 'dispute_update',
      title: `Dispute Update: ${jobTitle}`,
      message,
      actionUrl: `/dispute-center/${disputeId}`,
      metadata: { disputeId, status },
    });
  }

  /**
   * MESSAGE NOTIFICATIONS
   */

  // Notify user of new message
  static async notifyNewMessage({
    recipientId,
    senderName,
    messagePreview,
    threadId,
  }: {
    recipientId: string;
    senderName: string;
    messagePreview: string;
    threadId: string;
  }) {
    return this.createAndSendNotification({
      userId: recipientId,
      type: 'message_received',
      title: `💬 New Message from ${senderName}`,
      message: messagePreview.substring(0, 150) + (messagePreview.length > 150 ? '...' : ''),
      actionUrl: `/messages/${threadId}`,
      metadata: { threadId, senderName },
    });
  }

  /**
   * QUOTE NOTIFICATIONS
   */

  // Notify customer when they receive a quote
  static async notifyQuoteReceived({
    customerId,
    quoteId,
    leadTitle,
    contractorName,
    amount,
  }: {
    customerId: string;
    quoteId: string;
    leadTitle: string;
    contractorName: string;
    amount: number;
  }) {
    return this.createAndSendNotification({
      userId: customerId,
      type: 'quote_received',
      title: '📋 New Quote Received!',
      message: `${contractorName} has sent you a quote of $${amount.toFixed(2)} for "${leadTitle}". Review and accept to get started.`,
      actionUrl: `/homeowner/quotes`,
      metadata: { quoteId, contractorName, amount },
    });
  }

  // Notify contractor when quote is accepted
  static async notifyQuoteAccepted({
    contractorId,
    quoteId,
    leadTitle,
    customerName,
    amount,
  }: {
    contractorId: string;
    quoteId: string;
    leadTitle: string;
    customerName: string;
    amount: number;
  }) {
    return this.createAndSendNotification({
      userId: contractorId,
      type: 'quote_accepted',
      title: '🎉 Quote Accepted!',
      message: `Congratulations! ${customerName} has accepted your quote of $${amount.toFixed(2)} for "${leadTitle}". Time to get started!`,
      actionUrl: `/contractor-dashboard/leads`,
      metadata: { quoteId, customerName, amount },
    });
  }

  // Notify contractor when quote is rejected
  static async notifyQuoteRejected({
    contractorId,
    quoteId,
    leadTitle,
    customerName,
    reason,
  }: {
    contractorId: string;
    quoteId: string;
    leadTitle: string;
    customerName: string;
    reason: string;
  }) {
    return this.createAndSendNotification({
      userId: contractorId,
      type: 'quote_rejected',
      title: 'Quote Not Accepted',
      message: `${customerName} has declined your quote for "${leadTitle}". Reason: ${reason}`,
      actionUrl: `/contractor-dashboard/leads`,
      metadata: { quoteId, reason },
    });
  }

  // Notify contractor when they receive a lead
  static async notifyLeadReceived({
    contractorId,
    leadId,
    leadTitle,
    budgetRange,
    matchScore,
  }: {
    contractorId: string;
    leadId: string;
    leadTitle: string;
    budgetRange?: string;
    matchScore: number;
  }) {
    const budgetText = budgetRange ? ` Budget: ${budgetRange}.` : '';
    return this.createAndSendNotification({
      userId: contractorId,
      type: 'lead_received',
      title: '🎯 New Lead Available!',
      message: `New project: "${leadTitle}".${budgetText} Match score: ${matchScore}%. Review and send a quote now!`,
      actionUrl: `/contractor-dashboard/leads`,
      metadata: { leadId, matchScore },
    });
  }

  // Notify contractor when they receive a counter-offer
  static async notifyCounterOfferReceived({
    contractorId,
    quoteId,
    leadTitle,
    customerName,
    originalAmount,
    counterAmount,
  }: {
    contractorId: string;
    quoteId: string;
    leadTitle: string;
    customerName: string;
    originalAmount: number;
    counterAmount: number;
  }) {
    const difference = originalAmount - counterAmount;
    const percentDiff = ((difference / originalAmount) * 100).toFixed(0);
    return this.createAndSendNotification({
      userId: contractorId,
      type: 'counter_offer_received',
      title: '🔄 Counter-Offer Received',
      message: `${customerName} sent a counter-offer of $${counterAmount.toFixed(2)} (${percentDiff}% lower) for "${leadTitle}". Review and respond now.`,
      actionUrl: `/contractor-dashboard/leads`,
      metadata: { quoteId, originalAmount, counterAmount },
    });
  }

  // Notify customer when contractor accepts counter-offer
  static async notifyCounterOfferAccepted({
    customerId,
    quoteId,
    leadTitle,
    contractorName,
    amount,
  }: {
    customerId: string;
    quoteId: string;
    leadTitle: string;
    contractorName: string;
    amount: number;
  }) {
    return this.createAndSendNotification({
      userId: customerId,
      type: 'counter_offer_accepted',
      title: '✅ Counter-Offer Accepted!',
      message: `${contractorName} accepted your counter-offer of $${amount.toFixed(2)} for "${leadTitle}". The job is ready to start!`,
      actionUrl: `/homeowner/quotes`,
      metadata: { quoteId, amount },
    });
  }

  // Notify customer when contractor rejects counter-offer
  static async notifyCounterOfferRejected({
    customerId,
    quoteId,
    leadTitle,
    contractorName,
  }: {
    customerId: string;
    quoteId: string;
    leadTitle: string;
    contractorName: string;
  }) {
    return this.createAndSendNotification({
      userId: customerId,
      type: 'counter_offer_rejected',
      title: 'Counter-Offer Declined',
      message: `${contractorName} declined your counter-offer for "${leadTitle}". You can accept the original quote or send a new counter-offer.`,
      actionUrl: `/homeowner/quotes`,
      metadata: { quoteId },
    });
  }
}
