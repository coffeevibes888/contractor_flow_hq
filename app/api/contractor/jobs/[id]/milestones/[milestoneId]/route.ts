/**
 * PATCH  /api/contractor/jobs/[id]/milestones/[milestoneId]
 *   — toggle completion, edit title/description, or mark payment paid.
 * DELETE /api/contractor/jobs/[id]/milestones/[milestoneId]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
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

    const { id, milestoneId } = await params;
    const db = prisma as any;

    const existing = await db.contractorJobMilestone.findFirst({
      where: { id: milestoneId, jobId: id, contractorId: contractorAuth.contractorId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.paymentAmount !== undefined) {
      data.paymentAmount =
        body.paymentAmount != null && body.paymentAmount !== '' ? Number(body.paymentAmount) : null;
    }
    if (body.paymentPaid !== undefined) data.paymentPaid = Boolean(body.paymentPaid);

    // Completion toggle
    if (body.completed !== undefined) {
      const completed = Boolean(body.completed);
      data.status = completed ? 'completed' : 'pending';
      data.completedAt = completed ? new Date() : null;
      data.completedBy = completed ? (contractorAuth.employeeId ?? null) : null;
    } else if (body.status !== undefined) {
      data.status = String(body.status);
      if (body.status === 'completed') {
        data.completedAt = new Date();
        data.completedBy = contractorAuth.employeeId ?? null;
      }
    }

    const milestone = await db.contractorJobMilestone.update({
      where: { id: milestoneId },
      data,
    });

    return NextResponse.json({ milestone });
  } catch (error) {
    console.error('[PATCH milestone]', error);
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
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

    const { id, milestoneId } = await params;
    const db = prisma as any;

    await db.contractorJobMilestone.deleteMany({
      where: { id: milestoneId, jobId: id, contractorId: contractorAuth.contractorId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE milestone]', error);
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
  }
}
