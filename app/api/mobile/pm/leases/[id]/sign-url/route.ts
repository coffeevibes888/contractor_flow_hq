import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

/**
 * GET /api/mobile/pm/leases/[id]/sign-url
 * Returns the signing token/URL for the landlord to sign a lease from the app.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const leaseId = params.id;

    // Find the landlord's pending signature request for this lease
    const signatureRequest = await prisma.documentSignatureRequest.findFirst({
      where: {
        leaseId,
        role: 'landlord',
        status: { not: 'signed' },
      },
      select: {
        token: true,
        status: true,
        expiresAt: true,
        recipientName: true,
      },
    });

    if (!signatureRequest || !signatureRequest.token) {
      // Check if already signed
      const signed = await prisma.documentSignatureRequest.findFirst({
        where: { leaseId, role: 'landlord', status: 'signed' },
      });
      if (signed) {
        return NextResponse.json({ error: 'Already signed', code: 'ALREADY_SIGNED' }, { status: 400 });
      }

      // Check if tenant has signed yet
      const tenantSigned = await prisma.documentSignatureRequest.findFirst({
        where: { leaseId, role: 'tenant', status: 'signed' },
      });
      if (!tenantSigned) {
        return NextResponse.json({ error: 'Tenant must sign first', code: 'TENANT_NOT_SIGNED' }, { status: 400 });
      }

      return NextResponse.json({ error: 'No signing request found', code: 'NOT_FOUND' }, { status: 404 });
    }

    if (signatureRequest.expiresAt && signatureRequest.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Signing link expired', code: 'EXPIRED' }, { status: 410 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com';

    return NextResponse.json({
      signingToken: signatureRequest.token,
      signingUrl: `${baseUrl}/api/sign/${signatureRequest.token}`,
      recipientName: signatureRequest.recipientName,
      status: signatureRequest.status,
    });
  } catch (error) {
    console.error('[mobile/pm/leases/[id]/sign-url]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
