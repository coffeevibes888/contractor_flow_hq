import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

type Params = { params: { id: string } };

// ── GET — single contract with audit trail ────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const db = prisma as any;

    const contract = await db.contractorContract.findFirst({
      where: { id: params.id, contractorId: contractorAuth.contractorId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        job: { select: { title: true, jobNumber: true } },
      },
    });
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    return NextResponse.json({ contract });
  } catch (error) {
    console.error('GET /api/contractor/contracts/[id]', error);
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 });
  }
}

// ── PATCH — update draft or void ─────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const db = prisma as any;

    const existing = await db.contractorContract.findFirst({
      where: { id: params.id, contractorId: contractorAuth.contractorId },
    });
    if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const body = await req.json();
    const { action, title, type, contractBody, customerName, customerEmail,
      customerPhone, contractAmount, depositAmount, paymentTerms, notes } = body as {
        action?: 'void';
        title?: string; type?: string; contractBody?: string;
        customerName?: string; customerEmail?: string; customerPhone?: string;
        contractAmount?: number; depositAmount?: number; paymentTerms?: string;
        notes?: string;
      };

    if (action === 'void') {
      if (['signed', 'void'].includes(existing.status)) {
        return NextResponse.json({ error: 'Cannot void a signed or already voided contract' }, { status: 400 });
      }
      const updated = await db.contractorContract.update({
        where: { id: params.id },
        data: { status: 'void' },
      });
      await db.contractorContractEvent.create({
        data: { contractId: params.id, eventType: 'voided', actor: 'contractor' },
      });
      return NextResponse.json({ contract: updated });
    }

    // Only allow editing drafts
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft contracts can be edited' }, { status: 400 });
    }

    const updated = await db.contractorContract.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(type && { type }),
        ...(contractBody && { body: contractBody }),
        ...(customerName && { customerName }),
        ...(customerEmail && { customerEmail }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(contractAmount !== undefined && { contractAmount }),
        ...(depositAmount !== undefined && { depositAmount }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ contract: updated });
  } catch (error) {
    console.error('PATCH /api/contractor/contracts/[id]', error);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
  }
}

// ── DELETE — delete draft only ────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const db = prisma as any;

    const existing = await db.contractorContract.findFirst({
      where: { id: params.id, contractorId: contractorAuth.contractorId },
    });
    if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft contracts can be deleted' }, { status: 400 });
    }

    await db.contractorContract.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contractor/contracts/[id]', error);
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }
}
