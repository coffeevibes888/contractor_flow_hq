import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/contractor/profile?id=<contractorProfileId>
 * Fetch contractor profile settings (instant booking, deposit, cancellation, etc.)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('id');

    // Find by contractorId or by userId
    const profile = await prisma.contractorProfile.findFirst({
      where: contractorId
        ? { id: contractorId, userId: session.user.id }
        : { userId: session.user.id },
      select: {
        id: true,
        instantBookingEnabled: true,
        depositRequired: true,
        depositAmount: true,
        depositPercent: true,
        cancellationPolicy: true,
        cancellationHours: true,
        businessName: true,
        displayName: true,
        specialties: true,
        isAvailable: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching contractor profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PUT /api/contractor/profile
 * Update contractor profile settings (instant booking, deposit, cancellation, etc.)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      contractorId,
      instantBookingEnabled,
      depositRequired,
      depositAmount,
      depositPercent,
      cancellationPolicy,
      cancellationHours,
    } = body;

    // Verify ownership
    const profile = await prisma.contractorProfile.findFirst({
      where: contractorId
        ? { id: contractorId, userId: session.user.id }
        : { userId: session.user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Build update data — only include fields that were provided
    const updateData: Record<string, any> = {};

    if (typeof instantBookingEnabled === 'boolean') {
      updateData.instantBookingEnabled = instantBookingEnabled;
    }
    if (typeof depositRequired === 'boolean') {
      updateData.depositRequired = depositRequired;
    }
    if (depositAmount !== undefined) {
      updateData.depositAmount = depositAmount || null;
    }
    if (depositPercent !== undefined) {
      updateData.depositPercent = depositPercent || null;
    }
    if (cancellationPolicy !== undefined) {
      updateData.cancellationPolicy = cancellationPolicy;
    }
    if (cancellationHours !== undefined) {
      updateData.cancellationHours = parseInt(cancellationHours) || 24;
    }

    const updated = await prisma.contractorProfile.update({
      where: { id: profile.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error('Error updating contractor profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
