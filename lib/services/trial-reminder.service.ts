/**
 * Trial Reminder Service
 *
 * Called daily by /api/cron/send-trial-reminders (14:00 UTC).
 * Scans all landlords still on a free trial and sends reminder emails at:
 *   - 2 days remaining  (day 12 of a 14-day trial)
 *   - 1 day remaining   (day 13)
 *   - 0 days remaining  (day 14 — trial expired)
 *
 * Two distinct email paths:
 *   - UNACTIVATED (no property added): aspirational — show what they're missing out on
 *   - ACTIVATED (has at least one property): loss-aversion — don't lose your setup
 *
 * Uses the Landlord.trialRemindersSent JSON field to ensure each reminder
 * fires exactly once. Format: { day12: true, day13: true, day14: true }
 */

import { Resend } from 'resend';
import { prisma } from '@/db/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

export interface TrialReminderResult {
  checked: number;
  sent: number;
  skipped: number;
  errors: number;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function unactivatedTrialEmailHtml(firstName: string, daysLeft: number): string {
  const billingUrl = `${APP_URL}/admin/billing`;
  const addPropertyUrl = `${APP_URL}/admin/dashboard/properties/new`;
  const urgencyLine = daysLeft === 0
    ? `Your free trial has ended — but your account is still here.`
    : daysLeft === 1
    ? `Your free trial ends tomorrow.`
    : `Your free trial ends in ${daysLeft} days.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1f2328;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;max-width:560px;">

        <tr><td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:28px 32px;">
          <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;">PropertyFlow HQ</p>
          <h1 style="margin:8px 0 0;font-size:21px;font-weight:800;color:#ffffff;line-height:1.3;">${urgencyLine}</h1>
        </td></tr>

        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0 0 14px;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;color:#374151;">
            While your trial has been running, landlords on PropertyFlow have been collecting rent automatically — no texts, no reminders, no chasing. Here's what your dashboard looks like once you add one property:
          </p>
        </td></tr>

        <!-- What-you-get preview -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            ${[
              ['💳', 'Rent collected automatically', 'Tenants get a reminder 3 days before due date. You get notified the moment they pay.'],
              ['🔧', 'Maintenance on autopilot', 'Tenants submit requests with photos. You assign them, track progress, close the loop.'],
              ['📊', 'Your rent roll, always current', 'Every payment logged, every unit tracked. P&L and reports ready at tax time.'],
              ['✍️', 'Leases sent and signed online', 'Generate a lease, send it for e-signature, get the signed copy back — all from your dashboard.'],
            ].map(([icon, title, desc]) => `
            <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:22px;width:36px;vertical-align:top;padding-top:1px;">${icon}</td>
                <td style="padding-left:12px;">
                  <p style="margin:0;font-size:13px;font-weight:700;color:#111827;">${title}</p>
                  <p style="margin:3px 0 0;font-size:12px;color:#6b7280;line-height:1.5;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`).join('')}
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 28px;text-align:center;">
          <a href="${addPropertyUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">
            Add Your First Property →
          </a>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Takes 3 minutes · Then subscribe to keep everything running · Plans from $39/mo</p>
        </td></tr>

        <tr><td style="padding:0 32px 8px;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#92400e;">
              <strong>Why subscribe?</strong> Your trial gives you full access to set things up. Once you subscribe, the automation keeps running — rent reminders go out automatically, payments deposit to your bank, and your dashboard stays live.
            </p>
          </div>
        </td></tr>

        <tr><td style="padding:20px 32px 8px;text-align:center;">
          <a href="${billingUrl}" style="font-size:13px;color:#7c3aed;text-decoration:underline;">See plans from $39/mo →</a>
        </td></tr>

        <tr><td style="padding:16px 32px 28px;">
          <p style="margin:0;font-size:14px;color:#374151;">— Gregory<br><span style="font-size:12px;color:#57606a;">PropertyFlow HQ</span></p>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">Questions? Reply to this email — I read every one.</p>
        </td></tr>

        <tr><td style="padding:14px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">PropertyFlow HQ · <a href="${APP_URL}" style="color:#9ca3af;">propertyflowhq.com</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function activatedTrialEmailHtml(firstName: string, daysLeft: number, propertiesCount: number): string {
  const billingUrl = `${APP_URL}/admin/billing`;
  const urgencyLine = daysLeft === 0
    ? `Your free trial has ended.`
    : daysLeft === 1
    ? `Your free trial ends tomorrow.`
    : `Your free trial ends in ${daysLeft} days.`;
  const unitWord = propertiesCount === 1 ? 'property' : 'properties';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1f2328;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;max-width:560px;">

        <tr><td style="background:linear-gradient(135deg,#059669,#0284c7);padding:28px 32px;">
          <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;">PropertyFlow HQ</p>
          <h1 style="margin:8px 0 0;font-size:21px;font-weight:800;color:#ffffff;line-height:1.3;">${urgencyLine}</h1>
        </td></tr>

        <tr><td style="padding:28px 32px 20px;">
          <p style="margin:0 0 14px;">Hi ${firstName},</p>
          <p style="margin:0 0 12px;color:#374151;">
            You've set up ${propertiesCount} ${unitWord} on PropertyFlow — don't lose your work. Everything you've configured: your ${unitWord}, tenant details, rent amounts, and lease documents are all saved and waiting.
          </p>
          <p style="margin:0;color:#374151;">Subscribe now to keep rent collection running and maintain access to everything you've built.</p>
        </td></tr>

        <!-- What they keep -->
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;">What stays active when you subscribe:</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              'Your properties, units, and tenant records',
              'Automatic rent reminders sent to tenants (Pro)',
              'Online rent collection — payments deposit to your bank',
              'Maintenance ticket tracking',
              'Lease documents and e-signatures',
              'Your dashboard, reports, and rent roll',
            ].map(item => `
            <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#059669;font-size:15px;width:24px;font-weight:700;">✓</td>
                <td style="font-size:13px;color:#374151;">${item}</td>
              </tr></table>
            </td></tr>`).join('')}
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 28px;text-align:center;">
          <a href="${billingUrl}" style="display:inline-block;background:#059669;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">
            Keep My Setup — Subscribe Now →
          </a>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Plans from $39/mo · Cancel anytime · No contracts</p>
        </td></tr>

        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;font-size:14px;color:#374151;">— Gregory<br><span style="font-size:12px;color:#57606a;">PropertyFlow HQ</span></p>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">Questions? Reply to this email — I read every one.</p>
        </td></tr>

