import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, contractorId, customerId, rating, comment } = body;

    if (!jobId || !contractorId || !customerId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the customer belongs to the user
    const customer = await prisma.contractorCustomer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if review already exists
    const existingReview = await prisma.contractorReview.findFirst({
      where: {
        jobId,
        customerId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this job' },
        { status: 400 }
      );
    }

    // Create review
    const review = await prisma.contractorReview.create({
      data: {
        contractorId,
        customerId,
        jobId,
        overallRating: Number(rating),
        comment: comment || '',
        status: 'published',
      },
    });

    // Update contractor average rating
    const allReviews = await prisma.contractorReview.findMany({
      where: { contractorId },
      select: { overallRating: true },
    });

    const avgRating =
      allReviews.reduce((sum, r) => sum + Number(r.overallRating), 0) / allReviews.length;

    await prisma.contractorProfile.update({
      where: { id: contractorId },
      data: {
        avgRating,
        totalReviews: allReviews.length,
      },
    });

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
