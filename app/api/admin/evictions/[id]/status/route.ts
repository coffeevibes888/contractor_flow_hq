import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import { evictionService } from '@/lib/services/eviction-service';
import { EvictionNoticeStatus, isValidStatusTransition } from '@/types/tenant-lifecycle';

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

    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body || {};

    // Validate status
    const validStatuses: EvictionNoticeStatus[] = [
      'served', 'cure_period', 'cured', 'expired', 'filed_with_court', 'completed'
    ];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      }, { status: 400 });
    }

    // Verify eviction notice exists and belongs to landlord
    const existingNotice = await prisma.evictionNotice.findFirst({
      where: { id, landlordId },
    });

    if (!existingNotice) {
      return NextResponse.json({ message: 'Eviction notice not found' }, { status: 404 });
    }

    // Validate state transition
    if (!isValidStatusTransition(existingNotice.status as EvictionNoticeStatus, status)) {
      return NextResponse.json({ 
        message: `Invalid status transition from ${existingNotice.status} to ${status}` 
      }, { status: 400 });
    }

    // Update status using service
    const updatedNotice = await evictionService.updateStatus(id, {
      status,
      notes,
    });

    return NextResponse.json({
      success: true,
      evictionNotice: updatedNotice,
    });
  } catch (error) {
    console.error('Update eviction status error:', error);
    return NextResponse.json({ message: 'Failed to update eviction status' }, { status: 500 });
  }
}
