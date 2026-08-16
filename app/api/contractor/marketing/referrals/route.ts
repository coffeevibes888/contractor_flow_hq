import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

// GET - List all referrals
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const referrals = await prisma.contractorReferral.findMany({
      where: {
        contractorId: contractorProfile.id,
        ...(status && { status }),
      },
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ referrals });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
  }
}

// POST - Create new referral
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const body = await request.json();

    // Create referral
    const referral = await prisma.contractorReferral.create({
      data: {
        contractorId: contractorProfile.id,
        referrerId: body.referrerId,
        referredName: body.referredName,
        referredEmail: body.referredEmail,
        referredPhone: body.referredPhone,
        status: 'pending',
      },
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Emit event for referral creation
    await eventBus.emit('contractor.referral.created', {
      referralId: referral.id,
      contractorId: contractorProfile.id,
      referrerId: referral.referrerId,
      referredName: referral.referredName,
    });

    return NextResponse.json({ referral }, { status: 201 });
  } catch (error) {
    console.error('Error creating referral:', error);
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
  }
}

// PATCH - Update referral status
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { referralId, status, jobValue } = body;

    const referral = await prisma.contractorReferral.update({
      where: {
        id: referralId,
        contractorId: contractorProfile.id,
      },
      data: {
        status,
        jobValue,
        convertedAt: status === 'converted' ? new Date() : undefined,
      },
    });

    // Emit event for referral status change
    await eventBus.emit('contractor.referral.updated', {
      referralId: referral.id,
      contractorId: contractorProfile.id,
      status: referral.status,
      jobValue: referral.jobValue,
    });

    return NextResponse.json({ referral });
  } catch (error) {
    console.error('Error updating referral:', error);
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 });
  }
}
