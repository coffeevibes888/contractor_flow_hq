/**
 * GET /api/cron/send-lease-lead-drip
 *
 * Vercel cron — runs daily at 11:00 UTC (see vercel.json).
 *
 * Sends two behaviour-driven drip emails to everyone who used the free
 * public lease builder (regardless of whether they also sent for e-sign):
 *
 *   1. Day-3 features explainer
 *      → Lead created 3+ days ago and has not yet converted.
 *      → Subject: "While you still have that lease — here's what PropertyFlow does next"
 *      → Walks through the top features: rent collection, tenant portal,
 *        maintenance, accounting, e-signatures, unlimited leases.
 *
 *   2. Day-7 features follow-up
 *      → Lead created 7+ days ago and has not yet converted.
 *      → Subject: "Still managing rent manually? Here's the 5-minute fix."
 *      → A lighter, more direct "switching" angle for first-timers and
 *        landlords considering moving off spreadsheets / other tools.
 *
 * Both emails are sent even if the lead used e-sign — they may still not
 * have a PropertyFlow account.
 *
 * Deduplication: leaseLeadEmailsSent JSON field on FreeLeaseUsage
 *   { day3_features: true, day7_features: true }
 * Written after each successful Resend call so the email fires exactly once.
 *
 * Converted leads are excluded — they already have an account.
 *
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/db/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Gregory at PropertyFlow HQ <${process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com'}>`;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

// ─── Email templates ──────────────────────────────────────────────────────────

function day3FeaturesHtml(firstName: string, signUpUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1f2328;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;max-width:560px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:28px 32px;">
          <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-transform:uppercase;">PropertyFlow HQ</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">
            While you still have that lease —<br>here's what PropertyFlow does next
          </h1>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0 0 12px;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;color:#374151;">
            A few days ago you built a lease on PropertyFlow HQ — hope it went smoothly.
            Whether you're managing your first rental or your tenth, I wanted to show you
            what landlords are doing <em>after</em> the lease is signed.
          </p>
          <p style="margin:0 0 20px;color:#374151;">
            This is what the platform actually does once a tenant moves in:
          </p>
        </td></tr>

        <!-- Feature list -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              {
                icon: '💳',
                title: 'Online rent collection',
                desc: 'Tenants pay by ACH or card from their portal. Automatic reminders go out 3 days before the due date — no texts from you. Late fees apply automatically when payment is overdue.',
              },
              {
                icon: '🏠',
                title: 'Tenant portal',
                desc: 'Every tenant gets their own login to pay rent, submit maintenance requests, view lease documents, and track request status. Fewer calls, fewer texts.',
              },
              {
                icon: '🔧',
                title: 'Maintenance tracking',
                desc: 'Tenants submit requests with photos. You assign a contractor, track progress, and close the work order — all logged with a full audit trail.',
              },
              {
                icon: '📊',
                title: 'Rental accounting',
                desc: 'Every payment is automatically categorized. P&L, rent roll, and expense reports are always current. Export to CSV at tax time.',
              },
              {
                icon: '✍️',
                title: 'Unlimited e-signatures',
                desc: 'Generate a lease for any property, send it to your tenant for e-signature, and get a legally-binding signed copy back — all from your dashboard.',
              },
              {
                icon: '📋',
                title: 'Unlimited leases',
                desc: 'Build state-specific leases for every unit you manage. No per-document fees, no caps.',
              },
            ].map(({ icon, title, desc }) => `
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:22px;width:40px;vertical-align:top;padding-top:1px;">${icon}</td>
                <td>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${title}</p>
                  <p style="margin:3px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`).join('')}
          </table>
        </td></tr>

        <!-- Social proof callout -->
        <tr><td style="padding:0 32px 28px;">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#0369a1;line-height:1.6;">
              <strong>Most landlords who switch tell us the same thing:</strong>
              they spent years chasing rent by text and tracking payments in a spreadsheet.
              PropertyFlow replaced all of that for about the cost of a dinner out.
            </p>
          </div>
        </td></tr>

        <!-- Pricing -->
        <tr><td style="padding:0 32px 8px;">
          <p style="margin:0;font-size:15px;font-weight:700;color:#111827;">Simple flat-rate pricing</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">
            Three tiers, one simple price per tier — no per-unit fees, no transaction percentages.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
            ${[
              ['Starter',    '$39/mo',  'Up to 24 units · All core features included'],
              ['Pro',        '$99/mo',  'Up to 150 units · Auto reminders & late fees'],
              ['Enterprise', '$199/mo', 'Unlimited units · Full operations suite'],
            ].map(([tier, price, note]) => `
            <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
              <table cellpadding="0" cellspacing="0" width="100%"><tr>
                <td><p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${tier}</p><p style="margin:1px 0 0;font-size:11px;color:#9ca3af;">${note}</p></td>
                <td align="right"><p style="margin:0;font-size:14px;font-weight:700;color:#0ea5e9;">${price}</p></td>
              </tr></table>
            </td></tr>`).join('')}
          </table>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">14-day free trial · No credit card required · Cancel anytime</p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:20px 32px 32px;text-align:center;">
          <a href="${signUpUrl}"
             style="display:inline-block;background:#0ea5e9;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:12px;">
            Start Your Free 14-Day Trial →
          </a>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Takes 2 minutes · No card · Cancel anytime</p>
        </td></tr>

        <!-- Sign-off -->
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0;font-size:14px;color:#374151;">
            — Gregory<br>
            <span style="color:#57606a;font-size:13px;">PropertyFlow HQ</span>
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#6b7280;font-style:italic;">
            Questions? Just reply — I read every one.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            PropertyFlow HQ · <a href="${APP_URL}" style="color:#9ca3af;">propertyflowhq.com</a><br>
            You received this because you used the free lease builder.
            <a href="${APP_URL}/unsubscribe?email={{email}}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function day7FeaturesHtml(firstName: string, signUpUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1f2328;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;max-width:560px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;">
          <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-transform:uppercase;">PropertyFlow HQ</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">
            Still managing rent manually?<br>Here's the 5-minute fix.
          </h1>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0 0 12px;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;color:#374151;">
            It's been about a week since you built your lease on PropertyFlow.
            If you're still collecting rent by check, Venmo, or Zelle —
            or tracking payments in a spreadsheet — I want to show you how fast
            that changes.
          </p>
        </td></tr>

        <!-- The before/after comparison -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr style="background:#fef2f2;">
              <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;width:50%;">Without PropertyFlow</td>
              <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.06em;background:#f0fdf4;">With PropertyFlow</td>
            </tr>
            ${[
              ['Text tenant about rent', 'Automatic reminder sent 3 days early'],
              ['Chase late payments by hand', 'Late fee auto-applied, tenant notified'],
              ['Screenshot Venmo, file it somewhere', 'Payment logged, rent roll updated instantly'],
              ['Spreadsheet for every property', 'Dashboard with every unit in one view'],
              ['Email back and forth for maintenance', 'Tenant submits a ticket, you assign it, done'],
              ['Scramble at tax time', 'P&L and expense reports ready to export'],
            ].map(([before, after], i) => `
            <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
              <td style="padding:10px 16px;border-top:1px solid #f1f5f9;font-size:13px;color:#6b7280;vertical-align:top;">❌ ${before}</td>
              <td style="padding:10px 16px;border-top:1px solid #f1f5f9;font-size:13px;color:#111827;vertical-align:top;">✅ ${after}</td>
            </tr>`).join('')}
          </table>
        </td></tr>

        <!-- Is this for you? -->
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#111827;">Is PropertyFlow right for you?</p>
          <p style="margin:0 0 12px;font-size:13px;color:#374151;">It's built for landlords who:</p>
          <table cellpadding="0" cellspacing="0">
            ${[
              'Are managing their first rental and want to start organized',
              'Are tired of chasing rent by text or phone call',
              'Have tried another property management tool and found it too complicated or expensive',
              'Want to look professional to tenants without spending hours on admin',
              'Are thinking about scaling up and want a system that grows with them',
            ].map((item) => `
            <tr><td style="padding:5px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#7c3aed;font-size:16px;width:24px;vertical-align:top;">›</td>
                <td style="font-size:13px;color:#374151;">${item}</td>
              </tr></table>
            </td></tr>`).join('')}
          </table>
        </td></tr>

        <!-- Trial callout -->
        <tr><td style="padding:0 32px 28px;">
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:18px 20px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#7c3aed;">14-day free trial — no credit card needed</p>
            <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
              Every feature is fully unlocked during the trial. Add your property,
              invite your tenant, and let the system run for two weeks.
              If it doesn't save you time, cancel with one click — no questions asked.
            </p>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${signUpUrl}"
             style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:12px;">
            Try PropertyFlow Free for 14 Days →
          </a>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">$39/mo after trial · No card required to start</p>
        </td></tr>

        <!-- Sign-off -->
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0;font-size:14px;color:#374151;">
            — Gregory<br>
            <span style="color:#57606a;font-size:13px;">PropertyFlow HQ</span>
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#6b7280;font-style:italic;">
            Reply to this email if you have any questions — I read every one.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            PropertyFlow HQ · <a href="${APP_URL}" style="color:#9ca3af;">propertyflowhq.com</a><br>
            You received this because you used the free lease builder.
            <a href="${APP_URL}/unsubscribe?email={{email}}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Cron handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let day3Sent = 0;
  let day7Sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // ── Day-3 features explainer ───────────────────────────────────────────────
    // Fires to leads who signed up 3+ days ago and haven't converted.
    const day3Candidates = await (prisma as any).freeLeaseUsage.findMany({
      where: {
        createdAt: { lte: threeDaysAgo },
        converted: false,
      },
      select: {
        id: true,
        email: true,
        landlordName: true,
        leaseLeadEmailsSent: true,
      },
      take: 300,
    });

    const day3Leads = day3Candidates.filter((l: { leaseLeadEmailsSent: Record<string, boolean> | null }) => {
      const sent = (l.leaseLeadEmailsSent as Record<string, boolean> | null) ?? {};
      return !sent['day3_features'];
    });

    for (const lead of day3Leads) {
      const { email, landlordName } = lead;
      if (!email) { skipped++; continue; }

      const firstName = (landlordName || 'there').split(' ')[0];
      const signUpUrl = `${APP_URL}/sign-up?email=${encodeURIComponent(email)}&utm_source=free_lease&utm_medium=drip_day3`;

      try {
        const { error } = await resend.emails.send({
          from: FROM,
          to: [email],
          subject: "While you still have that lease — here's what PropertyFlow does next",
          html: day3FeaturesHtml(firstName, signUpUrl),
          tags: [{ name: 'email_type', value: 'lease_lead_day3' }],
        });

        if (error) {
          console.error(`[lease-lead-drip] day3 error for ${lead.id}:`, error);
          errors++;
          continue;
        }

        const existing = (lead.leaseLeadEmailsSent as Record<string, boolean> | null) ?? {};
        await (prisma as any).freeLeaseUsage.update({
          where: { id: lead.id },
          data: { leaseLeadEmailsSent: { ...existing, day3_features: true } },
        });
        day3Sent++;
      } catch (err) {
        console.error(`[lease-lead-drip] unexpected error for lead ${lead.id}:`, err);
        errors++;
      }
    }

    // ── Day-7 features follow-up ───────────────────────────────────────────────
    // Fires to leads who signed up 7+ days ago and haven't converted.
    const day7Candidates = await (prisma as any).freeLeaseUsage.findMany({
      where: {
        createdAt: { lte: sevenDaysAgo },
        converted: false,
      },
      select: {
        id: true,
        email: true,
        landlordName: true,
        leaseLeadEmailsSent: true,
      },
      take: 300,
    });

    const day7Leads = day7Candidates.filter((l: { leaseLeadEmailsSent: Record<string, boolean> | null }) => {
      const sent = (l.leaseLeadEmailsSent as Record<string, boolean> | null) ?? {};
      return !sent['day7_features'];
    });

    for (const lead of day7Leads) {
      const { email, landlordName } = lead;
      if (!email) { skipped++; continue; }

      const firstName = (landlordName || 'there').split(' ')[0];
      const signUpUrl = `${APP_URL}/sign-up?email=${encodeURIComponent(email)}&utm_source=free_lease&utm_medium=drip_day7`;

      try {
        const { error } = await resend.emails.send({
          from: FROM,
          to: [email],
          subject: "Still managing rent manually? Here's the 5-minute fix.",
          html: day7FeaturesHtml(firstName, signUpUrl),
          tags: [{ name: 'email_type', value: 'lease_lead_day7' }],
        });

        if (error) {
          console.error(`[lease-lead-drip] day7 error for ${lead.id}:`, error);
          errors++;
          continue;
        }

        const existing = (lead.leaseLeadEmailsSent as Record<string, boolean> | null) ?? {};
        await (prisma as any).freeLeaseUsage.update({
          where: { id: lead.id },
          data: { leaseLeadEmailsSent: { ...existing, day7_features: true } },
        });
        day7Sent++;
      } catch (err) {
        console.error(`[lease-lead-drip] unexpected error for lead ${lead.id}:`, err);
        errors++;
      }
    }

    console.log('[cron/send-lease-lead-drip]', { day3Sent, day7Sent, skipped, errors });

    return NextResponse.json({ success: true, day3Sent, day7Sent, skipped, errors });
  } catch (err) {
    console.error('[cron/send-lease-lead-drip] fatal:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
