/**
 * GET   /api/mobile/pm/leases/:id/signing
 * POST  /api/mobile/pm/leases/:id/signing  body: { resend?: true }
 *
 * GET returns the active tenant + landlord SignatureRequest tokens for a
 * lease so the PM can copy/share the tenant's signing link or sign on
 * their own device. POST { resend: true } refreshes the tenant token's
 * expiry and re-sends the lease invite email — same payload the website's
 * approveApplication uses originally.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';
import crypto from 'crypto';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com';

async function pmCtx(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: payload.userId },
    select: { id: true, companyName: true, name: true, ownerUserId: true },
  });
  return landlord ? { landlordId: landlord.id, landlord, userId: payload.userId } : null;
}

async function loadLease(id: string, landlordId: string) {
  return prisma.lease.findFirst({
    where: { id, unit: { property: { landlordId } } },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      legalDocument: { select: { id: true, name: true, fileUrl: true } },
      unit: {
        select: {
          name: true,
          property: { select: { name: true, slug: true } },
        },
      },
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await pmCtx(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;

    const lease = await loadLease(id, auth.landlordId);
    if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

    const requests = lease.legalDocumentId
      ? await prisma.documentSignatureRequest.findMany({
          where: { leaseId: lease.id },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const tenantReq = requests.find((r) => r.role === 'tenant');
    const landlordReq = requests.find((r) => r.role === 'landlord');

    return NextResponse.json({
      lease: {
        id: lease.id,
        status: lease.status,
        startDate: lease.startDate?.toISOString() ?? null,
        endDate: lease.endDate?.toISOString() ?? null,
        rentAmount: Number(lease.rentAmount),
        tenantSigned: !!lease.tenantSignedAt,
        landlordSigned: !!lease.landlordSignedAt,
        documentUrl: lease.legalDocument?.fileUrl ?? null,
        documentName: lease.legalDocument?.name ?? null,
        propertyName: lease.unit.property?.name ?? 'Property',
        unitName: lease.unit.name,
        tenantName: lease.tenant?.name ?? 'Tenant',
        tenantEmail: lease.tenant?.email ?? '',
      },
      tenantSigning: tenantReq
        ? {
            token: tenantReq.token,
            url: `${baseUrl}/sign/${tenantReq.token}`,
            status: tenantReq.status,
            expiresAt: tenantReq.expiresAt?.toISOString() ?? null,
          }
        : null,
      landlordSigning: landlordReq
        ? {
            token: landlordReq.token,
            url: `${baseUrl}/sign/${landlordReq.token}`,
            status: landlordReq.status,
            expiresAt: landlordReq.expiresAt?.toISOString() ?? null,
          }
        : null,
    });
  } catch (e: any) {
    console.error('[mobile/pm/leases/:id/signing GET]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await pmCtx(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as {
      resend?: boolean;
      role?: 'tenant' | 'landlord';
    };
    const role = body.role ?? 'tenant';

    const lease = await loadLease(id, auth.landlordId);
    if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    if (!lease.legalDocumentId) {
      return NextResponse.json(
        { error: 'No lease document yet — approve the application to generate one.' },
        { status: 400 },
      );
    }

    if (body.resend) {
      // Refresh the tenant's token expiry (keeping the same token so any
      // copy-pasted link the tenant already has stays valid) and resend
      // the branded email.
      const existing = await prisma.documentSignatureRequest.findFirst({
        where: { leaseId: lease.id, role },
        orderBy: { createdAt: 'desc' },
      });

      let token = existing?.token;
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (existing) {
        await prisma.documentSignatureRequest.update({
          where: { id: existing.id },
          data: { expiresAt: newExpiry, status: 'sent' },
        });
      } else {
        token = crypto.randomBytes(24).toString('hex');
        await prisma.documentSignatureRequest.create({
          data: {
            documentId: lease.legalDocumentId,
            leaseId: lease.id,
            recipientEmail: role === 'tenant' ? lease.tenant?.email ?? '' : auth.landlord.companyName ?? '',
            recipientName:
              role === 'tenant'
                ? lease.tenant?.name ?? 'Tenant'
                : auth.landlord.companyName ?? auth.landlord.name ?? 'Landlord',
            status: 'sent',
            expiresAt: newExpiry,
            token,
            role,
          },
        });
      }

      // Send the branded email — same template the website uses on approval.
      try {
        const { sendBrandedEmail } = await import('@/lib/services/email-service');
        const { prisma: db } = await import('@/db/prisma');
        const landlordRow = await db.landlord.findUnique({
          where: { id: auth.landlordId },
        });
        const recipientEmail = role === 'tenant' ? lease.tenant?.email : null;
        const recipientName = role === 'tenant' ? lease.tenant?.name : null;
        if (recipientEmail) {
          await sendBrandedEmail({
            to: recipientEmail,
            subject: 'Your Lease is Ready to Sign',
            template: 'notification',
            data: {
              landlord: landlordRow ?? auth.landlord,
              recipientName: recipientName ?? 'Tenant',
              notificationType: 'lease_signing',
              title: 'Your Lease is Ready to Sign',
              message: `Your lease for ${
                lease.unit.property?.name ?? 'your unit'
              } - ${lease.unit.name} is ready. Tap below to review and sign.`,
              actionUrl: `${baseUrl}/sign/${token}`,
              loginUrl: `${baseUrl}/sign/${token}`,
            },
            landlordId: auth.landlordId,
          } as any);
        }
      } catch (err) {
        console.error('[mobile/pm/leases/:id/signing resend email]', err);
      }

      return NextResponse.json({
        success: true,
        token,
        url: `${baseUrl}/sign/${token}`,
        expiresAt: newExpiry.toISOString(),
      });
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (e: any) {
    console.error('[mobile/pm/leases/:id/signing POST]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
