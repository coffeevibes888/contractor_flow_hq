import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CTR-${year}-${rand}`;
}

// ── GET — list contracts ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const db = prisma as any;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const take = parseInt(searchParams.get('take') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const contracts = await db.contractorContract.findMany({
      where: {
        contractorId: contractorAuth.contractorId,
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        type: true,
        status: true,
        customerName: true,
        customerEmail: true,
        contractAmount: true,
        sentAt: true,
        signedAt: true,
        expiresAt: true,
        createdAt: true,
        jobId: true,
        job: { select: { title: true, jobNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    const total = await db.contractorContract.count({
      where: { contractorId: contractorAuth.contractorId, ...(status ? { status } : {}) },
    });

    return NextResponse.json({ contracts, total });
  } catch (error) {
    console.error('GET /api/contractor/contracts', error);
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

// ── POST — create contract ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch contractor snapshot info
    const profile = await prisma.contractorProfile.findUnique({
      where: { id: contractorAuth.contractorId },
      select: { businessName: true, email: true, phone: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const body = await req.json();
    const {
      title, type, body: contractBody, jobId,
      customerName, customerEmail, customerPhone,
      contractAmount, depositAmount, paymentTerms,
      expiresInDays, notes,
    } = body as {
      title: string; type?: string; body: string; jobId?: string;
      customerName: string; customerEmail: string; customerPhone?: string;
      contractAmount?: number; depositAmount?: number; paymentTerms?: string;
      expiresInDays?: number; notes?: string;
    };

    if (!title || !contractBody || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'title, body, customerName, customerEmail are required' }, { status: 400 });
    }

    // Ensure unique contract number
    const db = prisma as any;
    let contractNumber = generateContractNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.contractorContract.findUnique({ where: { contractNumber } });
      if (!existing) break;
      contractNumber = generateContractNumber();
      attempts++;
    }
    const contract = await db.contractorContract.create({
      data: {
        contractorId: contractorAuth.contractorId,
        contractNumber,
        title,
        type: type || 'service_agreement',
        body: contractBody,
        jobId: jobId || null,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        contractorName: profile.businessName,
        contractorEmail: profile.email || '',
        contractorPhone: profile.phone || null,
        contractAmount: contractAmount ? contractAmount : null,
        depositAmount: depositAmount ? depositAmount : null,
        paymentTerms: paymentTerms || null,
        expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
        notes: notes || null,
        status: 'draft',
      },
    });

    // Audit event
    await db.contractorContractEvent.create({
      data: {
        contractId: contract.id,
        eventType: 'created',
        actor: 'contractor',
        actorName: profile.businessName,
      },
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contractor/contracts', error);
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
}
