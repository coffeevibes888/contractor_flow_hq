/**
 * POST /api/super-admin/send-lifecycle-email
 *
 * Lets the super-admin manually fire a single lifecycle email to a specific
 * landlord from the Signups CRM — no need to wait for the daily cron.
 *
 * Body: { landlordId: string; emailType: 'day1_explainer' | 'day2_no_property' | 'day7_no_stripe' | 'day21_winback' }
 *
 * Bypasses the `trialRemindersSent` deduplication guard so you can resend
 * as needed. Updates the guard after a successful send.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { Resend } from 'resend';
import { prisma } from '@/db/prisma';
import {
  day1Html, day2Html, day7Html, day21Html,
} from '@/lib/email-templates/lifecycle';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = `Gregory at PropertyFlow HQ <${process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com'}>`;

type LifecycleType = 'day1_explainer' | 'day2_no_property' | 'day7_no_stripe' | 'day21_winback';

const SUBJECTS: Record<LifecycleType, string> = {
  day1_explainer:    "Here's what happens when your tenant pays rent through PropertyFlow",
  day2_no_property:  "Did you get stuck? Adding your property takes 2 minutes",
  day7_no_stripe:    "You're one step away from collecting rent online",
  day21_winback:     "Your PropertyFlow setup is still here",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'superAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { landlordId: string; emailType: LifecycleType };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { landlordId, emailType } = body;
  if (!landlordId || !emailType || !SUBJECTS[emailType]) {
    return NextResponse.json({ error: 'Missing or invalid landlordId / emailType' }, { status: 400 });
  }

  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: {
      id: true,
      name: true,
      trialRemindersSent: true,
      _count: { select: { properties: true } },
      owner: { select: { email: true, name: true } },
    },
  });

  if (!landlord) {
    return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
  }

  const email = landlord.owner?.email;
  if (!email) {
    return NextResponse.json({ error: 'No email address on this account' }, { status: 400 });
  }

  const firstName = (landlord.owner?.name || landlord.name || 'there').split(' ')[0];
  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

  const htmlMap: Record<LifecycleType, string> = {
    day1_explainer:   day1Html(firstName, APP_URL),
    day2_no_property: day2Html(firstName, APP_URL),
    day7_no_stripe:   day7Html(firstName, APP_URL),
    day21_winback:    day21Html(firstName, landlord._count.properties, APP_URL),
  };

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      [email],
    subject: SUBJECTS[emailType],
    html:    htmlMap[emailType],
    tags:    [{ name: 'email_type', value: emailType }],
  });

  if (error) {
    console.error('[send-lifecycle-email] Resend error:', error);
    return NextResponse.json(
      { error: (error as any).message ?? 'Resend refused the send' },
      { status: 502 },
    );
  }

  // Mark as sent in the deduplication guard
  const existing = (landlord.trialRemindersSent as Record<string, boolean> | null) ?? {};
  await prisma.landlord.update({
    where: { id: landlordId },
    data:  { trialRemindersSent: { ...existing, [emailType]: true } },
  });

  return NextResponse.json({ ok: true, sentTo: email, emailType });
}
