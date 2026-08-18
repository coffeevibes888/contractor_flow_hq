/**
 * POST /api/public/contract/esign-checkout
 *
 * Creates a signing record for the free contract builder e-sign flow.
 * Mirrors the PM-side /api/public/lease/esign-checkout but for contractor contracts.
 *
 * Flow:
 * 1. Contractor signs on the success screen (signature captured as dataUrl)
 * 2. This endpoint creates a PublicContractEsign record
 * 3. Sends an email invite to the customer with a signing link
 * 4. Returns a redirect URL to the confirmation page
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { SERVER_URL } from '@/lib/constants';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contractHtml,
      contractorName,
      contractorEmail,
      contractorSigDataUrl,
      customerName,
      customerEmail,
      jobTitle,
      totalAmount,
      governingState,
    } = body;

    if (!contractHtml || !contractorName || !contractorEmail || !contractorSigDataUrl || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const baseUrl = (() => { try { return new URL(SERVER_URL).origin; } catch { return SERVER_URL; } })();

    // Generate a unique token for the customer signing link
    const token = randomBytes(32).toString('hex');

    // Embed the contractor's signature into the HTML
    const signedHtml = contractHtml.replace(
      /\/sig_contractor\//g,
      `<img src="${contractorSigDataUrl}" alt="Contractor Signature" style="height:40px;max-width:200px;display:inline-block;vertical-align:middle;" />`
    );

    // Create the e-sign record
    const db = prisma as any;
    const record = await db.publicContractEsign.create({
      data: {
        token,
        contractHtml: signedHtml,
        originalHtml: contractHtml,
        contractorName,
        contractorEmail,
        contractorSigDataUrl,
        customerName,
        customerEmail,
        jobTitle: jobTitle || null,
        totalAmount: totalAmount ? Number(totalAmount) : null,
        governingState: governingState || null,
        status: 'pending_customer_sig',
      },
    });

    // Send email invite to customer
    try {
      const signingUrl = `${baseUrl}/sign/contract/${token}`;
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const senderEmail = process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';

      await resend.emails.send({
        from: `${contractorName} via PropertyFlow HQ <${senderEmail}>`,
        to: customerEmail,
        replyTo: contractorEmail,
        subject: `Contract ready to sign: ${jobTitle || 'Service Agreement'}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 22px;">Contract Ready for Signing</h1>
              <p style="color: #94a3b8; margin-top: 8px; font-size: 14px;">${jobTitle || 'Service Agreement'}</p>
            </div>
            <div style="padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1e293b;">Hi ${customerName.split(' ')[0]},</p>
              <p style="color: #475569; line-height: 1.6;">
                <strong>${contractorName}</strong> has signed a service agreement and is requesting your signature to finalize the contract.
              </p>
              ${totalAmount ? `<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 16px; margin: 16px 0;"><p style="margin: 0; color: #0369a1; font-weight: 600;">Contract Amount: $${Number(totalAmount).toLocaleString()}</p></div>` : ''}
              <div style="text-align: center; margin: 28px 0;">
                <a href="${signingUrl}" style="display: inline-block; background: linear-gradient(135deg, #f43f5e, #f97316); color: white; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; text-decoration: none;">
                  Review & Sign Contract
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                This link expires in 14 days. Questions? Reply directly to ${contractorName}.
              </p>
            </div>
            <p style="text-align: center; margin-top: 16px; font-size: 11px; color: #94a3b8;">
              Powered by <a href="https://www.propertyflowhq.com" style="color: #f97316;">PropertyFlow HQ</a>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('[contract-esign-checkout] Email send failed:', emailErr);
      // Don't fail the request — record is created, just email failed
    }

    return NextResponse.json({
      success: true,
      redirectUrl: `${baseUrl}/sign/contract/sent?token=${token}`,
    });
  } catch (err) {
    console.error('[contract-esign-checkout]', err);
    return NextResponse.json({ error: 'Failed to create signing session.' }, { status: 500 });
  }
}
