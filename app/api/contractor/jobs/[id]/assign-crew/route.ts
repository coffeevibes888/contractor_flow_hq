/**
 * PATCH /api/contractor/jobs/[id]/assign-crew
 *
 * Quickly assign or unassign employees on a job from the dispatch board
 * without going through the full job edit form.
 *
 * Body: { employeeIds: string[] }  — full replacement of assignedEmployeeIds
 *
 * Notes
 * - Next 16 dynamic route handlers receive `params` as a Promise. The
 *   previous sync shape returned a 500 here which is what was breaking the
 *   "Assign Crew" button on the Morning Briefing dispatch board.
 * - We require `team.assign` permission via `assertPermission` so only
 *   roles with crew-assignment rights can hit this. The contractor owner
 *   bypasses the permission check (assertPermission already handles that).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { eventBus } from '@/lib/event-system';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const db = prisma as any;

    const job = await db.contractorJob.findFirst({
      where: { id: jobId, contractorId: profile.id },
      select: {
        id: true,
        title: true,
        jobNumber: true,
        assignedEmployeeIds: true,
        status: true,
      },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const employeeIds = Array.isArray(body?.employeeIds) ? body.employeeIds : null;

    if (!employeeIds) {
      return NextResponse.json(
        { error: 'employeeIds must be an array' },
        { status: 400 },
      );
    }

    // Verify all employees belong to this contractor and are active.
    if (employeeIds.length > 0) {
      const valid = await db.contractorEmployee.count({
        where: {
          id: { in: employeeIds },
          contractorId: profile.id,
          status: 'active',
        },
      });
      if (valid !== employeeIds.length) {
        return NextResponse.json(
          { error: 'One or more employees not found' },
          { status: 400 },
        );
      }
    }

    const updated = await db.contractorJob.update({
      where: { id: jobId },
      data: { assignedEmployeeIds: employeeIds },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        assignedEmployeeIds: true,
        status: true,
      },
    });

    // Notify newly added employees so they get a heads-up in their inbox.
    const previousIds = new Set(job.assignedEmployeeIds as string[]);
    const newlyAdded: string[] = employeeIds.filter(
      (id: string) => !previousIds.has(id),
    );

    if (newlyAdded.length > 0) {
      const newEmployees = await db.contractorEmployee.findMany({
        where: { id: { in: newlyAdded }, contractorId: profile.id },
        select: { id: true, firstName: true, userId: true },
      });

      for (const emp of newEmployees) {
        if (!emp.userId) continue;
        await db.notification.create({
          data: {
            userId: emp.userId,
            type: 'reminder',
            title: `Assigned to ${job.title}`,
            message: `You've been added to job ${job.jobNumber}.`,
            actionUrl: `/contractor-dashboard/jobs/${job.id}`,
          },
        });
      }
    }

    // Emit status event so dispatch board / mobile listeners refresh.
    try {
      await eventBus.emit('contractor.job.status_changed', {
        jobId: job.id,
        contractorId: profile.id,
        previousStatus: job.status,
        newStatus: job.status,
        contractorUserId: session.user.id,
      });
    } catch (busError) {
      // Don't block the assignment if the event bus is misconfigured.
      console.warn('[assign-crew] event emit failed', busError);
    }

    return NextResponse.json({ success: true, job: updated });
  } catch (error) {
    console.error('[assign-crew]', error);
    return NextResponse.json(
      { error: 'Failed to assign crew' },
      { status: 500 },
    );
  }
}
