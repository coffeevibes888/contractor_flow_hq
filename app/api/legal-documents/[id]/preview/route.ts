import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { renderLeaseHtml } from '@/lib/services/lease-template';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    const doc = await prisma.legalDocument.findFirst({
      where: {
        id,
        landlordId: landlord.id,
        isActive: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    if (doc.type !== 'lease') {
      return NextResponse.json({ message: 'Preview not available for this document type' }, { status: 400 });
    }

    // Try to find a lease that uses this legal document to get actual data
    // First try by legalDocumentId
    let lease = await prisma.lease.findFirst({
      where: {
        legalDocumentId: id,
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
          orderBy: { signedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If not found by legalDocumentId, try to find by matching document name pattern
    // Document names are often like "Lease - Property Name - Unit Name" or similar
    if (!lease && doc.name) {
      
      // Try to find any lease for this landlord's properties
      lease = await prisma.lease.findFirst({
        where: {
          unit: {
            property: {
              landlordId: landlord.id,
            },
          },
          // Match leases where the document description contains the lease info
          OR: [
            { legalDocumentId: id },
            {
              legalDocument: {
                name: doc.name,
              },
            },
          ],
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
            orderBy: { signedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Also check if this document ID matches a signature request's documentId
    if (!lease) {
      const sigRequest = await prisma.documentSignatureRequest.findFirst({
        where: {
          documentId: id,
        },
        include: {
          lease: {
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
                orderBy: { signedAt: 'desc' },
              },
            },
          },
        },
      });
      
      if (sigRequest?.lease) {
        lease = sigRequest.lease;
      }
    }

    let html: string;
    let signedPdfUrl: string | null = null;
    let signatures: Array<{ name: string; role: string; signedAt: Date | null }> = [];

    if (lease) {
      // Use actual lease data
      const property = lease.unit.property;
      const address = property?.address as any;
      const propertyLabel = address
        ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`
        : `${property?.name || 'Property'} - ${lease.unit.name}`;

      html = renderLeaseHtml({
        landlordName: property?.landlord?.name || landlord.name || 'Landlord',
        tenantName: lease.tenant?.name || 'Tenant',
        propertyLabel,
        leaseStartDate: new Date(lease.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        leaseEndDate: lease.endDate
          ? new Date(lease.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'Month-to-Month',
        rentAmount: Number(lease.rentAmount).toLocaleString(),
        billingDayOfMonth: String(lease.billingDayOfMonth || 1),
        todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });

      // Get signature info - include signature data URLs
      // Cast to any to access new fields that may not be in cached Prisma types
      const signatureRequests = lease.signatureRequests as Array<typeof lease.signatureRequests[0] & { signatureDataUrl?: string | null; initialsDataUrl?: string | null }>;
      const tenantSig = signatureRequests?.find(sr => sr.role === 'tenant' && sr.status === 'signed');
      const landlordSig = signatureRequests?.find(sr => sr.role === 'landlord' && sr.status === 'signed');

      if (tenantSig) {
        signatures.push({
          name: tenantSig.signerName || lease.tenant?.name || 'Tenant',
          role: 'Tenant',
          signedAt: tenantSig.signedAt,
        });

        // Replace tenant signature with actual signature image if available
        if (tenantSig.signedAt && tenantSig.signatureDataUrl) {
          const sigImgTag = `<img src="${tenantSig.signatureDataUrl}" alt="Tenant Signature" style="height: 40px; display: inline-block; vertical-align: middle;" />`;
          html = html.replace('/sig_tenant/', sigImgTag);
        } else if (tenantSig.signedAt) {
          // Fallback to signed indicator if no signature image
          const tenantSignedDate = new Date(tenantSig.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          const tenantSigHtml = `<div style="display: inline-block; padding: 8px 16px; background: #dcfce7; border: 1px solid #86efac; border-radius: 8px;">
            <span style="color: #166534; font-size: 14px; font-weight: 500;">✓ Signed by ${tenantSig.signerName || lease.tenant?.name || 'Tenant'}</span>
            <span style="color: #166534; font-size: 12px; display: block;">${tenantSignedDate}</span>
          </div>`;
          html = html.replace('/sig_tenant/', tenantSigHtml);
        }

        // Replace initials with actual initials image if available
        if (tenantSig.initialsDataUrl) {
          for (let i = 1; i <= 6; i++) {
            const initPlaceholder = `/init${i}/`;
            if (html.includes(initPlaceholder)) {
              const initImgTag = `<img src="${tenantSig.initialsDataUrl}" alt="Initials" style="height: 24px; display: inline-block; vertical-align: middle;" />`;
              html = html.replace(initPlaceholder, initImgTag);
            }
          }
        } else if (tenantSig.signedAt) {
          // Fallback to checkmark if no initials image
          for (let i = 1; i <= 6; i++) {
            const initPlaceholder = `/init${i}/`;
            if (html.includes(initPlaceholder)) {
              const initialHtml = `<span style="display: inline-block; padding: 2px 8px; background: #dcfce7; border: 1px solid #86efac; border-radius: 4px; color: #166534; font-size: 12px; font-weight: 500;">✓</span>`;
              html = html.replace(initPlaceholder, initialHtml);
            }
          }
        }
      }

      if (landlordSig) {
        signatures.push({
          name: landlordSig.signerName || property?.landlord?.name || 'Landlord',
          role: 'Landlord',
          signedAt: landlordSig.signedAt,
        });

        // Replace landlord signature with actual signature image if available
        if (landlordSig.signedAt && landlordSig.signatureDataUrl) {
          const sigImgTag = `<img src="${landlordSig.signatureDataUrl}" alt="Landlord Signature" style="height: 40px; display: inline-block; vertical-align: middle;" />`;
          html = html.replace('/sig_landlord/', sigImgTag);
        } else if (landlordSig.signedAt) {
          // Fallback to signed indicator if no signature image
          const landlordSignedDate = new Date(landlordSig.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          const landlordSigHtml = `<div style="display: inline-block; padding: 8px 16px; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px;">
            <span style="color: #1e40af; font-size: 14px; font-weight: 500;">✓ Signed by ${landlordSig.signerName || property?.landlord?.name || 'Landlord'}</span>
            <span style="color: #1e40af; font-size: 12px; display: block;">${landlordSignedDate}</span>
          </div>`;
          html = html.replace('/sig_landlord/', landlordSigHtml);
        }
      }

      // Get signed PDF URL (prefer landlord's as it has both signatures)
      const signedRequest = landlordSig?.signedPdfUrl ? landlordSig : tenantSig;
      signedPdfUrl = signedRequest?.signedPdfUrl || null;
    } else {
      // No lease found, use generic template
      html = renderLeaseHtml({
        landlordName: landlord.name || 'Landlord',
        tenantName: '[Tenant Name]',
        propertyLabel: '[Property / Unit]',
        leaseStartDate: '[Start Date]',
        leaseEndDate: '[End Date]',
        rentAmount: '[Rent Amount]',
        billingDayOfMonth: '[Day]',
        todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });
    }

    // Return JSON with HTML and signed PDF URL
    return NextResponse.json({
      html,
      signedPdfUrl,
      signatures,
      hasLease: !!lease,
      leaseStatus: lease?.status || null,
    });
  } catch (error) {
    console.error('Failed to preview legal document:', error);
    return NextResponse.json({ message: 'Failed to preview document' }, { status: 500 });
  }
}
