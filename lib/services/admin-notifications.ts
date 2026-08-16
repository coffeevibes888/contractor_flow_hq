'use server';

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Property Flow HQ';

type NotificationType = 
  | 'new_signup'
  | 'contact_form'
  | 'live_agent_request'
  | 'suspicious_activity'
  | 'new_subscription'
  | 'failed_payment'
  | 'high_value_signup';

interface NotificationData {
  type: NotificationType;
  subject: string;
  details: Record<string, string | number | boolean | undefined>;
}

/**
 * Send notification email to platform admin
 */
export async function notifyAdmin(data: NotificationData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured - skipping admin notification');
    return { success: false, error: 'Resend not configured' };
  }
  if (!ADMIN_EMAIL) {
    console.warn('ADMIN_NOTIFICATION_EMAIL not configured - skipping admin notification');
    return { success: false, error: 'Admin email not configured' };
  }

  const { type, subject, details } = data;
  
  const priorityEmoji = getPriorityEmoji(type);
  const bgColor = getPriorityColor(type);
  
  const detailsHtml = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">${formatKey(key)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;">${value}</td>
      </tr>
    `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${bgColor}; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <span style="font-size: 48px;">${priorityEmoji}</span>
          <h1 style="color: white; margin: 16px 0 0 0; font-size: 24px;">${subject}</h1>
        </div>
        
        <div style="background: white; border-radius: 0 0 12px 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <table style="width: 100%; border-collapse: collapse;">
            ${detailsHtml}
          </table>
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://propertyflowhq.com'}/super-admin" 
               style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Open Admin Dashboard
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            This is an automated notification from ${APP_NAME}.<br>
            Sent at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: `${APP_NAME} Alerts <${SENDER_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `${priorityEmoji} ${subject}`,
      html,
    });
    
    console.log(`Admin notification sent: ${type}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return { success: false, error: String(error) };
  }
}

// Helper functions
function getPriorityEmoji(type: NotificationType): string {
  const emojis: Record<NotificationType, string> = {
    new_signup: '🎉',
    contact_form: '📬',
    live_agent_request: '🔔',
    suspicious_activity: '🚨',
    new_subscription: '💰',
    failed_payment: '⚠️',
    high_value_signup: '⭐',
  };
  return emojis[type] || '📢';
}

function getPriorityColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    new_signup: 'linear-gradient(135deg, #10b981, #059669)',
    contact_form: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    live_agent_request: 'linear-gradient(135deg, #f59e0b, #d97706)',
    suspicious_activity: 'linear-gradient(135deg, #ef4444, #dc2626)',
    new_subscription: 'linear-gradient(135deg, #10b981, #059669)',
    failed_payment: 'linear-gradient(135deg, #f59e0b, #d97706)',
    high_value_signup: 'linear-gradient(135deg, #f59e0b, #d97706)',
  };
  return colors[type] || 'linear-gradient(135deg, #6b7280, #4b5563)';
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ');
}

// ============= SPECIFIC NOTIFICATION FUNCTIONS =============

/**
 * Notify when a new user signs up
 */
export async function notifyNewSignup(user: {
  name: string;
  email: string;
  role?: string;
  signupMethod?: string;
}) {
  return notifyAdmin({
    type: 'new_signup',
    subject: 'New User Signup',
    details: {
      name: user.name,
      email: user.email,
      role: user.role || 'Not specified',
      signupMethod: user.signupMethod || 'Email',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify when someone submits the contact form
 */
export async function notifyContactForm(contact: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
}) {
  return notifyAdmin({
    type: 'contact_form',
    subject: 'New Contact Form Submission',
    details: {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      subject: contact.subject || 'General Inquiry',
      message: contact.message.substring(0, 500) + (contact.message.length > 500 ? '...' : ''),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify when someone requests to speak to a live agent
 */
export async function notifyLiveAgentRequest(request: {
  userName?: string;
  userEmail?: string;
  userId?: string;
  source: string;
  message?: string;
}) {
  return notifyAdmin({
    type: 'live_agent_request',
    subject: '🔴 Live Agent Request - Action Needed',
    details: {
      userName: request.userName || 'Anonymous',
      userEmail: request.userEmail || 'Not provided',
      userId: request.userId,
      source: request.source,
      message: request.message,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify about suspicious activity
 */
export async function notifySuspiciousActivity(activity: {
  type: string;
  description: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}) {
  const severityEmoji = {
    low: '🟡',
    medium: '🟠', 
    high: '🔴',
    critical: '🚨',
  };
  
  return notifyAdmin({
    type: 'suspicious_activity',
    subject: `${severityEmoji[activity.severity]} Suspicious Activity Detected`,
    details: {
      activityType: activity.type,
      description: activity.description,
      severity: activity.severity.toUpperCase(),
      userId: activity.userId,
      userEmail: activity.userEmail,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent?.substring(0, 100),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify when someone upgrades to a paid subscription
 */
export async function notifyNewSubscription(subscription: {
  userName: string;
  userEmail: string;
  plan: string;
  amount: number;
  interval: 'monthly' | 'yearly';
}) {
  return notifyAdmin({
    type: 'new_subscription',
    subject: `New ${subscription.plan} Subscription!`,
    details: {
      userName: subscription.userName,
      userEmail: subscription.userEmail,
      plan: subscription.plan,
      amount: `$${subscription.amount}/${subscription.interval === 'yearly' ? 'year' : 'month'}`,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify about failed payments
 */
export async function notifyFailedPayment(payment: {
  userName: string;
  userEmail: string;
  amount: number;
  reason: string;
  paymentType: string;
}) {
  return notifyAdmin({
    type: 'failed_payment',
    subject: 'Payment Failed',
    details: {
      userName: payment.userName,
      userEmail: payment.userEmail,
      amount: `$${payment.amount.toFixed(2)}`,
      paymentType: payment.paymentType,
      failureReason: payment.reason,
      timestamp: new Date().toISOString(),
    },
  });
}
