/**
 * GET  /api/contractor/jobs/[id]/milestones  — list checklist/milestone items
 * POST /api/contractor/jobs/[id]/milestones   — add a checklist/milestone item
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const { id } = await params;
    const db = prisma as any;

    const job = await db.contractorJob.findFirst({
      where: { id, contractorId: contractorAuth.contractorId },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const milestones = await db.contractorJobMilestone.findMany({
      where: { jobId: id, contractorId: contractorAuth.contractorId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('[GET milestones]', error);
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const { id } = await params;
    const db = prisma as any;

    const job = await db.contractorJob.findFirst({
      where: { id, contractorId: contractorAuth.contractorId },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await req.json();
    const title: string = (body.title ?? '').trim();
    const description: string | null = body.description?.trim() || null;
    const paymentAmount =
      body.paymentAmount != null && body.paymentAmount !== ''
        ? Number(body.paymentAmount)
        : null;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Append to the end of the current list
    const last = await db.contractorJobMilestone.findFirst({
      where: { jobId: id, contractorId: contractorAuth.contractorId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (last?.order ?? -1) + 1;

    const milestone = await db.contractorJobMilestone.create({
      data: {
        contractorId: contractorAuth.contractorId,
        jobId: id,
        title,
        description,
        order: nextOrder,
        status: 'pending',
        paymentAmount,
        paymentDue: paymentAmount != null,
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error('[POST milestones]', error);
    return NextResponse.json({ error: 'Failed to add checklist item' }, { status: 500 });
  }
}
