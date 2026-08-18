/**
 * POST /api/employee/job-note
 *
 * Add a note to a job from the employee portal.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, contractorId, jobId, content } = body;

    if (!employeeId || !contractorId || !jobId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const employee = await prisma.contractorEmployee.findFirst({
      where: { id: employeeId, userId: session.user.id, status: 'active', contractorId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const db = prisma as any;

    // Verify job is assigned to this employee
    const job = await db.contractorJob.findFirst({
      where: {
        id: jobId,
        contractorId,
        assignedEmployeeIds: { has: employeeId },
      },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found or not assigned to you' }, { status: 404 });
    }

    // Create note
    const note = await db.contractorJobNote.create({
      data: {
        contractorId,
        jobId,
        content: content.trim(),
        authorName: `${employee.firstName} ${employee.lastName}`.trim(),
        authorRole: 'employee',
        isInternal: false,
      },
    });

    return NextResponse.json({ success: true, id: note.id });
  } catch (error) {
    console.error('POST /api/employee/job-note error:', error);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
