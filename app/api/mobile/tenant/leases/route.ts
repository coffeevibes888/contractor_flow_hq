/**
 * GET /api/mobile/tenant/leases
 *
 * Mobile tenant lease list. Returns the active + pending-signature leases
 * for the authenticated tenant, including a `signingUrl` when the lease
 * still needs a tenant signature. The signing URL points at the website's
 * existing `/sign/[token]` route which fully implements the e-sign flow
 * (PDF render, audit metadata, branded email follow-up).
 *
 * Response:
 *   { leases: TenantLeaseSummary[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const leases = await prisma.lease.findMany({
      where: {
        tenantId: payload.userId,
        status: { in: ['active', 'pending_signature', 'pending'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        rentAmount: true,
        tenantSignedAt: true,
        landlordSignedAt: true,
        legalDocumentId: true,
        unit: {
          select: {
            name: true,
            property: {
              select: { name: true, address: true, landlord: { select: { companyName: true, name: true } } },
            },
          },
        },
        legalDocument: { select: { id: true, fileUrl: true, name: true } },
      },
    });

    // For each pending-signature lease, find the open tenant SignatureRequest
    // so the mobile client can deep-link to /sign/[token] on web.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com';
    const leaseSummaries = await Promise.all(
      leases.map(async (l) => {
        const propertyName = l.unit.property?.name ?? 'Property';
        const addr = (l.unit.property?.address ?? null) as
          | { street?: string; city?: string; state?: string; zip?: string }
          | null;
        const landlordLabel =
          l.unit.property?.landlord?.companyName ??
          l.unit.property?.landlord?.name ??
          'Your landlord';

        let signingUrl: string | null = null;
        let signingToken: string | null = null;
        if (l.status === 'pending_signature' && !l.tenantSignedAt && l.legalDocumentId) {
          const sigReq = await prisma.documentSignatureRequest.findFirst({
            where: {
              leaseId: l.id,
              role: 'tenant',
              status: { in: ['sent', 'viewed'] },
            },
            select: { token: true, expiresAt: true },
            orderBy: { createdAt: 'desc' },
          });
          if (sigReq?.token && (!sigReq.expiresAt || sigReq.expiresAt > new Date())) {
            signingToken = sigReq.token;
            signingUrl = `${baseUrl}/sign/${sigReq.token}`;
          }
        }

        return {
          id: l.id,
          status: l.status,
          startDate: l.startDate?.toISOString() ?? null,
          endDate: l.endDate?.toISOString() ?? null,
          rentAmount: Number(l.rentAmount),
          tenantSigned: !!l.tenantSignedAt,
          landlordSigned: !!l.landlordSignedAt,
          propertyName,
          unitName: l.unit.name,
          city: addr?.city ?? null,
          state: addr?.state ?? null,
          landlordName: landlordLabel,
          documentName: l.legalDocument?.name ?? null,
          documentUrl: l.legalDocument?.fileUrl ?? null,
          signingUrl,
          signingToken,
        };
      }),
    );

    return NextResponse.json({ leases: leaseSummaries });
  } catch (error: any) {
    console.error('[mobile/tenant/leases]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
