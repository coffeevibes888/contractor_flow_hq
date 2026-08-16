import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import { offboardingService } from '@/lib/services/offboarding-service';

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

    const { id: unitId } = await params;
    const body = await req.json();
    const { isAvailable, forceTermination, terminationReason, terminationDate } = body || {};

    if (typeof isAvailable !== 'boolean') {
      return NextResponse.json({ message: 'isAvailable must be a boolean' }, { status: 400 });
    }

    // Verify unit exists and belongs to landlord
    const unit = await prisma.unit.findFirst({
      where: { id: unitId },
      include: {
        property: { 
          select: { 
            id: true, 
            landlordId: true,
            defaultLeaseDocumentId: true,
            name: true,
          } 
        },
        leases: {
          where: { status: 'active' },
          include: {
            tenant: { select: { id: true, name: true, email: true } },
          },
          take: 1,
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ message: 'Unit not found' }, { status: 404 });
    }
    if (unit.property?.landlordId !== landlordId) {
      return NextResponse.json({ message: 'Unauthorized access to this unit' }, { status: 403 });
    }

    // If trying to make available, check if property has a lease assigned
    if (isAvailable && !unit.property?.defaultLeaseDocumentId) {
      return NextResponse.json({
        success: false,
        requiresLease: true,
        propertyId: unit.property?.id,
        propertyName: unit.property?.name,
        message: 'A lease template must be assigned to this property before listing units. Go to Legal Documents to upload and assign a lease.',
      }, { status: 400 });
    }

    const activeLease = unit.leases[0];

    // If trying to make available and there's an active tenant
    if (isAvailable && activeLease) {
      // If not forcing termination, return tenant detection info
      if (!forceTermination) {
        return NextResponse.json({
          success: false,
          requiresConfirmation: true,
          tenantDetected: {
            tenantId: activeLease.tenantId,
            tenantName: activeLease.tenant.name,
            leaseId: activeLease.id,
          },
          message: 'Active tenant detected. Confirm departure to proceed.',
        });
      }

      // Force termination requested - execute offboarding
      if (!terminationReason) {
        return NextResponse.json({ 
          message: 'Termination reason is required when forcing termination' 
        }, { status: 400 });
      }

      const result = await offboardingService.executeOffboarding({
        leaseId: activeLease.id,
        departureType: terminationReason,
        departureDate: terminationDate ? new Date(terminationDate) : new Date(),
        markUnitAvailable: true,
      });

      if (!result.success) {
        return NextResponse.json({
          success: false,
          message: 'Failed to complete offboarding',
          errors: result.errors,
        }, { status: 500 });
      }

      // Fetch updated unit
      const updatedUnit = await prisma.unit.findUnique({
        where: { id: unitId },
      });

      return NextResponse.json({
        success: true,
        unit: updatedUnit,
        offboardingCompleted: true,
        tenantHistoryId: result.tenantHistoryId,
      });
    }

    // No active tenant or making unavailable - just update availability
    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: {
        isAvailable,
        availableFrom: isAvailable ? new Date() : null,
      },
    });

    // When marking a unit available, auto-publish the property if it isn't published yet
    // and has at least one photo (so Craigslist-style blank listings can't slip through)
    let autoPublished = false;
    let propertyNeedsPhotos = false;
    if (isAvailable) {
      const property = await prisma.property.findUnique({
        where: { id: unit.property!.id },
        select: { isPublished: true, units: { select: { images: true } } },
      });
      if (property && !property.isPublished) {
        const hasPhotos = property.units.some(u => u.images && u.images.length > 0);
        if (hasPhotos) {
          await prisma.property.update({
            where: { id: unit.property!.id },
            data: { isPublished: true },
          });
          autoPublished = true;
        } else {
          propertyNeedsPhotos = true;
        }
      }
    }

    return NextResponse.json({
      success: true,
      unit: updatedUnit,
      autoPublished,
      propertyNeedsPhotos,
      requiresConfirmation: false,
    });
  } catch (error) {
    console.error('Update unit availability error:', error);
    return NextResponse.json({ message: 'Failed to update unit availability' }, { status: 500 });
  }
}
