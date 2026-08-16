import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { onContractSigned } from '@/lib/services/contractor-automation';
import { generateContractPdf, stampSignatureOnContractPdf } from '@/lib/services/contractor-contract-signing';

type Params = { params: { token: string } };

// ── GET — load contract for public signing page ───────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const db = prisma as any;
    const contract = await db.contractorContract.findUnique({
      where: { token: params.token },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        type: true,
        body: true,
        status: true,
        customerName: true,
        customerEmail: true,
        contractorName: true,
        contractorEmail: true,
        contractorPhone: true,
        contractAmount: true,
        depositAmount: true,
        paymentTerms: true,
        expiresAt: true,
        signedAt: true,
        customerSignedAt: true,
        declinedAt: true,
        notes: true,
        customerSignatureDataUrl: true,
        customerSignedPdfUrl: true,
      },
    });

    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (contract.expiresAt && contract.expiresAt < new Date()) {
      if (!['signed', 'executed', 'void', 'expired', 'customer_signed'].includes(contract.status)) {
        await db.contractorContract.update({
          where: { token: params.token },
          data: { status: 'expired' },
        });
        await db.contractorContractEvent.create({
          data: { contractId: contract.id, eventType: 'expired', actor: 'system' },
        });
      }
      return NextResponse.json({ error: 'This signing link has expired', code: 'EXPIRED' }, { status: 410 });
    }

    // Mark as viewed if sent
    if (contract.status === 'sent') {
      await db.contractorContract.update({
        where: { token: params.token },
        data: { status: 'viewed', viewedAt: new Date() },
      });
      await db.contractorContractEvent.create({
        data: { contractId: contract.id, eventType: 'viewed', actor: 'customer' },
      });
    }

    // Already signed — show done state
    const isAlreadySigned = ['signed', 'customer_signed', 'executed'].includes(contract.status);

    return NextResponse.json({
      contract: {
        ...contract,
        signedAt: contract.customerSignedAt || contract.signedAt,
        status: isAlreadySigned ? 'signed' : contract.status,
      },
    });
  } catch (error) {
    console.error('GET /api/sign/contractor/[token]', error);
    return NextResponse.json({ error: 'Failed to load contract' }, { status: 500 });
  }
}

