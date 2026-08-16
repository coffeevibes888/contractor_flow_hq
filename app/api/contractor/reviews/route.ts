import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * GET - Get contractor's reviews
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractorId = searchParams.get('contractorId');

    if (!contractorId) {
      return NextResponse.json(
        { error: 'Contractor ID required' },
        { status: 400 }
      );
    }

    const reviews = await prisma.contractorReview.findMany({
      where: {
        contractorId,
        status: 'published',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average ratings
    const avgRatings = await prisma.contractorReview.aggregate({
      where: {
        contractorId,
        status: 'published',
      },
      _avg: {
        overallRating: true,
        qualityRating: true,
        communicationRating: true,
        timelinessRating: true,
        professionalismRating: true,
        valueRating: true,
      },
      _count: true,
    });

    return NextResponse.json({
      reviews,
      stats: {
        averageRating: avgRatings._avg.overallRating || 0,
        totalReviews: avgRatings._count,
        categoryAverages: {
          quality: avgRatings._avg.qualityRating || 0,
          communication: avgRatings._avg.communicationRating || 0,
          timeliness: avgRatings._avg.timelinessRating || 0,
          professionalism: avgRatings._avg.professionalismRating || 0,
          value: avgRatings._avg.valueRating || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new review
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      contractorId,
      jobId,
      overallRating,
      qualityRating,
      communicationRating,
      timelinessRating,
      professionalismRating,
      valueRating,
      title,
      comment,
      projectType,
      projectCost,
    } = body;

    if (!contractorId || !overallRating || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate rating range
    if (overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this contractor
    const existingReview = await prisma.contractorReview.findFirst({
      where: {
        contractorId,
        customerId: session.user.id,
        jobId: jobId || undefined,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this contractor for this job' },
        { status: 400 }
      );
    }

    // Verify job if provided
    let verified = false;
    if (jobId) {
      const job = await prisma.homeownerWorkOrder.findFirst({
        where: {
          id: jobId,
          homeownerId: session.user.id,
          status: 'completed',
        },
      });
      verified = !!job;
    }

    const review = await prisma.contractorReview.create({
      data: {
        contractorId,
        customerId: session.user.id,
        jobId: jobId || null,
        overallRating: parseFloat(overallRating),
        qualityRating: qualityRating ? parseFloat(qualityRating) : null,
        communicationRating: communicationRating
          ? parseFloat(communicationRating)
          : null,
        timelinessRating: timelinessRating ? parseFloat(timelinessRating) : null,
        professionalismRating: professionalismRating
          ? parseFloat(professionalismRating)
          : null,
        valueRating: valueRating ? parseFloat(valueRating) : null,
        title: title || null,
        comment,
        projectType: projectType || null,
        projectCost: projectCost ? parseFloat(projectCost) : null,
        verified,
        status: 'published',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Update contractor's average rating
    const avgRating = await prisma.contractorReview.aggregate({
      where: {
        contractorId,
        status: 'published',
      },
      _avg: {
        overallRating: true,
      },
      _count: true,
    });

    await prisma.contractorProfile.update({
      where: { id: contractorId },
      data: {
        avgRating: avgRating._avg.overallRating ? Number(avgRating._avg.overallRating) : 0,
        totalReviews: avgRating._count,
      },
    });

    return NextResponse.json({
      review,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
