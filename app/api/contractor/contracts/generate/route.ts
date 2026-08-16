import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';
import { generateContractorContractHtml, type ContractorContractData, TRADE_DEFINITIONS } from '@/lib/services/contractor-contract-builder';
import { randomBytes } from 'crypto';

function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CTR-${year}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { contractData, jobId } = body as { contractData: ContractorContractData; jobId?: string };

    if (!contractData) {
      return NextResponse.json({ error: 'Contract data is required' }, { status: 400 });
    }

    // Set signing date — JSON deserializes dates as strings, so always parse
    contractData.signingDate = contractData.signingDate
      ? new Date(contractData.signingDate)
      : new Date();

    // Generate HTML
    const html = generateContractorContractHtml(contractData);

    // Generate contract number
    const contractNumber = generateContractNumber();

    // Generate tokens
    const customerToken = randomBytes(32).toString('hex');
    const contractorToken = randomBytes(32).toString('hex');

    // Get trade definition for title
    const trade = TRADE_DEFINITIONS[contractData.tradeType] || TRADE_DEFINITIONS.general;

    // Create contract record
    const db = prisma as any;
    const contract = await db.contractorContract.create({
      data: {
        contractorId: contractorAuth.contractorId,
        jobId: jobId || null,
        contractNumber,
        title: contractData.jobTitle || `${trade.label} Service Agreement`,
        type: 'service_agreement',
        body: html,
        customerName: contractData.customerName,
        customerEmail: contractData.customerEmail,
        customerPhone: contractData.customerPhone || null,
        contractorName: contractData.contractorBusinessName || contractData.contractorLegalName,
        contractorEmail: contractData.contractorEmail,
        contractorPhone: contractData.contractorPhone,
        contractAmount: contractData.totalAmount,
        depositAmount: contractData.depositAmount || null,
        paymentTerms: `${contractData.paymentTerms}${contractData.depositAmount ? ` (deposit: $${contractData.depositAmount})` : ''}`,
        token: customerToken,
        contractorToken,
        contractorTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'draft',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: contractData.additionalTerms || null,
      },
    });

    // Log audit event
    try {
      await db.contractorContractEvent.create({
        data: {
          contractId: contract.id,
          eventType: 'created',
          actor: 'contractor',
          actorName: contractData.contractorBusinessName || contractData.contractorLegalName,
          note: `Created ${trade.label} contract via Free Contract Builder`,
        },
      });
    } catch (auditErr) {
      console.warn('Audit log failed (non-critical):', auditErr);
    }

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        title: contract.title,
        type: contract.type,
        status: contract.status,
        customerName: contract.customerName,
        customerEmail: contract.customerEmail,
        contractAmount: contract.contractAmount?.toString() || null,
        sentAt: contract.sentAt?.toISOString() || null,
        signedAt: contract.signedAt?.toISOString() || null,
        expiresAt: contract.expiresAt?.toISOString() || null,
        createdAt: contract.createdAt.toISOString(),
        job: null,
      },
      html,
    });
  } catch (error: any) {
    console.error('POST /api/contractor/contracts/generate', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate contract' }, { status: 500 });
  }
}
