import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';
import { decrementJobCount } from '@/lib/services/contractor-usage-tracker';

// GET - Get single job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const job = await prisma.contractorJob.findFirst({
      where: {
        id,
        contractorId: contractorProfile.id,
      },
      include: {
        customer: true,
        timeEntries: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { clockIn: 'desc' },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
        },
        changeOrders: {
          orderBy: { createdAt: 'desc' },
        },
        jobMilestones: {
          orderBy: { order: 'asc' },
        },
        jobNotes: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}

// PATCH - Update job
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Verify ownership
    const existingJob = await prisma.contractorJob.findFirst({
      where: {
        id,
        contractorId: contractorProfile.id,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = await prisma.contractorJob.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.jobType !== undefined && { jobType: body.jobType }),
        ...(body.status && { status: body.status }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.zipCode !== undefined && { zipCode: body.zipCode }),
        ...(body.estimatedCost !== undefined && { estimatedCost: body.estimatedCost }),
        ...(body.actualCost !== undefined && { actualCost: body.actualCost }),
        ...(body.laborCost !== undefined && { laborCost: body.laborCost }),
        ...(body.materialCost !== undefined && { materialCost: body.materialCost }),
        ...(body.estimatedStartDate !== undefined && { estimatedStartDate: body.estimatedStartDate }),
        ...(body.estimatedEndDate !== undefined && { estimatedEndDate: body.estimatedEndDate }),
        ...(body.actualStartDate !== undefined && { actualStartDate: body.actualStartDate }),
        ...(body.actualEndDate !== undefined && { actualEndDate: body.actualEndDate }),
        ...(body.estimatedHours !== undefined && { estimatedHours: body.estimatedHours }),
        ...(body.actualHours !== undefined && { actualHours: body.actualHours }),
        ...(body.assignedEmployeeIds && { assignedEmployeeIds: body.assignedEmployeeIds }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes }),
        ...(body.tags && { tags: body.tags }),
        ...(body.priority && { priority: body.priority }),
      },
      include: {
        customer: true,
      },
    });

    // Emit event for status changes
    if (body.status && body.status !== existingJob.status) {
      await eventBus.emit('contractor.job.status_changed', {
        jobId: job.id,
        contractorId: contractorProfile.id,
        customerId: job.customerId,
        oldStatus: existingJob.status,
        newStatus: job.status,
        jobNumber: job.jobNumber,
      });

      // Decrement job count when job is completed or archived
      if (body.status === 'completed' || body.status === 'archived') {
        await decrementJobCount(contractorProfile.id);
      }
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

// DELETE - Delete job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Verify ownership
    const job = await prisma.contractorJob.findFirst({
      where: {
        id,
        contractorId: contractorProfile.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    await prisma.contractorJob.delete({
      where: { id },
    });

    await eventBus.emit('contractor.job.deleted', {
      jobId: id,
      contractorId: contractorProfile.id,
      jobNumber: job.jobNumber,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
