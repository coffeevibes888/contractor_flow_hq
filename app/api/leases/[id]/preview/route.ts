import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { renderLeaseHtml } from '@/lib/services/lease-template';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { id: leaseId } = await params;

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 403 });
    }

    const lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        unit: {
          property: {
            landlordId: landlordResult.landlord.id,
          },
        },
      },
      include: {
        tenant: { select: { name: true, email: true } },
        unit: {
          include: {
            property: {
              include: {
                landlord: { select: { name: true } },
              },
            },
          },
        },
        signatureRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ message: 'Lease not found or access denied' }, { status: 404 });
    }

    const property = lease.unit.property;
    const address = property.address as any;

    let html = renderLeaseHtml({
      propertyLabel: address
        ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`
        : property.name,
      landlordName: property.landlord?.name || 'Landlord',
      tenantName: lease.tenant?.name || 'Tenant',
      rentAmount: String(Number(lease.rentAmount)),
      leaseStartDate: lease.startDate.toISOString().split('T')[0],
      leaseEndDate: lease.endDate?.toISOString().split('T')[0] || 'Month-to-Month',
      billingDayOfMonth: String(lease.billingDayOfMonth || 1),
      todayDate: new Date().toISOString().split('T')[0],
    });

    // Get signature requests - cast to include new fields
    const signatureRequests = lease.signatureRequests as Array<typeof lease.signatureRequests[0] & {
      signatureDataUrl?: string | null;
      initialsDataUrl?: string | null;
    }>;
    const tenantSigRequest = signatureRequests?.find(sr => sr.role === 'tenant' && sr.status === 'signed');
    const landlordSigRequest = signatureRequests?.find(sr => sr.role === 'landlord' && sr.status === 'signed');

    // Replace placeholders with actual signature images or fallback indicators
    if (tenantSigRequest) {
      const tenantSignedDate = tenantSigRequest.signedAt 
        ? new Date(tenantSigRequest.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'N/A';
      
      // Replace tenant signature placeholder - use actual image if available
      if (tenantSigRequest.signatureDataUrl) {
        const sigImgTag = `<img src="${tenantSigRequest.signatureDataUrl}" alt="Tenant Signature" style="height: 40px; display: inline-block; vertical-align: middle;" />`;
        html = html.replace('/sig_tenant/', sigImgTag);
      } else {
        const tenantSigHtml = `<div style="display: inline-block; padding: 8px 16px; background: #dcfce7; border: 1px solid #86efac; border-radius: 8px;">
          <span style="color: #166534; font-size: 14px; font-weight: 500;">✓ Signed by ${tenantSigRequest.signerName || lease.tenant?.name || 'Tenant'}</span>
          <span style="color: #166534; font-size: 12px; display: block;">${tenantSignedDate}</span>
        </div>`;
        html = html.replace('/sig_tenant/', tenantSigHtml);
      }
      
      // Replace tenant initials placeholders - use actual image if available
      for (let i = 1; i <= 6; i++) {
        const initPlaceholder = `/init${i}/`;
        if (html.includes(initPlaceholder)) {
          if (tenantSigRequest.initialsDataUrl) {
            const initImgTag = `<img src="${tenantSigRequest.initialsDataUrl}" alt="Initials" style="height: 24px; display: inline-block; vertical-align: middle;" />`;
            html = html.replace(initPlaceholder, initImgTag);
          } else {
            const initialHtml = `<span style="display: inline-block; padding: 2px 8px; background: #dcfce7; border: 1px solid #86efac; border-radius: 4px; color: #166534; font-size: 12px; font-weight: 500;">✓ Initialed</span>`;
            html = html.replace(initPlaceholder, initialHtml);
          }
        }
      }
    }

    if (landlordSigRequest) {
      const landlordSignedDate = landlordSigRequest.signedAt 
        ? new Date(landlordSigRequest.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'N/A';
      
      // Replace landlord signature placeholder - use actual image if available
      if (landlordSigRequest.signatureDataUrl) {
        const sigImgTag = `<img src="${landlordSigRequest.signatureDataUrl}" alt="Landlord Signature" style="height: 40px; display: inline-block; vertical-align: middle;" />`;
        html = html.replace('/sig_landlord/', sigImgTag);
      } else {
        const landlordSigHtml = `<div style="display: inline-block; padding: 8px 16px; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px;">
          <span style="color: #1e40af; font-size: 14px; font-weight: 500;">✓ Signed by ${landlordSigRequest.signerName || property.landlord?.name || 'Landlord'}</span>
          <span style="color: #1e40af; font-size: 12px; display: block;">${landlordSignedDate}</span>
        </div>`;
        html = html.replace('/sig_landlord/', landlordSigHtml);
      }
    }

    // Check if there's a signed PDF available
    const signedRequest = lease.signatureRequests?.find(sr => sr.status === 'signed' && sr.signedPdfUrl);
    // Use proxy URL for PDF access (handles both authenticated and public URLs)
    const signedPdfUrl = signedRequest?.signedPdfUrl ? `/api/leases/${leaseId}/pdf` : null;

    return NextResponse.json({ 
      html,
      signedPdfUrl,
      leaseStatus: lease.status,
      tenantSigned: !!lease.tenantSignedAt,
      landlordSigned: !!lease.landlordSignedAt,
    });
  } catch (error) {
    console.error('Error generating lease preview:', error);
    return NextResponse.json({ message: 'Failed to generate lease preview' }, { status: 500 });
  }
}
