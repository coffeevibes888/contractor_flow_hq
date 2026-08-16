/**
 * GET /api/mobile/contractor/contracts
 *
 * Returns all contracts for the authenticated contractor.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const CONTRACTOR_ROLES = new Set(['contractor']);

export async function GET(req: NextRequest) {
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

    const contracts = await prisma.contractorContract.findMany({
      where: { contractorId: contractorProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        contractNumber: true,
        title: true,
        status: true,
        customerName: true,
        customerEmail: true,
        contractAmount: true,
        signedAt: true,
        expiresAt: true,
        createdAt: true,
        customerSignedAt: true,
        contractorSignedAt: true,
      },
    });

    return NextResponse.json({
      contracts: contracts.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        customerName: c.customerName,
        customerEmail: c.customerEmail,
        amount: c.contractAmount ? Number(c.contractAmount) : null,
        signedAt: c.signedAt?.toISOString() ?? null,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        tenantSignedAt: c.customerSignedAt?.toISOString() ?? null,
        contractorSignedAt: c.contractorSignedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error('[mobile/contractor/contracts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
