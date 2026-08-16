import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mark work order as completed (Contractor action)
 * 
 * After this, PM can review and release escrow
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: workOrderId } = await params;
    const { notes, actualCost } = await req.json();

    // Get work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        contractor: { select: { id: true, userId: true } },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Verify contractor owns this
    if (workOrder.contractor?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Must be in progress to complete
    if (workOrder.status !== 'in_progress') {
      return NextResponse.json({ 
        error: 'Work order must be in progress to mark as completed' 
      }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.workOrder.update({
        where: { id: workOrderId },
        data: { 
          status: 'completed',
          completedAt: new Date(),
          actualCost: actualCost ? Number(actualCost) : workOrder.agreedPrice,
          notes: notes ? `${workOrder.notes || ''}\n\nCompletion notes: ${notes}` : workOrder.notes,
        },
      }),
      prisma.workOrderHistory.create({
        data: {
          workOrderId,
          changedById: session.user.id,
          previousStatus: 'in_progress',
          newStatus: 'completed',
          notes: notes || 'Work marked as completed by contractor',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Work order marked as completed. Awaiting PM approval for payment release.',
    });
  } catch (error) {
    console.error('Error completing work order:', error);
    return NextResponse.json({ error: 'Failed to complete work order' }, { status: 500 });
  }
}
