/**
 * GET /api/cron/send-landlord-lifecycle-emails
 *
 * Vercel cron — runs daily at 10:00 UTC (see vercel.json).
 *
 * Sends behaviour-triggered emails to landlords who have signed up but
 * haven't yet completed key activation steps:
 *
 *   D1 — Day-1 automation explainer
 *        → Signed up 1+ days ago, still has 0 properties
 *        → Subject: "Here's exactly what happens after your tenant pays rent"
 *
 *   D2 — Day-2 no-property nudge
 *        → Signed up 2+ days ago, still has 0 properties
 *        → Subject: "Did you get stuck somewhere?"
 *
 *   D7 — Day-7 no-Stripe reminder  (requires at least 1 property)
 *        → Has a property but Stripe Connect is not complete
 *        → Subject: "One step from collecting rent online"
 *
 *   D21 — Day-21 win-back  (requires a property + trial expired)
 *        → Trial expired 7+ days ago, has a property, never subscribed
 *        → Subject: "Your PropertyFlow setup is still here, [Name]"
 *
 * Email bodies live in lib/email-templates/lifecycle.ts — imported here
 * and by the manual-send API at /api/super-admin/send-lifecycle-email.
 *
 * Deduplication: Landlord.trialRemindersSent JSON field.
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/db/prisma';
import { day1Html, day2Html, day7Html, day21Html } from '@/lib/email-templates/lifecycle';

const resend  = new Resend(process.env.RESEND_API_KEY);
const FROM    = `Gregory at PropertyFlow HQ <${process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com'}>`;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now           = new Date();
  const oneDayAgo     = new Date(now.getTime() - 1  * 24 * 60 * 60 * 1000);
  const twoDaysAgo    = new Date(now.getTime() - 2  * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  let day1Sent = 0, day2Sent = 0, day7Sent = 0, day21Sent = 0;
  let skipped = 0, errors = 0;

  // ── Helper: send one email + update guard ─────────────────────────────────
  async function send(
    landlordId: string,
    existing: Record<string, boolean>,
    email: string,
    subject: string,
    html: string,
    guardKey: string,
    emailType: string,
  ): Promise<boolean> {
    const { error } = await resend.emails.send({
      from,
      to: [email],
      subject,
      html,
      tags: [{ name: 'email_type', value: emailType }],
    });
    if (error) {
      console.error(`[lifecycle] ${emailType} error for ${landlordId}:`, error);
      errors++;
      return false;
    }
    await prisma.landlord.update({
      where: { id: landlordId },
      data:  { trialRemindersSent: { ...existing, [guardKey]: true } },
    });
    return true;
  }

  const from = FROM; // closure for the helper above

  try {
    // ── D1 — Automation explainer ─────────────────────────────────────────────
    const d1Candidates = await prisma.landlord.findMany({
      where: { createdAt: { lte: oneDayAgo }, properties: { none: {} } },
      select: {
        id: true, name: true, trialRemindersSent: true,
        owner: { select: { email: true, name: true } },
      },
      take: 200,
    });
    for (const l of d1Candidates) {
      const sent = (l.trialRemindersSent as Record<string, boolean> | null) ?? {};
      if (sent['day1_explainer']) continue;
      const email = l.owner?.email;
      if (!email) { skipped++; continue; }
      const firstName = (l.owner?.name || l.name || 'there').split(' ')[0];
      try {
        const ok = await send(
          l.id, sent, email,
          "Here's exactly what happens after your tenant pays rent",
          day1Html(firstName, APP_URL),
          'day1_explainer', 'day1_explainer',
        );
        if (ok) day1Sent++;
      } catch (err) {
        console.error(`[lifecycle] D1 unexpected error for ${l.id}:`, err);
        errors++;
      }
    }

    // ── D2 — No-property nudge ────────────────────────────────────────────────
    const d2Candidates = await prisma.landlord.findMany({
      where: { createdAt: { lte: twoDaysAgo }, properties: { none: {} } },
      select: {
        id: true, name: true, trialRemindersSent: true,
        owner: { select: { email: true, name: true } },
      },
      take: 200,
    });
    for (const l of d2Candidates) {
      const sent = (l.trialRemindersSent as Record<string, boolean> | null) ?? {};
      if (sent['day2_no_property']) continue;
      const email = l.owner?.email;
      if (!email) { skipped++; continue; }
      const firstName = (l.owner?.name || l.name || 'there').split(' ')[0];
      try {
        const ok = await send(
          l.id, sent, email,
          "Did you get stuck somewhere?",
          day2Html(firstName, APP_URL),
          'day2_no_property', 'day2_no_property',
        );
        if (ok) day2Sent++;
      } catch (err) {
        console.error(`[lifecycle] D2 unexpected error for ${l.id}:`, err);
        errors++;
      }
    }

    // ── D7 — No Stripe / bank ─────────────────────────────────────────────────
    const d7Candidates = await prisma.landlord.findMany({
      where: {
        createdAt: { lte: sevenDaysAgo },
        properties: { some: {} },
        OR: [
          { stripeOnboardingStatus: null },
          { stripeOnboardingStatus: { not: 'complete' } },
        ],
      },
      select: {
        id: true, name: true, trialRemindersSent: true,
        owner: { select: { email: true, name: true } },
      },
      take: 200,
    });
    for (const l of d7Candidates) {
      const sent = (l.trialRemindersSent as Record<string, boolean> | null) ?? {};
      if (sent['day7_no_stripe']) continue;
      const email = l.owner?.email;
      if (!email) { skipped++; continue; }
      const firstName = (l.owner?.name || l.name || 'there').split(' ')[0];
      try {
        const ok = await send(
          l.id, sent, email,
          "One step from collecting rent online",
          day7Html(firstName, APP_URL),
          'day7_no_stripe', 'day7_no_stripe',
        );
        if (ok) day7Sent++;
      } catch (err) {
        console.error(`[lifecycle] D7 unexpected error for ${l.id}:`, err);
        errors++;
      }
    }

    // ── D21 — Win-back ────────────────────────────────────────────────────────
    const d21Candidates = await prisma.landlord.findMany({
      where: {
        createdAt: { lte: twentyOneDaysAgo },
        properties: { some: {} },
        trialStatus: { not: 'trialing' },
        stripeSubscriptionId: null,
        subscription: null,
      },
      select: {
        id: true, name: true, trialRemindersSent: true,
        _count: { select: { properties: true } },
        owner: { select: { email: true, name: true } },
      },
      take: 200,
    });
    for (const l of d21Candidates) {
      const sent = (l.trialRemindersSent as Record<string, boolean> | null) ?? {};
      if (sent['day21_winback']) continue;
      const email = l.owner?.email;
      if (!email) { skipped++; continue; }
      const firstName = (l.owner?.name || l.name || 'there').split(' ')[0];
      try {
        const ok = await send(
          l.id, sent, email,
          `Your PropertyFlow setup is still here, ${firstName}`,
          day21Html(firstName, l._count.properties, APP_URL),
          'day21_winback', 'day21_winback',
        );
        if (ok) day21Sent++;
      } catch (err) {
        console.error(`[lifecycle] D21 unexpected error for ${l.id}:`, err);
        errors++;
      }
    }

    console.log('[cron/lifecycle]', { day1Sent, day2Sent, day7Sent, day21Sent, skipped, errors });
    return NextResponse.json({ success: true, day1Sent, day2Sent, day7Sent, day21Sent, skipped, errors });

  } catch (err) {
    console.error('[cron/send-landlord-lifecycle-emails] fatal:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