        <tr><td style="padding:14px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">PropertyFlow HQ · <a href="${APP_URL}" style="color:#9ca3af;">propertyflowhq.com</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function sendAllLandlordTrialReminders(): Promise<TrialReminderResult> {
  const now = new Date();

  const landlords = await prisma.landlord.findMany({
    where: {
      trialStatus: 'trialing',
      trialEndDate: { not: null },
    },
    select: {
      id: true,
      name: true,
      trialEndDate: true,
      trialRemindersSent: true,
      lastReminderSentAt: true,
      _count: { select: { properties: true } },
      owner: {
        select: { email: true, name: true },
      },
    },
  });

  const result: TrialReminderResult = {
    checked: landlords.length,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  for (const landlord of landlords) {
    try {
      const email = landlord.owner?.email;
      if (!email) {
        result.skipped++;
        continue;
      }

      const endDate = landlord.trialEndDate!;
      const msLeft = endDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      // Only send at day 2, 1, or 0 remaining
      if (daysLeft > 2 || daysLeft < 0) {
        result.skipped++;
        continue;
      }

      const reminderKey = daysLeft === 2 ? 'day12' : daysLeft === 1 ? 'day13' : 'day14';
      const sent = (landlord.trialRemindersSent as Record<string, boolean> | null) ?? {};

      if (sent[reminderKey]) {
        result.skipped++;
        continue;
      }

      const firstName = (landlord.owner?.name || landlord.name || 'there').split(' ')[0];
      const propertiesCount = landlord._count.properties;
      const isActivated = propertiesCount > 0;

      const html = isActivated
        ? activatedTrialEmailHtml(firstName, daysLeft, propertiesCount)
        : unactivatedTrialEmailHtml(firstName, daysLeft);

      const subject = daysLeft === 0
        ? isActivated
          ? `Your PropertyFlow trial ended — keep your ${propertiesCount} ${propertiesCount === 1 ? 'property' : 'properties'} active`
          : `Your PropertyFlow HQ trial has ended`
        : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your PropertyFlow HQ trial`;

      const { error } = await resend.emails.send({
        from: `Gregory at PropertyFlow HQ <${FROM}>`,
        to: [email],
        subject,
        html,
        tags: [{ name: 'activated', value: isActivated ? 'true' : 'false' }],
      });

      if (error) {
        console.error(`[trial-reminder] Resend error for landlord ${landlord.id}:`, error);
        result.errors++;
        continue;
      }

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          lastReminderSentAt: now,
          trialRemindersSent: { ...sent, [reminderKey]: true },
        },
      });

      result.sent++;
    } catch (err) {
      console.error(`[trial-reminder] Unexpected error for landlord ${landlord.id}:`, err);
      result.errors++;
    }
  }

  return result;
}