// ── POST — submit customer signature ──────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const db = prisma as any;
    const contract = await db.contractorContract.findUnique({
      where: { token: params.token },
    });

    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (contract.expiresAt && contract.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Signing link has expired', code: 'EXPIRED' }, { status: 410 });
    }

    if (['signed', 'customer_signed', 'executed', 'void', 'expired', 'declined'].includes(contract.status)) {
      return NextResponse.json({ error: 'This contract has already been signed or is no longer available' }, { status: 400 });
    }

    const body = await req.json();
    const { action, signatureDataUrl, signerName, declineReason } = body as {
      action: 'sign' | 'decline';
      signatureDataUrl?: string;
      signerName?: string;
      declineReason?: string;
    };

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const ua = req.headers.get('user-agent') || '';

    // ── DECLINE ─────────────────────────────────────────────────────────────
    if (action === 'decline') {
      await db.contractorContract.update({
        where: { token: params.token },
        data: { status: 'declined', declinedAt: new Date(), declineReason: declineReason || null },
      });
      await db.contractorContractEvent.create({
        data: {
          contractId: contract.id,
          eventType: 'declined',
          actor: 'customer',
          actorName: contract.customerName,
          actorIp: ip,
          note: declineReason || null,
        },
      });

      // Notify contractor of decline
      try {
        const profile = await prisma.contractorProfile.findUnique({
          where: { id: contract.contractorId },
          select: { userId: true },
        });
        if (profile?.userId) {
          await db.notification.create({
            data: {
              userId: profile.userId,
              type: 'alert',
              title: 'Contract Declined',
              message: `${contract.customerName} declined "${contract.title}"${declineReason ? `: ${declineReason}` : ''}`,
              actionUrl: `/contractor-dashboard/contracts/${contract.id}`,
            },
          });
        }
      } catch (_) {}

      return NextResponse.json({ success: true, status: 'declined' });
    }

    // ── SIGN ────────────────────────────────────────────────────────────────
    if (action === 'sign') {
      if (!signatureDataUrl) {
        return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
      }

      const now = new Date();

      // 1. Generate signed PDF with customer signature
      let customerSignedPdfUrl = '';
      let documentHash = '';
      try {
        const pdfBuffer = await generateContractPdf(contract.body);
        const auditData = {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          eventType: 'customer_signed',
          actor: 'customer',
          actorName: signerName || contract.customerName,
          actorEmail: contract.customerEmail,
          ipAddress: ip,
          userAgent: ua,
          signedAt: now.toISOString(),
          documentHash: '',
        };
        const result = await stampSignatureOnContractPdf({
          basePdf: pdfBuffer,
          signerName: signerName || contract.customerName,
          signerEmail: contract.customerEmail,
          role: 'customer',
          signatureDataUrl,
          signedAt: now,
          audit: auditData,
          contractId: contract.id,
        });
        customerSignedPdfUrl = result.signedPdfUrl;
        documentHash = result.documentHash;
      } catch (pdfErr) {
        console.error('PDF generation failed (non-blocking):', pdfErr);
      }

      // 2. Update contract: customer signed, create contractor countersign token
      const contractorToken = require('crypto').randomBytes(32).toString('hex');
      const contractorTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.contractorContract.update({
        where: { token: params.token },
        data: {
          status: 'customer_signed',
          customerSignedAt: now,
          signedAt: now,
          customerSignatureDataUrl: signatureDataUrl,
          customerSignedIp: ip,
          customerSignedUserAgent: ua,
          customerSignedName: signerName || contract.customerName,
          customerSignedPdfUrl,
          documentHash,
          contractorToken,
          contractorTokenExpiresAt,
        },
      });

      await db.contractorContractEvent.create({
        data: {
          contractId: contract.id,
          eventType: 'signed',
          actor: 'customer',
          actorName: signerName || contract.customerName,
          actorIp: ip,
          note: `Signed by ${signerName || contract.customerName} — awaiting contractor countersignature`,
        },
      });

      // 3. Notify contractor to countersign
      try {
        const profile = await prisma.contractorProfile.findUnique({
          where: { id: contract.contractorId },
          select: { userId: true, businessName: true, user: { select: { email: true } } },
        });
        if (profile?.userId) {
          // In-app notification
          await db.notification.create({
            data: {
              userId: profile.userId,
              type: 'contract_signed',
              title: 'Contract Signed — Ready for Countersignature',
              message: `${signerName || contract.customerName} signed "${contract.title}" (${contract.contractNumber}). Please review and countersign.`,
              actionUrl: `/contractor-dashboard/contracts/${contract.id}`,
            },
          });

          // Email notification
          try {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            const senderEmail = process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';

            await resend.emails.send({
              from: `PropertyFlowHQ <${senderEmail}>`,
              to: profile.user?.email || contract.contractorEmail,
              subject: `Contract Signed — Ready for Your Signature: ${contract.title}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #0891b2, #2563eb); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px;">Contract Ready for Countersignature</h1>
                  </div>
                  <div style="padding: 32px; background: #ffffff;">
                    <p style="font-size: 16px; color: #374151;">Hi ${profile.businessName || 'there'},</p>
                    <p style="color: #6b7280;">
                      <strong>${signerName || contract.customerName}</strong> has signed the contract "<strong>${contract.title}</strong>" (${contract.contractNumber}).
                    </p>
                    <p style="color: #6b7280;">Please review and add your countersignature to execute the contract.</p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/contractor-dashboard/contracts/${contract.id}"
                         style="display: inline-block; background: linear-gradient(135deg, #0891b2, #2563eb); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                        Review & Countersign
                      </a>
                    </div>
                    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                      This contract expires in 7 days. Please countersign before the deadline.
                    </p>
                  </div>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error('Email notification failed (non-blocking):', emailErr);
          }
        }
      } catch (notifErr) {
        console.error('Notification failed (non-blocking):', notifErr);
      }

      // 4. Run post-signing automation
      try {
        await onContractSigned(contract.id);
      } catch (automationError) {
        console.error('Post-signing automation error (non-blocking):', automationError);
      }

      return NextResponse.json({
        success: true,
        status: 'customer_signed',
        signedAt: now,
        message: 'Contract signed. The contractor will be notified to countersign.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/sign/contractor/[token]', error);
    return NextResponse.json({ error: 'Failed to process signature' }, { status: 500 });
  }
}
