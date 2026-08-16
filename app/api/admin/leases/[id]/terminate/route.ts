import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import { offboardingService } from '@/lib/services/offboarding-service';
import { DepartureType } from '@/types/tenant-lifecycle';

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

    const { id: leaseId } = await params;
    const body = await req.json();
    const { reason, terminationDate, notes, initiateOffboarding = true, markUnitAvailable = false } = body || {};

    // Validate required fields
    const validReasons: DepartureType[] = ['eviction', 'voluntary', 'lease_end', 'mutual_agreement'];
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json({ 
        message: 'Invalid termination reason. Must be one of: ' + validReasons.join(', ') 
      }, { status: 400 });
    }
    
    if (!terminationDate) {
      return NextResponse.json({ message: 'Termination date is required' }, { status: 400 });
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
    if (lease.status === 'terminated') {
      return NextResponse.json({ message: 'Lease is already terminated' }, { status: 400 });
    }

    // If initiating offboarding, use the offboarding service
    if (initiateOffboarding) {
      const result = await offboardingService.executeOffboarding({
        leaseId,
        departureType: reason,
        departureDate: new Date(terminationDate),
        notes,
        markUnitAvailable,
      });

      return NextResponse.json({
        success: result.success,
        lease: { id: leaseId, status: 'terminated' },
        offboardingId: result.tenantHistoryId,
        leaseTerminated: result.leaseTerminated,
        departureRecorded: result.departureRecorded,
        errors: result.errors,
      });
    }

    // Otherwise, just terminate the lease without full offboarding
    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: 'terminated',
        terminationReason: reason,
        terminatedAt: new Date(terminationDate),
        endDate: new Date(terminationDate),
      },
    });

    // Cancel pending payments
    await prisma.rentPayment.updateMany({
      where: {
        leaseId,
        status: { in: ['pending', 'scheduled'] },
      },
      data: {
        status: 'cancelled',
      },
    });

    return NextResponse.json({
      success: true,
      lease: updatedLease,
    });
  } catch (error) {
    console.error('Terminate lease error:', error);
    return NextResponse.json({ message: 'Failed to terminate lease' }, { status: 500 });
  }
}
