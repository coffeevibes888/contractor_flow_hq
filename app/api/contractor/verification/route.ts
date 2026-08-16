import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * GET - Get contractor verification status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const verification = await prisma.contractorVerification.findUnique({
      where: { contractorId: contractorProfile.id },
      include: {
        reviewer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const documents = await prisma.contractorVerificationDocument.findMany({
      where: { contractorId: contractorProfile.id },
      orderBy: { uploadedAt: 'desc' },
      include: {
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      verification,
      documents,
    });
  } catch (error) {
    console.error('Error fetching verification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}
