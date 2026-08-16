import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma as db } from '@/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all applications for the current user
    const applications = await db.rentalApplication.findMany({
      where: {
        applicantId: session.user.id,
      },
      include: {
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        verification: {
          select: {
            id: true,
            identityStatus: true,
            employmentStatus: true,
            overallStatus: true,
            completedAt: true,
            monthlyIncome: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      applications,
      count: applications.length,
    });
  } catch (error: any) {
    console.error('Get user applications error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve applications' },
      { status: 500 }
    );
  }
}
