/**
 * SMS Service — Powered by Twilio
 *
 * Requires in .env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER  (e.g. +13477905953)
 *
 * The service gracefully no-ops when credentials are missing so the app
 * continues to function before the Twilio account is funded.
 */

export type SmsEventType =
  | 'rent_reminder'
  | 'late_rent_reminder'
  | 'new_application'
  | 'tenant_message'
  | 'maintenance_update'
  | 'payment_received'
  | 'lease_expiring'
  | 'general';

interface SendSmsOptions {
  to: string;
  message: string;
  eventType?: SmsEventType;
}

interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

// Normalise a phone number to E.164 format (+1XXXXXXXXXX)
function normalisePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

// Check whether Twilio credentials are configured
function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.TWILIO_ACCOUNT_SID !== 'your-account-sid' &&
    process.env.TWILIO_AUTH_TOKEN !== 'your-auth-token'
  );
}

// Core send function — all SMS goes through here
export async function sendSms({ to, message, eventType = 'general' }: SendSmsOptions): Promise<SmsResult> {
  if (!isTwilioConfigured()) {
    console.log(`[SMS] Twilio not yet funded — skipping ${eventType} SMS to ${to}`);
    return { success: false, error: 'Twilio not configured' };
  }

  const normalised = normalisePhone(to);
  if (!normalised) {
    console.error(`[SMS] Invalid phone number: ${to}`);
    return { success: false, error: `Invalid phone number: ${to}` };
  }

  try {
    // Dynamic import keeps Twilio out of the client bundle
    const twilio = (await import('twilio')).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: normalised,
    });

    console.log(`[SMS] ✓ Sent ${eventType} to ${normalised} — SID: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  } catch (err: any) {
    console.error(`[SMS] ✗ Failed to send ${eventType} to ${normalised}:`, err?.message ?? err);
    return { success: false, error: err?.message ?? String(err) };
  }
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

/** Rent due reminder sent ~3–5 days before due date */
export async function sendRentReminderSms(
  phone: string,
  tenantName: string,
  rentAmount: string,
  dueDate: string,
  propertyName: string
): Promise<SmsResult> {
  const message =
    `Hi ${tenantName}, this is a reminder that your rent of $${rentAmount} ` +
    `for ${propertyName} is due on ${dueDate}. ` +
    `Log in to pay: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://propertyflowhq.com'}`;

  return sendSms({ to: phone, message, eventType: 'rent_reminder' });
}

/** Late rent alert sent after due date has passed */
export async function sendLateRentSms(
  phone: string,
  tenantName: string,
  rentAmount: string,
  daysLate: number,
  propertyName: string
): Promise<SmsResult> {
  const message =
    `Hi ${tenantName}, your rent of $${rentAmount} for ${propertyName} ` +
    `is ${daysLate} day${daysLate !== 1 ? 's' : ''} past due. ` +
    `Please pay immediately to avoid late fees: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://propertyflowhq.com'}`;

  return sendSms({ to: phone, message, eventType: 'late_rent_reminder' });
}

/** Notify a landlord/PM about a new rental application */
export async function sendNewApplicationSms(
  phone: string,
  recipientName: string,
  applicantName: string,
  propertyName: string,
  unitName: string
): Promise<SmsResult> {
  const message =
    `Hi ${recipientName}, new rental application from ${applicantName} ` +
    `for ${propertyName} – Unit ${unitName}. ` +
    `Review it: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://propertyflowhq.com'}/applications`;

  return sendSms({ to: phone, message, eventType: 'new_application' });
}

/** Alert recipient of a new tenant message */
export async function sendNewMessageSms(
  phone: string,
  recipientName: string,
  senderName: string,
  preview: string
): Promise<SmsResult> {
  const truncated = preview.length > 80 ? preview.slice(0, 77) + '...' : preview;
  const message =
    `Hi ${recipientName}, new message from ${senderName}: "${truncated}" ` +
    `Reply at: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://propertyflowhq.com'}/messages`;

  return sendSms({ to: phone, message, eventType: 'tenant_message' });
}

/** Maintenance ticket status update */
export async function sendMaintenanceSms(
  phone: string,
  recipientName: string,
  ticketTitle: string,
  status: string,
  propertyName: string
): Promise<SmsResult> {
  const statusLabel: Record<string, string> = {
    open: 'opened',
    in_progress: 'in progress',
    resolved: 'resolved',
    closed: 'closed',
  };
  const label = statusLabel[status] ?? status;

  const message =
    `Hi ${recipientName}, maintenance ticket "${ticketTitle}" at ${propertyName} ` +
    `has been marked ${label}. ` +
    `View details: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://propertyflowhq.com'}/maintenance`;

  return sendSms({ to: phone, message, eventType: 'maintenance_update' });
}

/** Confirm rent payment was received */
export async function sendPaymentReceivedSms(
  phone: string,
  tenantName: string,
  amount: string,
  propertyName: string
): Promise<SmsResult> {
  const message =
    `Hi ${tenantName}, we received your rent payment of $${amount} for ${propertyName}. Thank you!`;

  return sendSms({ to: phone, message, eventType: 'payment_received' });
}

/** Notify landlord/PM that a lease is expiring soon */
export async function sendLeaseExpiringSms(
  phone: string,
  recipientName: string,
  tenantName: string,
  propertyName: string,
  unitName: string,
  daysUntilExpiry: number
): Promise<SmsResult> {
  const message =
    `Hi ${recipientName}, the lease for ${tenantName} at ${propertyName} – Unit ${unitName} ` +
    `expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. ` +
    `Manage leases: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://propertyflowhq.com'}/leases`;

  return sendSms({ to: phone, message, eventType: 'lease_expiring' });
}
