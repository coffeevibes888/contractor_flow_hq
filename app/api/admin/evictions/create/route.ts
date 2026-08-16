import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import { evictionService } from '@/lib/services/eviction-service';
import { NoticeType } from '@/types/tenant-lifecycle';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { leaseId, noticeType, reason, amountOwed, additionalNotes } = body || {};

    // Validate required fields
    if (!leaseId) {
      return NextResponse.json({ message: 'Lease ID is required' }, { status: 400 });
    }
    if (!noticeType || !['3-day', '7-day', '30-day'].includes(noticeType)) {
      return NextResponse.json({ 
        message: 'Invalid notice type. Must be 3-day, 7-day, or 30-day' 
      }, { status: 400 });
    }
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ message: 'Eviction reason is required' }, { status: 400 });
    }

    // Verify lease exists and belongs to landlord
    const lease = await prisma.lease.findFirst({
      where: { id: leaseId },
      include: {
        tenant: { select: { id: true, email: true, name: true } },
        unit: { 
          select: { 
            id: true, 
            name: true, 
            property: { select: { id: true, name: true, landlordId: true } } 
          } 
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ message: 'Lease not found' }, { status: 404 });
    }
    if (lease.unit.property?.landlordId !== landlordId) {
      return NextResponse.json({ message: 'Unauthorized access to this lease' }, { status: 403 });
    }

    // Create eviction notice using service
    const evictionNotice = await evictionService.createNotice({
      leaseId,
      noticeType: noticeType as NoticeType,
      reason,
      amountOwed: amountOwed ? parseFloat(amountOwed) : undefined,
      additionalNotes,
    });

    return NextResponse.json({
      success: true,
      evictionNotice,
      deadlineDate: evictionNotice.deadlineDate.toISOString(),
    });
  } catch (error) {
    console.error('Create eviction notice error:', error);
    return NextResponse.json({ message: 'Failed to create eviction notice' }, { status: 500 });
  }
}
