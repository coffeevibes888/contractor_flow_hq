import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';

type ChecklistItem = 'depositProcessed' | 'keysCollected' | 'unitInspected' | 'cleaningCompleted' | 'repairsCompleted';

const checklistItems: ChecklistItem[] = [
  'depositProcessed',
  'keysCollected',
  'unitInspected',
  'cleaningCompleted',
  'repairsCompleted',
];

export async function PATCH(
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

    const { id: checklistId } = await params;
    const body = await req.json();
    const { item, completed, notes } = body || {};

    // Validate item
    if (!item || !checklistItems.includes(item)) {
      return NextResponse.json({ 
        message: 'Invalid checklist item. Must be one of: ' + checklistItems.join(', ') 
      }, { status: 400 });
    }

    if (typeof completed !== 'boolean') {
      return NextResponse.json({ message: 'completed must be a boolean' }, { status: 400 });
    }

    // Verify checklist exists and belongs to landlord
    const checklist = await prisma.unitTurnoverChecklist.findFirst({
      where: { id: checklistId, landlordId },
    });

    if (!checklist) {
      return NextResponse.json({ message: 'Checklist not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, any> = {
      [item]: completed,
      [`${item}At`]: completed ? new Date() : null,
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update the checklist item
    const updatedChecklist = await prisma.unitTurnoverChecklist.update({
      where: { id: checklistId },
      data: updateData,
    });

    // Check if all items are complete
    const allComplete = 
      updatedChecklist.depositProcessed &&
      updatedChecklist.keysCollected &&
      updatedChecklist.unitInspected &&
      updatedChecklist.cleaningCompleted &&
      updatedChecklist.repairsCompleted;

    // If all complete and not already marked, set completedAt
    if (allComplete && !updatedChecklist.completedAt) {
      await prisma.unitTurnoverChecklist.update({
        where: { id: checklistId },
        data: { completedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      checklist: updatedChecklist,
      allComplete,
    });
  } catch (error) {
    console.error('Update turnover checklist error:', error);
    return NextResponse.json({ message: 'Failed to update turnover checklist' }, { status: 500 });
  }
}

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

    const { id: checklistId } = await params;

    const checklist = await prisma.unitTurnoverChecklist.findFirst({
      where: { id: checklistId, landlordId },
    });

    if (!checklist) {
      return NextResponse.json({ message: 'Checklist not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      checklist,
    });
  } catch (error) {
    console.error('Get turnover checklist error:', error);
    return NextResponse.json({ message: 'Failed to get turnover checklist' }, { status: 500 });
  }
}
