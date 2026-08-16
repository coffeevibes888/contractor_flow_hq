import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * GET - Get user's favorite contractors
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const favorites = await prisma.favoriteContractor.findMany({
      where: { userId: session.user.id },
      include: {
        contractor: {
          include: {
            verification: {
              select: {
                verificationStatus: true,
                badges: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a contractor to favorites
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contractorId, notes, tags = [] } = body;

    if (!contractorId) {
      return NextResponse.json(
        { error: 'Contractor ID is required' },
        { status: 400 }
      );
    }

    // Check if contractor exists
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existing = await prisma.favoriteContractor.findUnique({
      where: {
        userId_contractorId: {
          userId: session.user.id,
          contractorId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Contractor already in favorites' },
        { status: 400 }
      );
    }

    const favorite = await prisma.favoriteContractor.create({
      data: {
        userId: session.user.id,
        contractorId,
        notes,
        tags,
      },
      include: {
        contractor: true,
      },
    });

    return NextResponse.json({
      favorite,
      message: 'Contractor added to favorites',
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}
