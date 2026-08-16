/**
 * POST /api/webhooks/resend
 *
 * Receives Resend webhook events and writes them to the EmailEvent table
 * so the Signups CRM can display real open/click/bounce tracking.
 *
 * Events handled:
 *   email.sent      — delivery confirmed by Resend
 *   email.opened    — recipient opened the email
 *   email.clicked   — recipient clicked a link
 *   email.bounced   — hard or soft bounce
 *   email.complained — spam report
 *   email.delivery_delayed — temporary delay
 *
 * Setup (one-time):
 *   1. Go to Resend Dashboard → Webhooks → Add endpoint
 *   2. URL: https://www.propertyflowhq.com/api/webhooks/resend
 *   3. Select all email.* events
 *   4. Copy the signing secret → add to .env as RESEND_WEBHOOK_SECRET
 *
 * Signature verification uses the Svix library (already shipped by Resend).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/db/prisma';

// Resend webhook event shape (simplified — we only need what we store)
interface ResendWebhookEvent {
  type: string; // 'email.sent' | 'email.opened' | etc.
  data: {
    email_id:   string;
    from:       string;
    to:         string[];
    subject?:   string;
    click?:     { link: string };
    [key: string]: unknown;
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // ── Signature verification ──────────────────────────────────────────────
  // If the secret is configured, verify the Svix signature so we only
  // accept events from Resend. If it's not configured yet, log a warning
  // and still process the event (so the feature works before DNS is set up).
  let payload: ResendWebhookEvent;

  const body = await req.text();

  if (secret) {
    const wh = new Webhook(secret);
    const headers = {
      'svix-id':        req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    };
    try {
      payload = wh.verify(body, headers) as ResendWebhookEvent;
    } catch (err) {
      console.error('[resend-webhook] signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET not set — skipping signature check');
    try {
      payload = JSON.parse(body) as ResendWebhookEvent;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  }

  const { type, data } = payload;

  // Only handle email.* events
  if (!type.startsWith('email.')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Normalise recipient — Resend sends `to` as an array
  const recipientEmail = (data.to?.[0] ?? '').toLowerCase().trim();
  if (!recipientEmail) {
    return NextResponse.json({ ok: true, skipped: 'no_recipient' });
  }

  // ── Derive emailType from subject line ──────────────────────────────────
  // The cron routes tag emails with Resend `tags`, but we can also derive
  // the type from the subject so historical sends are tracked correctly.
  function emailTypeFromSubject(subject?: string): string | null {
    if (!subject) return null;
    const s = subject.toLowerCase();
    if (s.includes('what happens when your tenant pays'))   return 'day1_explainer';
    if (s.includes('did you get stuck'))                    return 'day2_no_property';
    if (s.includes('one step away from collecting rent'))   return 'day7_no_stripe';
    if (s.includes('your propertyflo') && s.includes('setup is still here')) return 'day21_winback';
    if (s.includes('while you still have that lease'))      return 'lease_lead_day3';
    if (s.includes('still managing rent manually'))         return 'lease_lead_day7';
    if (s.includes('trial ends tomorrow'))                  return 'trial_reminder_day13';
    if (s.includes('trial ends in 2'))                      return 'trial_reminder_day12';
    if (s.includes('trial has ended'))                      return 'trial_reminder_day14';
    if (s.includes('verify your email'))                    return 'verification';
    if (s.includes('reset your password'))                  return 'password_reset';
    return null;
  }

  const emailType = emailTypeFromSubject(data.subject ?? undefined);
  const clickedUrl = type === 'email.clicked' ? (data.click?.link ?? null) : null;

  try {
    await prisma.emailEvent.create({
      data: {
        resendEmailId:  data.email_id,
        recipientEmail,
        emailType,
        eventType:      type,
        clickedUrl:     clickedUrl ?? undefined,
      },
    });

    console.log(`[resend-webhook] ${type} → ${recipientEmail} (${emailType ?? 'unknown'})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[resend-webhook] DB write failed:', err);
    // Return 200 so Resend doesn't retry indefinitely on a DB hiccup
    return NextResponse.json({ ok: false, error: 'DB write failed' }, { status: 200 });
  }
}
