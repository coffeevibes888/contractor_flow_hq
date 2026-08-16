/**
 * POST /api/mobile/pm/showing-receipts
 *
 * Records a cash receipt collected on the spot during a showing for cases
 * where there's no lease yet (application fee, holding deposit, pet deposit
 * pre-move-in, etc.). For lease-bound rent payments, use
 * /api/mobile/pm/rent-payments/cash instead.
 *
 * The receipt is stored as a Document row (category='receipt') under the
 * landlord's account, with the captured fingertip-signature data URL plus a
 * device/audit bundle persisted in `notes` as JSON. We email the receipt to
 * the tenant if `tenantEmail` is provided so they have proof of payment.
 *
 * Body: {
 *   propertyId, unitId?, tenantName, tenantEmail?, tenantPhone?,
 *   amount, category, note?,
 *   signatureDataUrl, audit: { signedAt, deviceModel, osVersion, appVersion, appBuild }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { sendBrandedEmail } from '@/lib/services/email-service';

const CATEGORIES = new Set([
  'application_fee',
  'holding_deposit',
  'pet_deposit',
  'security_deposit',
  'first_month_rent',
  'other',
]);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true, name: true, companyName: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as {
      propertyId?: string;
      unitId?: string;
      tenantName?: string;
      tenantEmail?: string;
      tenantPhone?: string;
      amount?: number;
      category?: string;
      note?: string;
      signatureDataUrl?: string;
      audit?: {
        signedAt?: string;
        deviceModel?: string;
        osVersion?: string;
        appVersion?: string;
        appBuild?: string;
        fingerprint?: string;
      };
    };

    if (!body.propertyId) return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    if (!body.tenantName?.trim()) return NextResponse.json({ error: 'tenantName is required' }, { status: 400 });
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 });
    }
    if (!body.category || !CATEGORIES.has(body.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${[...CATEGORIES].join(', ')}` },
        { status: 400 },
      );
    }
    if (!body.signatureDataUrl?.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'signatureDataUrl must be a base64 PNG' }, { status: 400 });
    }

    // Confirm property belongs to this landlord.
    const property = await prisma.property.findFirst({
      where: { id: body.propertyId, landlordId: landlord.id, status: { not: 'deleted' } },
      select: { id: true, name: true },
    });
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    // Upload the captured signature so the receipt PDF/email has something to link to.
    let signatureUrl: string | null = null;
    try {
      const buffer = Buffer.from(
        body.signatureDataUrl.replace(/^data:image\/png;base64,/, ''),
        'base64',
      );
      const uploaded = await uploadToCloudinary(buffer, {
        folder: 'showing-receipts/signatures',
        resource_type: 'image',
        public_id: `signature-${Date.now()}`,
      });
      signatureUrl = uploaded.secure_url ?? uploaded.url ?? null;
    } catch (err) {
      console.error('[showing-receipts] signature upload failed', err);
    }

    const categoryLabel = body.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
    const receiptName = `Receipt ${receiptNumber} · ${categoryLabel}`;

    const receiptHtml = renderReceiptHtml({
      receiptNumber,
      landlordName: landlord.companyName || landlord.name || 'Landlord',
      tenantName: body.tenantName.trim(),
      tenantEmail: body.tenantEmail ?? null,
      propertyName: property.name,
      amount: body.amount,
      category: categoryLabel,
      note: body.note ?? null,
      signatureUrl,
      signedAt: body.audit?.signedAt ?? new Date().toISOString(),
      audit: body.audit ?? {},
    });

    // Render the receipt HTML to a PDF — best effort. Falls back to HTML
    // upload if the PDF service is unavailable in this env.
    let pdfUrl: string | null = null;
    try {
      const { htmlToPdfBuffer } = await import('@/lib/services/pdf');
      const pdfBuffer = await htmlToPdfBuffer(receiptHtml);
      const uploaded = await uploadToCloudinary(pdfBuffer, {
        folder: 'showing-receipts',
        resource_type: 'raw',
        public_id: `${receiptNumber}.pdf`,
        format: 'pdf',
      });
      pdfUrl = uploaded.secure_url ?? uploaded.url ?? null;
    } catch (err) {
      console.error('[showing-receipts] pdf gen failed; storing HTML', err);
      try {
        const uploaded = await uploadToCloudinary(Buffer.from(receiptHtml, 'utf8'), {
          folder: 'showing-receipts',
          resource_type: 'raw',
          public_id: `${receiptNumber}.html`,
          format: 'html',
        });
        pdfUrl = uploaded.secure_url ?? uploaded.url ?? null;
      } catch {}
    }

    if (!pdfUrl) {
      return NextResponse.json({ error: 'Failed to store receipt' }, { status: 500 });
    }

    const auditPayload = {
      receiptNumber,
      tenantName: body.tenantName.trim(),
      tenantEmail: body.tenantEmail ?? null,
      tenantPhone: body.tenantPhone ?? null,
      propertyId: property.id,
      unitId: body.unitId ?? null,
      amount: body.amount,
      category: body.category,
      note: body.note ?? null,
      signatureUrl,
      collectedBy: payload.userId,
      audit: body.audit ?? {},
      signedAt: body.audit?.signedAt ?? new Date().toISOString(),
    };

    const document = await prisma.document.create({
      data: {
        landlordId: landlord.id,
        name: receiptName,
        category: 'receipt',
        fileUrl: pdfUrl,
        mimeType: 'application/pdf',
        relatedToType: 'property',
        relatedToId: property.id,
        notes: JSON.stringify(auditPayload),
        uploadedById: payload.userId,
      },
    });

    // Best-effort email to the tenant.
    if (body.tenantEmail) {
      try {
        await sendBrandedEmail({
          to: body.tenantEmail,
          subject: `Receipt: ${categoryLabel} — ${property.name}`,
          template: 'notification',
          data: {
            landlord,
            recipientName: body.tenantName.trim(),
            notificationType: 'receipt',
            title: `Receipt ${receiptNumber}`,
            message: `Thanks ${body.tenantName.trim()} — we've received your ${categoryLabel.toLowerCase()} of $${body.amount.toFixed(2)} for ${property.name}. Your signed receipt is attached.`,
            actionUrl: pdfUrl,
            loginUrl: pdfUrl,
          },
          landlordId: landlord.id,
        } as any);
      } catch (err) {
        console.error('[showing-receipts] email failed', err);
      }
    }

    return NextResponse.json({
      success: true,
      receipt: {
        id: document.id,
        receiptNumber,
        url: pdfUrl,
        category: body.category,
        amount: body.amount,
      },
    });
  } catch (e: any) {
    console.error('[showing-receipts]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

function renderReceiptHtml(input: {
  receiptNumber: string;
  landlordName: string;
  tenantName: string;
  tenantEmail: string | null;
  propertyName: string;
  amount: number;
  category: string;
  note: string | null;
  signatureUrl: string | null;
  signedAt: string;
  audit: Record<string, unknown>;
}): string {
  const formattedDate = new Date(input.signedAt).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const auditRows = Object.entries(input.audit)
    .filter(([, v]) => v != null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="color:#64748b;font-size:11px;padding:2px 8px 2px 0;">${escapeHtml(k)}</td><td style="font-size:11px;">${escapeHtml(String(v))}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
  <html><head><meta charset="utf-8"><title>Receipt ${input.receiptNumber}</title></head>
  <body style="font-family:-apple-system,system-ui,Roboto,sans-serif;color:#0f172a;padding:32px;max-width:680px;margin:0 auto;">
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:24px;">
      <div>
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:1.6px;color:#2563eb;">RECEIPT</p>
        <h1 style="margin:4px 0 0 0;font-size:24px;">${escapeHtml(input.receiptNumber)}</h1>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;color:#64748b;">${escapeHtml(input.landlordName)}</p>
        <p style="margin:0;font-size:11px;color:#64748b;">${formattedDate}</p>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;color:#64748b;font-size:13px;">Received from</td>
        <td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(input.tenantName)}${input.tenantEmail ? ` &lt;${escapeHtml(input.tenantEmail)}&gt;` : ''}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b;font-size:13px;">Property</td>
        <td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(input.propertyName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b;font-size:13px;">For</td>
        <td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(input.category)}</td>
      </tr>
      ${input.note ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Note</td><td style="padding:8px 0;text-align:right;">${escapeHtml(input.note)}</td></tr>` : ''}
      <tr>
        <td style="padding:14px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">Amount</td>
        <td style="padding:14px 0;border-top:1px solid #e2e8f0;font-size:22px;font-weight:800;color:#2563eb;text-align:right;">$${input.amount.toFixed(2)}</td>
      </tr>
    </table>

    <div style="margin-top:32px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;">
      <p style="margin:0 0 8px 0;font-size:11px;font-weight:800;letter-spacing:1.2px;color:#64748b;">SIGNATURE</p>
      ${input.signatureUrl ? `<img alt="Signature" src="${escapeHtml(input.signatureUrl)}" style="max-height:80px;display:block;" />` : '<p style="margin:0;font-size:13px;">(unable to render signature image)</p>'}
      <p style="margin:8px 0 0 0;font-size:11px;color:#64748b;">Signed by ${escapeHtml(input.tenantName)} on ${formattedDate}</p>
    </div>

    <div style="margin-top:24px;padding:12px;background:#f8fafc;border-radius:10px;">
      <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;letter-spacing:1.2px;color:#64748b;">E-SIGN AUDIT</p>
      <table style="width:100%;border-collapse:collapse;">${auditRows}</table>
    </div>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
