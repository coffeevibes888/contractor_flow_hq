/**
 * GET /api/mobile/contractor/contracts/[id]/signing
 *
 * Returns the signing token + URL for the contractor to sign a
 * customer-facing contract. If no signing session exists, one is
 * created with a 24-hour expiry.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import crypto from 'crypto';

const CONTRACTOR_ROLES = new Set(['contractor']);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!CONTRACTOR_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = payload.userId;

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const contract = await prisma.contractorContract.findFirst({
      where: { id, contractorId: contractorProfile.id },
      select: {
        id: true,
        status: true,
        token: true,
        expiresAt: true,
        signedAt: true,
        contractorSignedAt: true,
        customerName: true,
        customerEmail: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Already fully signed
    if (contract.signedAt || contract.status === 'signed') {
      return NextResponse.json(
        { message: 'Already signed', error: 'ALREADY_SIGNED' },
        { status: 400 }
      );
    }

    // Contractor already signed — waiting for customer
    if (contract.contractorSignedAt) {
      return NextResponse.json(
        { message: 'Already signed by contractor', error: 'ALREADY_SIGNED' },
        { status: 400 }
      );
    }

    // Expired
    if (contract.expiresAt && contract.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { message: 'Signing link has expired', error: 'EXPIRED' },
        { status: 400 }
      );
    }

    let signingToken = contract.token;
    let signingUrl: string;

    if (signingToken) {
      // Reuse existing token
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com';
      signingUrl = `${baseUrl}/sign/${signingToken}`;
    } else {
      // Create new signing token
      signingToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.contractorContract.update({
        where: { id },
        data: {
          token: signingToken,
          expiresAt,
          status: contract.status === 'draft' ? 'sent' : contract.status,
          sentAt: contract.status === 'draft' ? new Date() : undefined,
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com';
      signingUrl = `${baseUrl}/sign/${signingToken}`;
    }

    return NextResponse.json({
      url: signingUrl,
      token: signingToken,
      status: contract.status,
      recipientName: contract.customerName,
      recipientEmail: contract.customerEmail,
      expiresAt: contract.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[mobile/contractor/contracts/[id]/signing]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
