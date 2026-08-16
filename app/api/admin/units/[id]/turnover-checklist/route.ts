import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 400 });
    }
    const landlordId = landlordResult.landlord.id;

    const { id: unitId } = await params;

    // Verify unit belongs to landlord
    const unit = await prisma.unit.findFirst({
      where: { id: unitId },
      include: {
        property: { select: { landlordId: true } },
      },
    });

    if (!unit) {
      return NextResponse.json({ message: 'Unit not found' }, { status: 404 });
    }
    if (unit.property?.landlordId !== landlordId) {
      return NextResponse.json({ message: 'Unauthorized access to this unit' }, { status: 403 });
    }

    // Get the most recent turnover checklist for this unit
    const checklist = await prisma.unitTurnoverChecklist.findFirst({
      where: { unitId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      checklist,
    });
  } catch (error) {
    console.error('Get turnover checklist error:', error);
    return NextResponse.json({ message: 'Failed to get turnover checklist' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 400 });
    }
    const landlordId = landlordResult.landlord.id;

    const { id: unitId } = await params;
    const body = await req.json();
    const { leaseId } = body || {};

    // Verify unit belongs to landlord
    const unit = await prisma.unit.findFirst({
      where: { id: unitId },
      include: {
        property: { select: { landlordId: true } },
      },
    });

    if (!unit) {
      return NextResponse.json({ message: 'Unit not found' }, { status: 404 });
    }
    if (unit.property?.landlordId !== landlordId) {
      return NextResponse.json({ message: 'Unauthorized access to this unit' }, { status: 403 });
    }

    // Create new turnover checklist
    const checklist = await prisma.unitTurnoverChecklist.create({
      data: {
        unitId,
        leaseId,
        landlordId,
        depositProcessed: false,
        keysCollected: false,
        unitInspected: false,
        cleaningCompleted: false,
        repairsCompleted: false,
      },
    });

    return NextResponse.json({
      success: true,
      checklist,
    });
  } catch (error) {
    console.error('Create turnover checklist error:', error);
    return NextResponse.json({ message: 'Failed to create turnover checklist' }, { status: 500 });
  }
}
