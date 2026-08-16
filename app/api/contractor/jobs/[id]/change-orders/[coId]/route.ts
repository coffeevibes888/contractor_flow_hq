/**
 * PATCH  /api/contractor/jobs/[id]/change-orders/[coId]
 *   — update a change order, or approve/reject it (with optional signature).
 *     When approved, the additional cost is rolled into the job's estimatedCost.
 * DELETE /api/contractor/jobs/[id]/change-orders/[coId]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { id, coId } = await params;
    const db = prisma as any;

    const existing = await db.contractorChangeOrder.findFirst({
      where: { id: coId, jobId: id, contractorId: contractorAuth.contractorId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.description !== undefined) data.description = String(body.description).trim();
    if (body.reason !== undefined) data.reason = body.reason?.trim() || null;
    if (body.additionalCost !== undefined) data.additionalCost = Number(body.additionalCost);
    if (body.additionalHours !== undefined) {
      data.additionalHours = body.additionalHours != null ? parseInt(body.additionalHours) : null;
    }

    // Status transitions: approve / reject
    const wasApproved = existing.status === 'approved';
    if (body.status && ['pending', 'approved', 'rejected'].includes(body.status)) {
      data.status = body.status;
      if (body.status === 'approved') {
        data.approvedAt = new Date();
        if (body.approvedBy) data.approvedBy = String(body.approvedBy);
        if (body.signatureUrl) data.signatureUrl = String(body.signatureUrl);
      }
      if (body.status === 'rejected') {
        data.approvedAt = null;
      }
    }

    const changeOrder = await db.contractorChangeOrder.update({
      where: { id: coId },
      data,
    });

    // When a change order transitions INTO approved, roll its cost/hours into
    // the job so the job value and profitability reflect the added scope.
    const nowApproved = changeOrder.status === 'approved';
    if (!wasApproved && nowApproved) {
      const job = await db.contractorJob.findUnique({
        where: { id },
        select: { estimatedCost: true, estimatedHours: true },
      });
      if (job) {
        await db.contractorJob.update({
          where: { id },
          data: {
            estimatedCost: Number(job.estimatedCost ?? 0) + Number(changeOrder.additionalCost ?? 0),
            estimatedHours:
              changeOrder.additionalHours != null
                ? Number(job.estimatedHours ?? 0) + Number(changeOrder.additionalHours)
                : job.estimatedHours,
          },
        });
      }
    }

    return NextResponse.json({ changeOrder });
  } catch (error) {
    console.error('[PATCH change-order]', error);
    return NextResponse.json({ error: 'Failed to update change order' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { id, coId } = await params;
    const db = prisma as any;

    await db.contractorChangeOrder.deleteMany({
      where: { id: coId, jobId: id, contractorId: contractorAuth.contractorId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE change-order]', error);
    return NextResponse.json({ error: 'Failed to delete change order' }, { status: 500 });
  }
}
