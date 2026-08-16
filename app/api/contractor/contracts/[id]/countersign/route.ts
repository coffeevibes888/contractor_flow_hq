import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';
import { stampSignatureOnContractPdf } from '@/lib/services/contractor-contract-signing';

type Params = { params: { id: string } };

// ── GET — load contract for contractor countersign ────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const db = prisma as any;
    const contract = await db.contractorContract.findFirst({
      where: { id: params.id, contractorId: contractorAuth.contractorId },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        body: true,
        status: true,
        customerName: true,
        customerEmail: true,
        customerSignatureDataUrl: true,
        customerSignedPdfUrl: true,
        customerSignedAt: true,
        customerSignedName: true,
        contractAmount: true,
        depositAmount: true,
        contractorSignedAt: true,
      },
    });

    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (contract.status !== 'customer_signed') {
      return NextResponse.json({ error: 'Contract is not awaiting countersignature' }, { status: 400 });
    }

    return NextResponse.json({ contract });
  } catch (error) {
    console.error('GET /api/contractor/contracts/[id]/countersign', error);
    return NextResponse.json({ error: 'Failed to load contract' }, { status: 500 });
  }
}

// ── POST — contractor countersign ─────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const db = prisma as any;
    const contract = await db.contractorContract.findFirst({
      where: { id: params.id, contractorId: contractorAuth.contractorId },
    });

    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (contract.status !== 'customer_signed') {
      return NextResponse.json({ error: 'Contract is not awaiting countersignature' }, { status: 400 });
    }

    const body = await req.json();
    const { signatureDataUrl, signerName } = body as {
      signatureDataUrl?: string;
      signerName?: string;
    };

    if (!signatureDataUrl) {
      return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const ua = req.headers.get('user-agent') || '';

    const now = new Date();

    // 1. Stamp contractor signature on top of customer's signed PDF
    let executedPdfUrl = '';
    let documentHash = '';
    try {
      const basePdfUrl = contract.customerSignedPdfUrl || contract.signedPdfUrl;
      if (basePdfUrl) {
        // Fetch the customer's signed PDF from Cloudinary
        const pdfResponse = await fetch(basePdfUrl);
        const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

        const auditData = {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          eventType: 'contractor_countersigned',
          actor: 'contractor',
          actorName: signerName || session.user.name || 'Contractor',
          actorEmail: session.user.email || contract.contractorEmail,
          ipAddress: ip,
          userAgent: ua,
          signedAt: now.toISOString(),
          customerSignedAt: contract.customerSignedAt?.toISOString() || contract.signedAt?.toISOString(),
        };

        const result = await stampSignatureOnContractPdf({
          basePdf: pdfBuffer,
          signerName: signerName || session.user.name || 'Contractor',
          signerEmail: session.user.email || contract.contractorEmail || '',
          role: 'contractor',
          signatureDataUrl,
          signedAt: now,
          audit: auditData,
          contractId: contract.id,
        });
        executedPdfUrl = result.signedPdfUrl;
        documentHash = result.documentHash;
      }
    } catch (pdfErr) {
      console.error('PDF generation failed (non-blocking):', pdfErr);
    }

    // 2. Update contract: executed
    await db.contractorContract.update({
      where: { id: params.id },
      data: {
        status: 'executed',
        contractorSignedAt: now,
        contractorSignatureDataUrl: signatureDataUrl,
        contractorSignedIp: ip,
        contractorSignedUserAgent: ua,
        executedPdfUrl,
        documentHash,
      },
    });

    // 3. Audit events
    await db.contractorContractEvent.create({
      data: {
        contractId: contract.id,
        eventType: 'countersigned',
        actor: 'contractor',
        actorName: signerName || session.user.name || 'Contractor',
        actorIp: ip,
        note: `Countersigned by ${signerName || session.user.name || 'Contractor'} — contract executed`,
      },
    });

    await db.contractorContractEvent.create({
      data: {
        contractId: contract.id,
        eventType: 'executed',
        actor: 'system',
        note: 'Contract fully executed by both parties',
      },
    });

    // 4. Notify both parties via email
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const senderEmail = process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';

      const contractorName = contract.contractorName || session.user.name || 'Contractor';
      const customerEmail = contract.customerEmail;
      const contractorEmail = session.user.email || contract.contractorEmail;

      // Email to customer
      if (customerEmail) {
        await resend.emails.send({
          from: `PropertyFlowHQ <${senderEmail}>`,
          to: customerEmail,
          subject: `Contract Fully Executed: ${contract.title}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Contract Fully Executed</h1>
              </div>
              <div style="padding: 32px; background: #ffffff;">
                <p style="font-size: 16px; color: #374151;">Hi ${contract.customerName},</p>
                <p style="color: #6b7280;">
                  Your contract "<strong>${contract.title}</strong>" (${contract.contractNumber}) has been signed by both parties and is now fully executed.
                </p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="margin: 0; color: #166534;"><strong>Contractor:</strong> ${contractorName}</p>
                  <p style="margin: 4px 0 0; color: #166534;"><strong>Amount:</strong> $${Number(contract.contractAmount || 0).toLocaleString()}</p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">A copy of the fully executed contract is available in your dashboard.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/contractor-dashboard/contracts/${contract.id}"
                     style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                    View Executed Contract
                  </a>
                </div>
              </div>
            </div>
          `,
        });
      }

      // Email to contractor
      if (contractorEmail && contractorEmail !== customerEmail) {
        await resend.emails.send({
          from: `PropertyFlowHQ <${senderEmail}>`,
          to: contractorEmail,
          subject: `Contract Fully Executed: ${contract.title}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Contract Fully Executed</h1>
              </div>
              <div style="padding: 32px; background: #ffffff;">
                <p style="font-size: 16px; color: #374151;">Hi ${contractorName},</p>
                <p style="color: #6b7280;">
                  Your contract "<strong>${contract.title}</strong>" (${contract.contractNumber}) has been signed by both parties and is now fully executed.
                </p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="margin: 0; color: #166534;"><strong>Customer:</strong> ${contract.customerName}</p>
                  <p style="margin: 4px 0 0; color: #166534;"><strong>Amount:</strong> $${Number(contract.contractAmount || 0).toLocaleString()}</p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">A copy of the fully executed contract is available in your dashboard.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/contractor-dashboard/contracts/${contract.id}"
                     style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                    View Executed Contract
                  </a>
                </div>
              </div>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error('Email notification failed (non-blocking):', emailErr);
    }

    // 5. In-app notification to customer (if they have an account)
    try {
      const customerUser = await db.user.findFirst({
        where: { email: contract.customerEmail },
        select: { id: true },
      });
      if (customerUser) {
        await db.notification.create({
          data: {
            userId: customerUser.id,
            type: 'contract_signed',
            title: 'Contract Fully Executed',
            message: `Your contract "${contract.title}" (${contract.contractNumber}) has been signed by both parties.`,
            actionUrl: `/contractor-dashboard/contracts/${contract.id}`,
          },
        });
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      status: 'executed',
      executedAt: now,
      message: 'Contract is now fully executed by both parties.',
    });
  } catch (error) {
    console.error('POST /api/contractor/contracts/[id]/countersign', error);
    return NextResponse.json({ error: 'Failed to process countersignature' }, { status: 500 });
  }
}
