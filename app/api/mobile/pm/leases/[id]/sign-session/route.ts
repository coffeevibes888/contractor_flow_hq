/**
 * POST /api/mobile/pm/leases/:id/sign-session
 *
 * Mint or reuse a `DocumentSignatureRequest` for a given role on a lease,
 * returning the token that mobile uses to GET/POST `/api/sign/[token]`.
 *
 * The PM authentication on this route lets the PM both (a) request their
 * own landlord-side signing session and (b) request a tenant-side session
 * during an in-person showing — which is the whole point of the in-the-field
 * "hand the phone to the tenant" flow. The tenant's actual signature is
 * still bound to a token (no session bypass), and audit metadata captured
 * by the subsequent POST /api/sign/[token] still encodes who/when/how.
 *
 * Body: { role: 'tenant' | 'landlord' }
 * Returns: { token, url, leaseHtml?, role, recipientName, recipientEmail, expiresAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';
import { renderLeaseHtml } from '@/lib/services/lease-template';

const SESSION_EXPIRY_HOURS = 24;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = req.headers.get('authorization');
    const mobileToken = authHeader?.replace('Bearer ', '');
    if (!mobileToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(mobileToken);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: leaseId } = await params;
    const body = (await req.json().catch(() => ({}))) as { role?: 'tenant' | 'landlord' };
    const role = body.role;
    if (role !== 'tenant' && role !== 'landlord') {
      return NextResponse.json({ error: 'role must be tenant or landlord' }, { status: 400 });
    }

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        legalDocument: {
          select: { id: true, name: true, fileUrl: true, signatureFields: true, isFieldsConfigured: true },
        },
        unit: {
          select: {
            name: true,
            type: true,
            property: {
              select: {
                name: true,
                landlordId: true,
                landlord: { select: { id: true, name: true, ownerUserId: true, owner: { select: { email: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

    // Ownership check: the PM must own the landlord that owns this property.
    if (lease.unit.property?.landlord?.ownerUserId !== payload.userId) {
      return NextResponse.json({ error: 'Not your lease' }, { status: 403 });
    }

    const landlordName = lease.unit.property?.landlord?.name || lease.unit.property?.name || 'Landlord';
    const tenantName = lease.tenant?.name || 'Tenant';
    const propertyLabel = `${lease.unit.property?.name || 'Property'} - ${lease.unit.name} (${lease.unit.type})`;

    const recipientEmail =
      role === 'tenant'
        ? lease.tenant?.email || ''
        : lease.unit.property?.landlord?.owner?.email || '';
    const recipientName = role === 'tenant' ? tenantName : landlordName;

    // Reuse an active session if one already exists.
    const existing = await prisma.documentSignatureRequest.findFirst({
      where: {
        leaseId,
        role,
        status: 'sent',
        signedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

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

    if (existing?.token) {
      return NextResponse.json({
        token: existing.token,
        url: `/sign/${existing.token}`,
        expiresAt: existing.expiresAt,
        role,
        recipientName: existing.recipientName,
        recipientEmail: existing.recipientEmail,
        leaseHtml,
        reused: true,
      });
    }

    // No existing session — create one. We need a documentId for FK safety;
    // reuse the lease's assigned legal document, or upsert a placeholder
    // (mirroring how `/api/leases/[id]/sign-session` handles it).
    let documentId = lease.legalDocumentId ?? null;
    if (!documentId) {
      await prisma.legalDocument.upsert({
        where: { id: lease.id },
        update: {},
        create: {
          id: lease.id,
          landlordId: lease.unit.property!.landlordId!,
          name: `${lease.unit.property?.name || 'Property'} - ${lease.unit.name} Lease`,
          type: 'lease',
          description: 'Auto-generated lease document for signing',
        },
      });
      documentId = lease.id;
    }

    const newToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    const created = await prisma.documentSignatureRequest.create({
      data: {
        documentId,
        leaseId,
        recipientEmail,
        recipientName,
        status: 'sent',
        expiresAt,
        token: newToken,
        role,
        documentHash: null,
      },
    });

    return NextResponse.json({
      token: created.token,
      url: `/sign/${created.token}`,
      expiresAt: created.expiresAt,
      role,
      recipientName: created.recipientName,
      recipientEmail: created.recipientEmail,
      leaseHtml,
      reused: false,
    });
  } catch (e: any) {
    console.error('[mobile/pm/leases/:id/sign-session]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
