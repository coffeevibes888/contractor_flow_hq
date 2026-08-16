import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST - Assign employee to job
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Verify employee belongs to contractor
    const employee = await prisma.contractorEmployee.findUnique({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { jobId, role, startDate } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }

    // Verify job belongs to contractor
    const job = await prisma.contractorJob.findUnique({
      where: {
        id: jobId,
        contractorId: contractorProfile.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if already assigned
    const existingAssignment = await prisma.contractorJobAssignment.findFirst({
      where: {
        jobId,
        employeeId: params.id,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Employee already assigned to this job' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await prisma.contractorJobAssignment.create({
      data: {
        contractorId: contractorProfile.id,
        jobId,
        employeeId: params.id,
        role: role || 'technician',
        startDate: new Date(startDate),
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Error assigning employee to job:', error);
    return NextResponse.json(
      { error: 'Failed to assign employee' },
      { status: 500 }
    );
  }
}
