/**
 * GET /api/mobile/contractor/contracts/[id]
 *
 * Returns full detail for a single contractor contract.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

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
        contractNumber: true,
        title: true,
        type: true,
        body: true,
        status: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        contractorName: true,
        contractorEmail: true,
        contractAmount: true,
        depositAmount: true,
        paymentTerms: true,
        sentAt: true,
        viewedAt: true,
        signedAt: true,
        expiresAt: true,
        customerSignedAt: true,
        contractorSignedAt: true,
        signedPdfUrl: true,
        customerSignedPdfUrl: true,
        executedPdfUrl: true,
        declineReason: true,
        notes: true,
        createdAt: true,
        token: true,
        job: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: contract.id,
      title: contract.title,
      type: contract.type,
      status: contract.status,
      customerName: contract.customerName,
      customerEmail: contract.customerEmail,
      propertyName: contract.job
        ? `${contract.job.title}${contract.job.city ? ` - ${contract.job.city}` : ''}`
        : null,
      amount: contract.contractAmount ? Number(contract.contractAmount) : null,
      depositAmount: contract.depositAmount ? Number(contract.depositAmount) : null,
      paymentTerms: contract.paymentTerms,
      signedAt: contract.signedAt?.toISOString() ?? null,
      expiresAt: contract.expiresAt?.toISOString() ?? null,
      createdAt: contract.createdAt.toISOString(),
      tenantSignedAt: contract.customerSignedAt?.toISOString() ?? null,
      contractorSignedAt: contract.contractorSignedAt?.toISOString() ?? null,
      hasSigningSession: !!contract.token,
      description: contract.body,
      notes: contract.notes,
      signedPdfUrl: contract.signedPdfUrl,
      executedPdfUrl: contract.executedPdfUrl,
    });
  } catch (error) {
    console.error('[mobile/contractor/contracts/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
