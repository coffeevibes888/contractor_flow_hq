import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import { offboardingService } from '@/lib/services/offboarding-service';
import { DepartureType } from '@/types/tenant-lifecycle';

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
    const { leaseId, departureType, departureDate, notes, evictionNoticeId, initiateOffboarding = true } = body || {};

    // Validate required fields
    if (!leaseId) {
      return NextResponse.json({ message: 'Lease ID is required' }, { status: 400 });
    }
    
    const validDepartureTypes: DepartureType[] = ['eviction', 'voluntary', 'lease_end', 'mutual_agreement'];
    if (!departureType || !validDepartureTypes.includes(departureType)) {
      return NextResponse.json({ 
        message: 'Invalid departure type. Must be one of: ' + validDepartureTypes.join(', ') 
      }, { status: 400 });
    }
    
    if (!departureDate) {
      return NextResponse.json({ message: 'Departure date is required' }, { status: 400 });
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

    // If initiating offboarding, use the offboarding service
    if (initiateOffboarding) {
      const result = await offboardingService.executeOffboarding({
        leaseId,
        departureType,
        departureDate: new Date(departureDate),
        notes,
      });

      return NextResponse.json({
        success: result.success,
        offboardingInitiated: true,
        leaseTerminated: result.leaseTerminated,
        departureRecorded: result.departureRecorded,
        tenantHistoryId: result.tenantHistoryId,
        turnoverChecklistId: result.turnoverChecklistId,
        errors: result.errors,
      });
    }

    // Otherwise, just record the departure without full offboarding
    const departure = await prisma.tenantDeparture.create({
      data: {
        leaseId,
        tenantId: lease.tenantId,
        unitId: lease.unitId,
        landlordId,
        departureType,
        departureDate: new Date(departureDate),
        notes,
        evictionNoticeId,
      },
    });

    return NextResponse.json({
      success: true,
      departure,
      offboardingInitiated: false,
    });
  } catch (error) {
    console.error('Record departure error:', error);
    return NextResponse.json({ message: 'Failed to record departure' }, { status: 500 });
  }
}
