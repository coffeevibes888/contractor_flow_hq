/**
 * Admin Lease API
 * 
 * GET /api/admin/leases/[id] - Get lease details
 * PUT /api/admin/leases/[id] - Update lease terms (with immutability check)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { updateLeaseTerms, checkLeaseImmutability } from '@/lib/services/lease.service';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: leaseId } = await context.params;

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: {
          select: { id: true, name: true, email: true },
        },
        unit: {
          include: {
            property: {
              include: {
                landlord: {
                  select: { id: true, name: true, ownerUserId: true },
                },
              },
            },
          },
        },
        signatureRequests: {
          select: {
            id: true,
            role: true,
            status: true,
            signedAt: true,
            signerName: true,
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ message: 'Lease not found' }, { status: 404 });
    }

    // Check authorization - must be landlord owner or super admin
    const isLandlordOwner = lease.unit.property?.landlord?.ownerUserId === session.user.id;
    const isSuperAdmin = session.user.role === 'superAdmin';

    if (!isLandlordOwner && !isSuperAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Include immutability status
    const immutabilityStatus = await checkLeaseImmutability(leaseId);

    return NextResponse.json({
      lease,
      immutabilityStatus,
    });
  } catch (error) {
    console.error('GET /api/admin/leases/[id] error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: leaseId } = await context.params;
    const body = await req.json();

    // Get lease to check authorization
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: {
          include: {
            property: {
              include: {
                landlord: {
                  select: { id: true, ownerUserId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ message: 'Lease not found' }, { status: 404 });
    }

    // Check authorization
    const isLandlordOwner = lease.unit.property?.landlord?.ownerUserId === session.user.id;
    const isSuperAdmin = session.user.role === 'superAdmin';

    if (!isLandlordOwner && !isSuperAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Parse update fields
    const updates: {
      rentAmount?: number;
      startDate?: Date;
      endDate?: Date | null;
      billingDayOfMonth?: number;
    } = {};

    if (body.rentAmount !== undefined) {
      updates.rentAmount = Number(body.rentAmount);
    }
    if (body.startDate !== undefined) {
      updates.startDate = new Date(body.startDate);
    }
    if (body.endDate !== undefined) {
      updates.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    if (body.billingDayOfMonth !== undefined) {
      updates.billingDayOfMonth = Number(body.billingDayOfMonth);
    }

    // Update with immutability check
    const updatedLease = await updateLeaseTerms({
      leaseId,
      ...updates,
    });

    return NextResponse.json({ lease: updatedLease });
  } catch (error: any) {
    console.error('PUT /api/admin/leases/[id] error:', error);

    // Handle immutability error
    if (error.code === 'LEASE_IMMUTABLE') {
      return NextResponse.json(
        { 
          message: error.message,
          code: 'LEASE_IMMUTABLE',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
