import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET - Get time entries
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const approved = searchParams.get('approved');

    const where: any = {
      employee: {
        contractorId: contractorProfile.id,
      },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (startDate) {
      where.clockIn = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.clockIn = {
        ...where.clockIn,
        lte: new Date(endDate),
      };
    }

    if (approved !== null && approved !== undefined) {
      where.approved = approved === 'true';
    }

    const entries = await prisma.contractorTimeEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
            payRate: true,
          },
        },
      },
      orderBy: { clockIn: 'desc' },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
      { status: 500 }
    );
  }
}

// POST - Create manual time entry
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { employeeId, clockIn, clockOut, breakMinutes, notes } = body;

    if (!employeeId || !clockIn || !clockOut) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify employee belongs to contractor
    const employee = await prisma.contractorEmployee.findUnique({
      where: {
        id: employeeId,
        contractorId: contractorProfile.id,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const entry = await prisma.contractorTimeEntry.create({
      data: {
        contractorId: contractorProfile.id,
        employeeId,
        clockIn: new Date(clockIn),
        clockOut: new Date(clockOut),
        breakMinutes: breakMinutes || 0,
        notes: notes || null,
        status: 'pending',
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            payRate: true,
          },
        },
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      { error: 'Failed to create time entry' },
      { status: 500 }
    );
  }
}
