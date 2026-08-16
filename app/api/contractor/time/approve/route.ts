import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST - Approve time entries
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
    const { entryIds } = body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { error: 'Entry IDs array is required' },
        { status: 400 }
      );
    }

    // Verify all entries belong to contractor's employees
    const entries = await prisma.contractorTimeEntry.findMany({
      where: {
        id: { in: entryIds },
        employee: {
          contractorId: contractorProfile.id,
        },
      },
    });

    if (entries.length !== entryIds.length) {
      return NextResponse.json(
        { error: 'Some entries not found or unauthorized' },
        { status: 404 }
      );
    }

    // Approve all entries
    await prisma.contractorTimeEntry.updateMany({
      where: {
        id: { in: entryIds },
      },
      data: {
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      approvedCount: entryIds.length,
    });
  } catch (error) {
    console.error('Error approving time entries:', error);
    return NextResponse.json(
      { error: 'Failed to approve time entries' },
      { status: 500 }
    );
  }
}
