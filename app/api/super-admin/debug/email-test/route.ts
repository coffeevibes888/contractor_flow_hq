/**
 * GET /api/super-admin/debug/email-test?to=you@example.com
 *
 * Sends a small test email via the same Resend client + sender used by the
 * rest of the app and returns the raw success/error payload from Resend.
 * Use this when an email "didn't send" silently — the real reason will be
 * in `error` here even when the calling code logged success.
 *
 * Locked to superAdmin role to keep it out of unauthenticated hands.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'superAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const to = url.searchParams.get('to');
  if (!to) {
    return NextResponse.json({ error: 'Missing ?to= query param' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;

  // Surface env-var presence without leaking the key
  const envSnapshot = {
    RESEND_API_KEY_present: Boolean(apiKey),
    RESEND_API_KEY_prefix: apiKey ? apiKey.slice(0, 6) + '…' : null,
    SENDER_EMAIL: senderEmail || '(unset — falling back to onboarding@resend.dev)',
  };

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, env: envSnapshot, error: 'RESEND_API_KEY is not set on this deployment' },
      { status: 500 },
    );
  }

  const resend = new Resend(apiKey);
  const from = `Property Flow HQ <${senderEmail || 'onboarding@resend.dev'}>`;

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject: 'PropertyFlowHQ email delivery test',
      html: `<p>If you got this, Resend + sender + DNS are all working.</p>
             <p>Sent from: ${from}</p>
             <p>Time: ${new Date().toISOString()}</p>`,
    });

    return NextResponse.json({
      ok: !result.error,
      env: envSnapshot,
      from,
      to,
      data: result.data,
      error: result.error
        ? {
            name: (result.error as any).name,
            message: (result.error as any).message,
            statusCode: (result.error as any).statusCode,
            // Resend often includes a `name` like "validation_error" plus a
            // message describing the exact problem (unverified domain,
            // invalid recipient, rate-limited, etc.)
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        env: envSnapshot,
        from,
        to,
        thrown: { name: err?.name, message: err?.message, stack: err?.stack },
      },
      { status: 500 },
    );
  }
}
