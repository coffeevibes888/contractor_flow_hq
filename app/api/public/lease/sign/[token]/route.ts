/**
 * GET  /api/public/lease/sign/[token]  — fetch lease data for the sign page
 * PATCH /api/public/lease/sign/[token]  — submit tenant signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { renderLeaseHtml } from '@/lib/services/lease-template';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = `PropertyFlow HQ <${process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com'}>`;
const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFinalLeaseHtml(
  leaseHtml: string,
  landlordName: string,
  landlordSigDataUrl: string,
  tenantName: string,
  tenantSigDataUrl: string,
  tenantInitialsDataUrl?: string | null,
): string {
  const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const landlordSigBlock = `<div style="display:inline-block;margin-top:8px;">
    <img src="${landlordSigDataUrl}" alt="Landlord Signature" style="height:48px;display:block;" />
    <p style="margin:4px 0 0;font-size:11px;color:#374151;">${landlordName} — ${now}</p>
  </div>`;

  const tenantSigBlock = `<div style="display:inline-block;margin-top:8px;">
    <img src="${tenantSigDataUrl}" alt="Tenant Signature" style="height:48px;display:block;" />
    <p style="margin:4px 0 0;font-size:11px;color:#374151;">${tenantName} — ${now}</p>
  </div>`;

  const tenantInitialImg = tenantInitialsDataUrl
    ? `<img src="${tenantInitialsDataUrl}" alt="Initials" style="height:24px;display:inline-block;vertical-align:middle;" />`
    : `<span style="padding:2px 8px;background:#dcfce7;border:1px solid #86efac;border-radius:4px;color:#166534;font-size:12px;">✓</span>`;

  let html = leaseHtml;
  // Replace placeholder tokens used in the public builder output
  html = html.replace(/\[LANDLORD_SIGNATURE\]/gi, landlordSigBlock);
  html = html.replace(/\[TENANT_SIGNATURE\]/gi, tenantSigBlock);
  // Slash-style tokens from renderLeaseHtml (the signing template)
  html = html.replace(/\/sig_landlord\//gi, landlordSigBlock);
  html = html.replace(/\/sig_tenant\//gi, tenantSigBlock);
  // Tenant initials placeholders /init1/ … /init19/
  for (let i = 1; i <= 19; i++) {
    html = html.replaceAll(`/init${i}/`, tenantInitialImg);
  }
  // Any remaining landlord initials placeholders (should already be filled, clean up just in case)
  for (let i = 1; i <= 19; i++) {
    html = html.replaceAll(`/init_l${i}/`, '');
  }

  // Prepend a "fully executed" banner regardless of whether placeholders existed
  const signedBanner = `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-family:sans-serif;">
  <p style="margin:0;font-size:13px;font-weight:700;color:#166534;">✓ Fully Executed Lease Agreement</p>
  <p style="margin:4px 0 0;font-size:12px;color:#15803d;">Signed by all parties on ${now}</p>
</div>`;

  return signedBanner + html;
}

function signedLeaseEmailHtml(
  recipientName: string,
  viewUrl: string,
  landlordName: string,
  tenantName: string,
  signedDate: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1f2328;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;max-width:560px;">
      <tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:0.1em;text-transform:uppercase;">PropertyFlow HQ</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;">✓ Your lease is fully signed</h1>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="margin:0 0 16px;">Hi ${recipientName},</p>
        <p style="margin:0 0 16px;color:#374151;">
          Your lease agreement has been signed by all parties and is now fully executed.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin-bottom:20px;">
          <tr><td style="font-size:13px;color:#166534;">
            <p style="margin:0 0 6px;"><strong>Landlord:</strong> ${landlordName}</p>
            <p style="margin:0 0 6px;"><strong>Tenant:</strong> ${tenantName}</p>
            <p style="margin:0;"><strong>Signed:</strong> ${signedDate}</p>
          </td></tr>
        </table>
        <p style="margin:0 0 24px;color:#374151;">
          View and print your signed lease any time using the button below. Keep this email as your record.
        </p>
        <p style="text-align:center;margin:0 0 28px;">
          <a href="${viewUrl}" style="display:inline-block;background:#10b981;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:12px;">
            View Signed Lease →
          </a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="margin:0;font-size:13px;color:#6b7280;">
          Powered by <a href="${SITE}" style="color:#10b981;text-decoration:none;">PropertyFlow HQ</a> —
          all-in-one property management for independent landlords.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── GET — fetch lease data ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const record = await (prisma as any).publicLeaseEsign.findUnique({
      where: { token },
      select: {
        leaseHtml: true,
        finalLeaseHtml: true,
        landlordName: true,
        landlordSigDataUrl: true,
        tenantName1: true,
        tenantEmail1: true,
        tenantName2: true,
        tenantEmail2: true,
        status: true,
        expiresAt: true,
        paidAt: true,
        tenantSignedAt: true,
        tenantSignedByName: true,
        propertyAddress: true,
        state: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Generate a signing-template HTML with /init1/…/init19/ and /sig_tenant/ placeholders
    // so the tenant modal can step through each field one at a time.
    const signingHtml = renderLeaseHtml({
      landlordName: record.landlordName,
      tenantName: record.tenantName1,
      propertyLabel: record.propertyAddress ?? record.landlordName,
      leaseStartDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      leaseEndDate: 'Month-to-Month',
      rentAmount: '0',
      billingDayOfMonth: '1',
      todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });

    // Stamp the landlord's already-applied signature/initials into the signingHtml
    // so the tenant sees them while stepping through their own fields.
    let tenantSigningHtml = signingHtml;
    if (record.landlordSigDataUrl) {
      const landlordSigImg = `<img src="${record.landlordSigDataUrl}" alt="Landlord Signature" style="height:40px;display:inline-block;vertical-align:middle;" />`;
      tenantSigningHtml = tenantSigningHtml.replace('/sig_landlord/', landlordSigImg);
      // Replace landlord initials with a green ✓ so they appear filled-in
      const landlordInitImg = `<span style="padding:2px 8px;background:#dcfce7;border:1px solid #86efac;border-radius:4px;color:#166534;font-size:12px;">✓</span>`;
      for (let i = 1; i <= 19; i++) {
        tenantSigningHtml = tenantSigningHtml.replaceAll(`/init_l${i}/`, landlordInitImg);
      }
    }

    return NextResponse.json({
      ...record,
      signingHtml: tenantSigningHtml,
      expired: !!(record.expiresAt && new Date(record.expiresAt) < new Date()),
    });
  } catch (err) {
    console.error('[lease sign GET]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// ─── PATCH — submit tenant signature ─────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { tenantSigDataUrl, signerName, initialsDataUrl } = body;

    if (!tenantSigDataUrl || !signerName) {
      return NextResponse.json({ error: 'Signature and name are required.' }, { status: 400 });
    }

    const record = await (prisma as any).publicLeaseEsign.findUnique({ where: { token } });

    if (!record) return NextResponse.json({ error: 'Signing link not found.' }, { status: 404 });
    if (record.status === 'completed') return NextResponse.json({ error: 'This lease has already been signed.' }, { status: 409 });
    if (record.status !== 'pending_tenant_sig') return NextResponse.json({ error: 'This lease is not ready for tenant signing.' }, { status: 400 });
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This signing link has expired. Please ask the landlord to resend it.' }, { status: 410 });
    }

    // Rebuild signingHtml (same as GET) so all /initN/ and /sig_*/ placeholders
    // are present — record.leaseHtml is the display HTML with no placeholders.
    const signingHtmlBase = renderLeaseHtml({
      landlordName: record.landlordName,
      tenantName: signerName,
      propertyLabel: record.propertyAddress ?? record.landlordName,
      leaseStartDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      leaseEndDate: 'Month-to-Month',
      rentAmount: '0',
      billingDayOfMonth: '1',
      todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });

    const finalLeaseHtml = buildFinalLeaseHtml(
      signingHtmlBase,
      record.landlordName,
      record.landlordSigDataUrl,
      signerName,
      tenantSigDataUrl,
      initialsDataUrl ?? null,
    );

    const now = new Date();
    await (prisma as any).publicLeaseEsign.update({
      where: { token },
      data: {
        tenantSigDataUrl,
        tenantSignedAt: now,
        tenantSignedByName: signerName,
        finalLeaseHtml,
        status: 'completed',
      },
    });

    const viewUrl = `${SITE}/sign/lease/${token}?view=final`;
    const signedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (resend) {
      const recipients = [
        { email: record.landlordEmail, name: record.landlordName },
        { email: record.tenantEmail1, name: record.tenantName1 },
        ...(record.tenantEmail2 ? [{ email: record.tenantEmail2, name: record.tenantName2 || 'Tenant 2' }] : []),
      ];

      await Promise.allSettled(
        recipients.map(({ email, name }) =>
          resend!.emails.send({
            from: FROM,
            to: [email],
            subject: '✓ Your lease is fully signed — PropertyFlow HQ',
            html: signedLeaseEmailHtml(name, viewUrl, record.landlordName, signerName, signedDate),
            tags: [{ name: 'email_type', value: 'public_lease_signed_copy' }],
          })
        )
      );
    }

    return NextResponse.json({ success: true, viewUrl });
  } catch (err) {
    console.error('[lease sign PATCH]', err);
    return NextResponse.json({ error: 'Failed to save signature.' }, { status: 500 });
  }
}
