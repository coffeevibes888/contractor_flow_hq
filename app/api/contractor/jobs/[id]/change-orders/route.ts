/**
 * GET  /api/contractor/jobs/[id]/change-orders  — list change orders for a job
 * POST /api/contractor/jobs/[id]/change-orders   — create a change order
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

    const changeOrders = await db.contractorChangeOrder.findMany({
      where: { jobId: id, contractorId: contractorAuth.contractorId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ changeOrders });
  } catch (error) {
    console.error('[GET change-orders]', error);
    return NextResponse.json({ error: 'Failed to fetch change orders' }, { status: 500 });
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
    const description: string = (body.description ?? '').trim();
    const reason: string | null = body.reason?.trim() || null;
    const additionalCost = Number(body.additionalCost ?? 0);
    const additionalHours = body.additionalHours != null ? parseInt(body.additionalHours) : null;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }
    if (Number.isNaN(additionalCost)) {
      return NextResponse.json({ error: 'additionalCost must be a number' }, { status: 400 });
    }

    const changeOrder = await db.contractorChangeOrder.create({
      data: {
        contractorId: contractorAuth.contractorId,
        jobId: id,
        title,
        description,
        reason,
        additionalCost,
        additionalHours,
        status: 'pending',
      },
    });

    return NextResponse.json({ changeOrder }, { status: 201 });
  } catch (error) {
    console.error('[POST change-orders]', error);
    return NextResponse.json({ error: 'Failed to create change order' }, { status: 500 });
  }
}
