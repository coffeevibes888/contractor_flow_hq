import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { renderLeaseHtml } from '@/lib/services/lease-template';
import { generateLeasePdf, stampSignatureOnPdf } from '@/lib/services/signing';
import { fetchPdfBuffer, applySignaturesToPdf, SignatureFieldPosition } from '@/lib/services/custom-pdf-signing';
import crypto from 'crypto';
import { sendBrandedEmail } from '@/lib/services/email-service';
import { NotificationService } from '@/lib/services/notification-service';
import { generateMoveInCharges } from '@/lib/services/move-in-charges.service';
import { revalidatePath } from 'next/cache';

function getClientIp(req: NextRequest) {
  const xfwd = req.headers.get('x-forwarded-for');
  if (xfwd) return xfwd.split(',')[0].trim();
  return (req as any).ip || 'unknown';
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const sig = await prisma.documentSignatureRequest.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          name: true,
          fileUrl: true,
          signatureFields: true,
          isFieldsConfigured: true,
        },
      },
      lease: {
        include: {
          legalDocument: {
            select: {
              id: true,
              name: true,
              fileUrl: true,
              signatureFields: true,
              isFieldsConfigured: true,
            },
          },
          tenant: { select: { name: true, email: true } },
          unit: {
            include: {
              property: {
                include: {
                  landlord: {
                    select: { name: true, owner: { select: { email: true, name: true } }, id: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!sig) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  if (sig.expiresAt && sig.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ message: 'Link expired' }, { status: 410 });
  }

  const lease = sig.lease;
  if (!lease) {
    return NextResponse.json({ message: 'Lease not found' }, { status: 404 });
  }

  const landlordName = lease.unit.property?.landlord?.name || lease.unit.property?.name || 'Landlord';
  const tenantName = lease.tenant?.name || 'Tenant';
  const propertyLabel = `${lease.unit.property?.name || 'Property'} - ${lease.unit.name} (${lease.unit.type})`;

  // Check if we have a custom lease document
  const legalDoc = lease.legalDocument || sig.document;
  
  // Log which document we're using for debugging
  console.log(`[Sign Session] Lease ${lease.id} - legalDocument: ${legalDoc?.name || 'none'}, fileUrl: ${legalDoc?.fileUrl ? 'yes' : 'no'}, isFieldsConfigured: ${legalDoc?.isFieldsConfigured}`);
  
  // Check if tenant already signed - we need to use the same signing method they used
  // Also fetch their signature/initials images to display in the lease
  const tenantSignatureRequestRaw = await prisma.documentSignatureRequest.findFirst({
    where: { 
      leaseId: lease.id, 
      role: 'tenant', 
      status: 'signed'
    },
  });
  
  // Cast to include new fields that may not be in cached Prisma types
  const tenantSignatureRequest = tenantSignatureRequestRaw as typeof tenantSignatureRequestRaw & {
    signatureDataUrl?: string | null;
    initialsDataUrl?: string | null;
  };
  
  // IMPORTANT: If landlord is signing and tenant already signed, 
  // ALWAYS use HTML template (LeaseSigningModal) for consistency
  // This ensures both parties see the same nice blue modal design
  const tenantAlreadySigned = sig.role === 'landlord' && tenantSignatureRequest?.signedAt;
  
  // Only use custom PDF if:
  // 1. We have a fileUrl AND
  // 2. Fields are configured (meaning it's intentionally set up as a custom PDF document) AND
  // 3. Tenant hasn't already signed (if landlord is signing, use same modal as tenant)
  // Otherwise, use the HTML template for consistency
  // If tenant already signed, landlord MUST use HTML template too
  const hasCustomPdf = !tenantAlreadySigned && legalDoc?.fileUrl && legalDoc?.isFieldsConfigured;
  const hasConfiguredFields = legalDoc?.isFieldsConfigured && legalDoc?.signatureFields;
  
  console.log(`[Sign Session] Role: ${sig.role}, tenantAlreadySigned: ${!!tenantAlreadySigned}, hasCustomPdf: ${hasCustomPdf}`);

  if (hasCustomPdf) {
    // Return info for custom PDF signing
    let fields: SignatureFieldPosition[] = [];
    
    if (hasConfiguredFields) {
      // Use configured fields
      fields = (legalDoc.signatureFields as unknown as SignatureFieldPosition[]) || [];
    } else {
      // No configured fields - add default signature fields at bottom of last page
      // These will be placed by the PDF signing component
      fields = [
        {
          id: 'default_tenant_sig',
          type: 'signature',
          role: 'tenant',
          page: 1, // Will be adjusted to last page by the signing component
          x: 100,
          y: 700, // Near bottom
          width: 200,
          height: 50,
          required: true,
        },
        {
          id: 'default_tenant_date',
          type: 'date',
          role: 'tenant',
          page: 1,
          x: 350,
          y: 700,
          width: 100,
          height: 30,
          required: true,
        },
        {
          id: 'default_landlord_sig',
          type: 'signature',
          role: 'landlord',
          page: 1,
          x: 100,
          y: 750,
          width: 200,
          height: 50,
          required: true,
        },
        {
          id: 'default_landlord_date',
          type: 'date',
          role: 'landlord',
          page: 1,
          x: 350,
          y: 750,
          width: 100,
          height: 30,
          required: true,
        },
      ];
      console.log(`[Sign Session] Using default signature fields for unconfigured PDF`);
    }
    
    const roleFields = fields.filter(f => f.role === sig.role);

    // Also generate HTML preview for custom PDFs so users can read the lease terms
    const leaseHtml = renderLeaseHtml({
      landlordName,
      tenantName,
      propertyLabel,
      leaseStartDate: new Date(lease.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      leaseEndDate: lease.endDate
        ? new Date(lease.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Month-to-Month',
      rentAmount: Number(lease.rentAmount).toLocaleString(),
      billingDayOfMonth: String(lease.billingDayOfMonth),
      todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });

    return NextResponse.json({
      leaseId: lease.id,
      role: sig.role,
      recipientName: sig.recipientName,
      recipientEmail: sig.recipientEmail,
      documentType: 'custom_pdf',
      documentName: legalDoc.name,
      documentUrl: legalDoc.fileUrl,
      signatureFields: roleFields,
      useDefaultFields: !hasConfiguredFields, // Flag to tell frontend to adjust field positions
      leaseHtml, // Include HTML preview for reading
      leaseDetails: {
        landlordName,
        tenantName,
        propertyLabel,
        startDate: lease.startDate,
        endDate: lease.endDate,
        rentAmount: Number(lease.rentAmount),
      },
    });
  }

  // Fall back to HTML template
  let leaseHtml = renderLeaseHtml({
    landlordName,
    tenantName,
    propertyLabel,
    leaseStartDate: new Date(lease.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    leaseEndDate: lease.endDate
      ? new Date(lease.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Month-to-Month',
    rentAmount: Number(lease.rentAmount).toLocaleString(),
    billingDayOfMonth: String(lease.billingDayOfMonth),
    todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  });

  // If landlord is signing and tenant has already signed, render tenant's signature/initials
  if (sig.role === 'landlord' && tenantSignatureRequest) {
    console.log(`[Sign Session] Tenant signature data - signerName: ${tenantSignatureRequest.signerName}, hasSignatureDataUrl: ${!!tenantSignatureRequest.signatureDataUrl}, hasInitialsDataUrl: ${!!tenantSignatureRequest.initialsDataUrl}`);
    
    // Tenant signature
    if (tenantSignatureRequest.signatureDataUrl) {
      const sigImgTag = `<img src="${tenantSignatureRequest.signatureDataUrl}" alt="Tenant Signature" style="height: 40px; display: inline-block; vertical-align: middle;" />`;
      leaseHtml = leaseHtml.replace('/sig_tenant/', sigImgTag);
    } else {
      const tenantSignedInfo = `<div style="padding: 8px 16px; background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; margin: 8px 0; display: inline-block;">
        <span style="color: #166534; font-size: 14px;">✓ Signed by ${tenantSignatureRequest.signerName || tenantName} on ${tenantSignatureRequest.signedAt ? new Date(tenantSignatureRequest.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
      </div>`;
      leaseHtml = leaseHtml.replace('/sig_tenant/', tenantSignedInfo);
    }
    
    // Tenant initials — all 19 placeholders (/init1/ … /init19/)
    const tenantInitImg = tenantSignatureRequest.initialsDataUrl
      ? `<img src="${tenantSignatureRequest.initialsDataUrl}" alt="Initials" style="height: 24px; display: inline-block; vertical-align: middle;" />`
      : `<span style="padding: 2px 8px; background: #dcfce7; border: 1px solid #86efac; border-radius: 4px; color: #166534; font-size: 12px;">✓</span>`;
    for (let i = 1; i <= 19; i++) {
      leaseHtml = leaseHtml.replaceAll(`/init${i}/`, tenantInitImg);
    }
    // /init_l1/ … /init_l19/ are left as-is so the modal renders them as interactive yellow stickies
  }

  return NextResponse.json({
    leaseId: lease.id,
    role: sig.role,
    recipientName: sig.recipientName,
    recipientEmail: sig.recipientEmail,
    documentType: 'html_template',
    leaseHtml,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const body = await req.json().catch(() => ({}));
  const signatureDataUrl = body.signatureDataUrl as string | undefined;
  const initialsDataUrl = body.initialsDataUrl as string | undefined;
  const signerName = (body.signerName as string | undefined)?.trim();
  const signerEmail = (body.signerEmail as string | undefined)?.trim();
  const consent = !!body.consent;
  const initialsData = body.initialsData as Array<{ id: string; value: string }> | undefined;

  if (!signatureDataUrl || !signerName || !signerEmail || !consent) {
    return NextResponse.json({ message: 'Missing signature, name, email, or consent' }, { status: 400 });
  }

  if (!signatureDataUrl.startsWith('data:image/png;base64,')) {
    return NextResponse.json({ message: 'Invalid signature format. Please try signing again.' }, { status: 400 });
  }

  const signatureSize = signatureDataUrl.length;
  if (signatureSize > 5 * 1024 * 1024) {
    return NextResponse.json({ message: 'Signature image too large. Please try a simpler signature.' }, { status: 400 });
  }

  const sig = await prisma.documentSignatureRequest.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          fileUrl: true,
          signatureFields: true,
          isFieldsConfigured: true,
        },
      },
      lease: {
        include: {
          legalDocument: {
            select: {
              id: true,
              fileUrl: true,
              signatureFields: true,
              isFieldsConfigured: true,
            },
          },
          tenant: { select: { id: true, name: true, email: true } },
          unit: {
            select: {
              id: true,
              name: true,
              type: true,
              propertyId: true,
              property: {
                select: {
                  id: true,
                  name: true,
                  landlord: { select: { id: true, name: true, ownerUserId: true, owner: { select: { email: true, name: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!sig) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  if (sig.expiresAt && sig.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ message: 'Link expired' }, { status: 410 });
  }
  if (sig.status === 'signed') {
    return NextResponse.json({ message: 'Already signed' }, { status: 400 });
  }

  const lease = sig.lease;
  if (!lease) {
    return NextResponse.json({ message: 'Lease not found' }, { status: 404 });
  }

  // Task 9.1: Enforce tenant-first signing order
  // Landlord cannot sign until tenant has signed
  if (sig.role === 'landlord') {
    const tenantSignatureRequest = await prisma.documentSignatureRequest.findFirst({
      where: { 
        leaseId: lease.id, 
        role: 'tenant', 
        status: 'signed'
      },
    });
    
    if (!tenantSignatureRequest) {
      return NextResponse.json({ 
        message: 'Tenant must sign first',
        code: 'TENANT_NOT_SIGNED'
      }, { status: 400 });
    }
  }

  const landlordName = lease.unit.property?.landlord?.name || lease.unit.property?.name || 'Landlord';
  const tenantName = lease.tenant?.name || 'Tenant';
  const propertyLabel = `${lease.unit.property?.name || 'Property'} - ${lease.unit.name} (${lease.unit.type})`;

  const signedAt = new Date();
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') || 'unknown';

  const audit = {
    token,
    role: sig.role,
    signerName,
    signerEmail,
    signedAt: signedAt.toISOString(),
    ip,
    userAgent: ua,
    leaseId: lease.id,
  };

  // Check if we have a custom lease document (only use custom PDF if fields are configured)
  const legalDoc = lease.legalDocument || sig.document;
  // Only use custom PDF if fields are explicitly configured - otherwise use HTML template
  const hasCustomPdf = legalDoc?.fileUrl && legalDoc?.isFieldsConfigured;
  const hasConfiguredFields = legalDoc?.isFieldsConfigured && legalDoc?.signatureFields;

  console.log(`[Sign POST] Lease ${lease.id} - hasCustomPdf: ${hasCustomPdf}, hasConfiguredFields: ${hasConfiguredFields}`);

  let stamped;

  if (hasCustomPdf) {
    // Use custom PDF signing
    console.log('Using custom PDF document for signing');
    try {
      const pdfBuffer = await fetchPdfBuffer(legalDoc.fileUrl!);
      
      // Use configured fields or default fields
      let fields: SignatureFieldPosition[] = [];
      if (hasConfiguredFields) {
        fields = (legalDoc.signatureFields as unknown as SignatureFieldPosition[]) || [];
      } else {
        // Default fields for unconfigured PDF - signature at bottom
        fields = [
          {
            id: 'default_tenant_sig',
            type: 'signature',
            role: 'tenant',
            page: 1,
            x: 100,
            y: 700,
            width: 200,
            height: 50,
            required: true,
          },
          {
            id: 'default_landlord_sig',
            type: 'signature',
            role: 'landlord',
            page: 1,
            x: 100,
            y: 750,
            width: 200,
            height: 50,
            required: true,
          },
        ];
      }

      stamped = await applySignaturesToPdf({
        pdfBuffer,
        fields,
        signingData: {
          signerName,
          signerEmail,
          signatureDataUrl,
          initialsDataUrl: initialsDataUrl || (initialsData?.[0]?.value),
          signedAt,
        },
        role: sig.role as 'tenant' | 'landlord',
        audit,
        landlordId: lease.unit.property?.landlord?.id,
        leaseId: lease.id,
      });
    } catch (error: any) {
      console.error('Custom PDF signing failed:', error);
      return NextResponse.json(
        { message: error?.message || 'Failed to process signature. Please try again.' },
        { status: 500 }
      );
    }
  } else {
    // Fall back to HTML template signing
    console.log('Using HTML template for signing');
    
    // For landlord signing, check if tenant has already signed and use their PDF as base
    if (sig.role === 'landlord') {
      const tenantSignatureRequest = await prisma.documentSignatureRequest.findFirst({
        where: { 
          leaseId: lease.id, 
          role: 'tenant', 
          status: 'signed',
          signedPdfUrl: { not: null }
        },
        select: { signedPdfUrl: true }
      });
      
      if (tenantSignatureRequest?.signedPdfUrl) {
        console.log('Landlord signing - Using tenant signed PDF as base');
        try {
          const pdfBuffer = await fetchPdfBuffer(tenantSignatureRequest.signedPdfUrl);
          
          stamped = await stampSignatureOnPdf({
            basePdf: pdfBuffer,
            signerName,
            signerEmail,
            role: 'landlord',
            signatureDataUrl,
            signedAt,
            audit,
            landlordId: lease.unit.property?.landlord?.id,
            leaseId: lease.id,
          });
        } catch (error: any) {
          console.error('Failed to use tenant signed PDF, falling back to HTML:', error);
          // Fall through to HTML generation below
        }
      }
    }
    
    // If we don't have a stamped result yet (tenant signing or fallback), generate from HTML
    if (!stamped) {
      let leaseHtml = renderLeaseHtml({
        landlordName,
        tenantName,
        propertyLabel,
        leaseStartDate: new Date(lease.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        leaseEndDate: lease.endDate
          ? new Date(lease.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'Month-to-Month',
        rentAmount: Number(lease.rentAmount).toLocaleString(),
        billingDayOfMonth: String(lease.billingDayOfMonth),
        todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });

      // Embed initials into the HTML
      if (initialsData && Array.isArray(initialsData)) {
        console.log('Signing - Processing initials data:', initialsData.length, 'items');
        initialsData.forEach(({ id, value }) => {
          if (value) {
            const placeholder = `/${id}/`;
            const imgTag = `<img src="${value}" alt="Initial" style="height: 24px; display: inline-block; vertical-align: middle;" />`;
            const beforeReplace = leaseHtml.includes(placeholder);
            leaseHtml = leaseHtml.replace(placeholder, imgTag);
            const afterReplace = leaseHtml.includes(placeholder);
            console.log(`Signing - Initial ${id}: placeholder found=${beforeReplace}, replaced=${beforeReplace && !afterReplace}`);
          }
        });
      } else {
        console.log('Signing - No initials data provided');
      }

      // Embed signature
      if (sig.role === 'tenant') {
        const sigImgTag = `<img src="${signatureDataUrl}" alt="Tenant Signature" style="height: 38px; display: inline-block; vertical-align: middle;" />`;
        leaseHtml = leaseHtml.replace('/sig_tenant/', sigImgTag);
      } else {
        const sigImgTag = `<img src="${signatureDataUrl}" alt="Landlord Signature" style="height: 38px; display: inline-block; vertical-align: middle;" />`;
        leaseHtml = leaseHtml.replace('/sig_landlord/', sigImgTag);
      }

      try {
        const basePdf = await generateLeasePdf(leaseHtml);
        stamped = await stampSignatureOnPdf({
          basePdf,
          signerName,
          signerEmail,
          role: sig.role as 'tenant' | 'landlord',
          signatureDataUrl,
          signedAt,
          audit,
          landlordId: lease.unit.property?.landlord?.id,
          leaseId: lease.id,
        });
      } catch (error: any) {
        console.error('HTML template signing failed:', error);
        return NextResponse.json(
          { message: error?.message || 'Failed to process signature. Please try again.' },
          { status: 500 }
        );
      }
    }
  }

  // Update database - save signature and initials data URLs
  const [updatedRequest, updatedLease] = await prisma.$transaction([
    prisma.documentSignatureRequest.update({
      where: { token },
      data: {
        status: 'signed',
        signedAt,
        signerName,
        signerEmail,
        signerIp: ip,
        signerUserAgent: ua,
        signedPdfUrl: stamped.signedPdfUrl,
        auditLogUrl: stamped.auditLogUrl,
        documentHash: stamped.documentHash,
        signatureDataUrl: signatureDataUrl, // Store the signature image
        initialsDataUrl: initialsDataUrl || (initialsData?.[0]?.value) || null, // Store initials image
      },
    }),
    prisma.lease.update({
      where: { id: lease.id },
      data: sig.role === 'tenant'
        ? { tenantSignedAt: signedAt }
        : { landlordSignedAt: signedAt, status: 'active' }, // Activate lease when landlord signs
      include: {
        unit: {
          include: {
            property: {
              include: {
                landlord: {
                  include: { owner: true },
                },
              },
            },
          },
        },
        tenant: true,
      },
    }),
  ]);

  // ✅ NEW: Emit event when tenant or landlord signs (replaces cron job)
  try {
    const { dbTriggers } = await import('@/lib/event-system');
    if (sig.role === 'tenant') {
      await dbTriggers.onLeaseUpdate(updatedLease, { tenantSignedAt: null });
    }
  } catch (error) {
    console.error('Failed to emit lease event:', error);
  }

  // Revalidate cached pages after lease status change
  revalidatePath('/user/pay');
  revalidatePath('/user/profile/lease');
  revalidatePath('/user/profile/rent-receipts');
  revalidatePath('/admin/leases');
  revalidatePath('/admin/tenants');

  // Generate move-in charges when landlord signs (lease becomes active)
  if (sig.role === 'landlord') {
    try {
      const moveInResult = await generateMoveInCharges(lease.id);
      if (moveInResult.success && moveInResult.payments.length > 0) {
        console.log(`Generated ${moveInResult.payments.length} move-in charges totaling $${moveInResult.totalAmount} for lease ${lease.id}`);
        
        // Notify tenant about move-in payments due
        if (lease.tenant?.id) {
          const landlordId = lease.unit.property?.landlord?.id;
          await NotificationService.createNotification({
            userId: lease.tenant.id,
            type: 'payment',
            title: 'Move-In Payments Due',
            message: `Your lease is now active! You have $${moveInResult.totalAmount.toLocaleString()} in move-in payments due.`,
            actionUrl: '/user/pay',
            metadata: { leaseId: lease.id, totalAmount: moveInResult.totalAmount },
            landlordId: landlordId || undefined,
          });
        }
      } else if (!moveInResult.success) {
        console.error('Failed to generate move-in charges:', moveInResult.error);
      }
    } catch (moveInError) {
      console.error('Error generating move-in charges:', moveInError);
      // Don't fail the signing if move-in charge generation fails
    }
  }

  // If tenant just signed, create landlord signature request and notification
  if (sig.role === 'tenant' && !lease.landlordSignedAt) {
    const existingLandlordRequest = await prisma.documentSignatureRequest.findFirst({
      where: { leaseId: lease.id, role: 'landlord', status: { not: 'signed' } },
    });

    const landlordEmail = lease.unit.property?.landlord?.owner?.email;
    const landlordNameForEmail = lease.unit.property?.landlord?.name || 'Landlord';
    const landlordId = lease.unit.property?.landlord?.id;
    const landlordUserId = lease.unit.property?.landlord?.ownerUserId;
    let landlordToken: string | null = null;

    if (!existingLandlordRequest) {
      if (landlordEmail && landlordId) {
        landlordToken = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await prisma.documentSignatureRequest.create({
          data: {
            documentId: legalDoc?.id || lease.id,
            leaseId: lease.id,
            recipientEmail: landlordEmail,
            recipientName: landlordNameForEmail,
            status: 'sent',
            expiresAt,
            token: landlordToken,
            role: 'landlord',
          },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const actionUrl = `${baseUrl}/sign/${landlordToken}`;

        try {
          await sendBrandedEmail({
            to: landlordEmail,
            subject: 'Lease ready for your signature',
            template: 'notification',
            data: {
              landlord: lease.unit.property?.landlord,
              recipientName: landlordNameForEmail,
              notificationType: 'lease_signing',
              title: 'Lease ready for your signature',
              message: `${tenantName} has signed the lease for ${propertyLabel}. Please sign to complete.`,
              actionUrl,
              loginUrl: actionUrl,
            },
            landlordId,
          } as any);
        } catch (err) {
          console.error('Failed to email landlord signing link', err);
        }
      }
    } else {
      landlordToken = existingLandlordRequest.token;
    }

    // Create in-app notification with direct signing link
    if (landlordUserId && landlordId && landlordToken) {
      try {
        await NotificationService.createNotification({
          userId: landlordUserId,
          type: 'reminder',
          title: 'Lease Signed by Tenant',
          message: `${tenantName} has signed their lease. Click to sign and complete the agreement.`,
          actionUrl: `/sign/${landlordToken}`,
          metadata: { leaseId: lease.id, propertyId: lease.unit.propertyId },
          landlordId,
        });
      } catch (err) {
        console.error('Failed to create landlord notification', err);
      }
    }
  }

  // Task 9.3: Send executed lease email to both parties when landlord signs (lease fully executed)
  if (sig.role === 'landlord') {
    const landlordId = lease.unit.property?.landlord?.id;
    const landlordEmail = lease.unit.property?.landlord?.owner?.email;
    const tenantEmail = lease.tenant?.email;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const leaseViewUrl = `${baseUrl}/user/profile/lease`;
    
    if (landlordId) {
      // Send to tenant
      if (tenantEmail) {
        try {
          await sendBrandedEmail({
            to: tenantEmail,
            subject: 'Your lease has been fully executed',
            template: 'notification',
            data: {
              landlord: lease.unit.property?.landlord,
              recipientName: tenantName,
              notificationType: 'lease_executed',
              title: 'Lease Fully Executed',
              message: `Great news! Your lease for ${propertyLabel} has been fully signed by both parties. Your lease is now active. You can view and download your signed lease at any time.`,
              actionUrl: leaseViewUrl,
              loginUrl: leaseViewUrl,
              attachmentUrl: stamped.signedPdfUrl, // Include link to signed PDF
            },
            landlordId,
          } as any);
        } catch (err) {
          console.error('Failed to email tenant executed lease', err);
        }
      }
      
      // Send to landlord
      if (landlordEmail) {
        try {
          await sendBrandedEmail({
            to: landlordEmail,
            subject: 'Lease fully executed',
            template: 'notification',
            data: {
              landlord: lease.unit.property?.landlord,
              recipientName: landlordName,
              notificationType: 'lease_executed',
              title: 'Lease Fully Executed',
              message: `The lease for ${propertyLabel} with ${tenantName} has been fully executed. The lease is now active.`,
              actionUrl: `${baseUrl}/admin/leases`,
              loginUrl: `${baseUrl}/admin/leases`,
              attachmentUrl: stamped.signedPdfUrl,
            },
            landlordId,
          } as any);
        } catch (err) {
          console.error('Failed to email landlord executed lease', err);
        }
      }
    }
  }

  return NextResponse.json({
    signedPdfUrl: stamped.signedPdfUrl,
    auditLogUrl: stamped.auditLogUrl,
    documentHash: stamped.documentHash,
  });
}
