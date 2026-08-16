/**
 * POST /api/public/lease/esign-resend
 *
 * Resends the tenant signing invite. Called from the /sign/lease/sent page.
 * Requires the token so only the landlord (who has the URL) can trigger it.
 * Resets the expiry to 14 days from now.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = `PropertyFlow HQ <${process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com'}>`;
const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const record = await (prisma as any).publicLeaseEsign.findUnique({ where: { token } });
    if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (record.status === 'completed') return NextResponse.json({ error: 'already_signed' }, { status: 409 });
    if (record.status !== 'pending_tenant_sig' && record.status !== 'pending_payment') {
      return NextResponse.json({ error: 'not_ready' }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const expiresDate = expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    await (prisma as any).publicLeaseEsign.update({
      where: { token },
      data: { expiresAt, invitesSentAt: new Date(), status: 'pending_tenant_sig' },
    });

    const signUrl = `${SITE}/sign/lease/${token}`;
    const propertyAddress = record.propertyAddress || 'the property';

    if (resend) {
      const tenants = [
        { name: record.tenantName1, email: record.tenantEmail1 },
        ...(record.tenantEmail2 ? [{ name: record.tenantName2 || 'Tenant', email: record.tenantEmail2 }] : []),
      ];

      const inviteHtml = (tenantName: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1f2328;max-width:560px;margin:40px auto;padding:0 20px">
  <p>Hi ${tenantName},</p>
  <p><strong>${record.landlordName}</strong> has sent you a reminder to sign your lease agreement for <strong>${propertyAddress}</strong>.</p>
  <p style="margin:28px 0">
    <a href="${signUrl}" style="background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block">
      Review &amp; Sign Lease →
    </a>
  </p>
  <p style="font-size:12px;color:#6b7280;">This link expires on ${expiresDate}.</p>
  <p>— PropertyFlow HQ</p>
</body>
</html>`;

      await Promise.allSettled(
        tenants.map(({ name, email }) =>
          resend!.emails.send({
            from: FROM,
            to: [email],
            subject: `Reminder: ${record.landlordName} is waiting for your signature — PropertyFlow HQ`,
            html: inviteHtml(name),
            tags: [{ name: 'email_type', value: 'public_lease_tenant_invite_resend' }],
          })
        )
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[esign-resend]', err);
    return NextResponse.json({ error: 'Failed to resend.' }, { status: 500 });
  }
}
