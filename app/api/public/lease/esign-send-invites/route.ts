/**
 * POST /api/public/lease/esign-send-invites
 *
 * Internal helper called by the Stripe webhook after payment is confirmed.
 * Sends the signing invitation to all tenant email addresses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = `PropertyFlow HQ <${process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com'}>`;
const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

function tenantInviteEmailHtml(
  tenantName: string,
  landlordName: string,
  propertyAddress: string,
  signUrl: string,
  expiresDate: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1f2328;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;max-width:560px;">
      <tr><td style="background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:28px 32px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:0.1em;text-transform:uppercase;">PropertyFlow HQ</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;">You have a lease to sign</h1>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="margin:0 0 16px;">Hi ${tenantName},</p>
        <p style="margin:0 0 16px;color:#374151;">
          <strong>${landlordName}</strong> has sent you a lease agreement for the following property and is asking for your e-signature:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:20px;">
          <tr><td style="font-size:13px;color:#0c4a6e;">
            <p style="margin:0 0 4px;font-weight:700;">Property</p>
            <p style="margin:0;color:#374151;">${propertyAddress}</p>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;color:#374151;">
          Click the button below to review and sign the lease. The link is secure and works on any device.
        </p>
        <p style="margin:0 0 24px;font-size:12px;color:#6b7280;">
          This link expires on ${expiresDate}.
        </p>
        <p style="text-align:center;margin:0 0 28px;">
          <a href="${signUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:12px;">
            Review &amp; Sign Lease →
          </a>
        </p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
          <p style="margin:0;font-size:12px;color:#92400e;">
            <strong>Important:</strong> Please review the full lease before signing. By signing you agree to be legally bound by its terms. If you have questions, contact your landlord directly.
          </p>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="margin:0;font-size:13px;color:#6b7280;">
          Powered by <a href="${SITE}" style="color:#0ea5e9;text-decoration:none;">PropertyFlow HQ</a> —
          all-in-one property management for independent landlords.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // Only callable internally or with the CRON_SECRET as a bearer token
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { publicLeaseEsignId } = await req.json();
  if (!publicLeaseEsignId) {
    return NextResponse.json({ error: 'publicLeaseEsignId required' }, { status: 400 });
  }

  const record = await (prisma as any).publicLeaseEsign.findUnique({
    where: { id: publicLeaseEsignId },
  });

  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status === 'completed') return NextResponse.json({ ok: true, skipped: 'already_completed' });

  // Calculate expiry (14 days from now)
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const expiresDate = expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const signUrl = `${SITE}/sign/lease/${record.token}`;
  const propertyAddress = record.propertyAddress || 'the property';

  // Update status + expiry
  await (prisma as any).publicLeaseEsign.update({
    where: { id: publicLeaseEsignId },
    data: {
      status: 'pending_tenant_sig',
      expiresAt,
      invitesSentAt: new Date(),
    },
  });

  // Send invites to all tenant emails
  if (resend) {
    const tenants = [
      { name: record.tenantName1, email: record.tenantEmail1 },
      ...(record.tenantEmail2 ? [{ name: record.tenantName2 || 'Tenant', email: record.tenantEmail2 }] : []),
    ];

    await Promise.allSettled(
      tenants.map(({ name, email }) =>
        resend!.emails.send({
          from: FROM,
          to: [email],
          subject: `${record.landlordName} sent you a lease to sign — PropertyFlow HQ`,
          html: tenantInviteEmailHtml(name, record.landlordName, propertyAddress, signUrl, expiresDate),
          tags: [{ name: 'email_type', value: 'public_lease_tenant_invite' }],
        })
      )
    );
  }

  return NextResponse.json({ ok: true, invitesSent: true });
}
