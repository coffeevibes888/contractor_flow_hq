import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';
import { onJobStatusChanged } from '@/lib/services/contractor-automation';

type Params = { params: { id: string } };

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  quoted: ['approved', 'canceled'],
  approved: ['scheduled', 'canceled'],
  scheduled: ['in_progress', 'on_hold', 'canceled'],
  in_progress: ['on_hold', 'completed', 'canceled'],
  on_hold: ['in_progress', 'canceled'],
  completed: ['approved', 'invoiced'],
  invoiced: ['paid'],
  paid: [],
  canceled: [],
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const db = prisma as any;
    const job = await db.contractorJob.findFirst({
      where: {
        id: params.id,
        contractorId: contractorAuth.contractorId,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[job.status] || [];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${job.status}" to "${status}". Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = { status };

    if (status === 'in_progress' && !job.actualStartDate) {
      updateData.actualStartDate = new Date();
    }
    if (status === 'completed') {
      updateData.actualEndDate = new Date();
    }

    const updatedJob = await db.contractorJob.update({
      where: { id: params.id },
      data: updateData,
    });

    // Add a note if provided
    if (notes) {
      await db.contractorJobNote.create({
        data: {
          contractorId: contractorAuth.contractorId,
          jobId: params.id,
          content: notes,
          type: 'status_change',
          isInternal: true,
        },
      });
    }

    // Run automation pipeline
    try {
      await onJobStatusChanged(params.id, job.status, status);
    } catch (automationError) {
      console.error('Job status automation error (non-blocking):', automationError);
    }

    return NextResponse.json({
      success: true,
      job: updatedJob,
      previousStatus: job.status,
      newStatus: status,
    });
  } catch (error) {
    console.error('PATCH /api/contractor/jobs/[id]/status', error);
    return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
  }
}
