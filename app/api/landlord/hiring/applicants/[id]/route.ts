import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// Update applicant status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    // Verify applicant belongs to landlord
    const applicant = await prisma.jobApplicant.findFirst({
      where: { id, landlordId: landlord.id },
    });

    if (!applicant) {
      return NextResponse.json({ success: false, message: 'Applicant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, notes } = body;

    const updatedApplicant = await prisma.jobApplicant.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({
      success: true,
      applicant: updatedApplicant,
    });
  } catch (error) {
    console.error('Update applicant error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update applicant' }, { status: 500 });
  }
}
