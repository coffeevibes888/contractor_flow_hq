import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/jobs/reviews?company=CompanyName - Fetch company reviews
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company');
    const jobId = searchParams.get('jobId');

    if (!company && !jobId) {
      return NextResponse.json({ error: 'Company name or job ID required' }, { status: 400 });
    }

    const where: any = { status: 'published' };
    if (company) where.companyName = { equals: company, mode: 'insensitive' };
    if (jobId) where.jobId = jobId;

    const reviews = await prisma.companyReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({ success: true, reviews, avgRating, total: reviews.length });
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/jobs/reviews - Submit a company review
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, companyName, rating, title, review, pros, cons, isAnonymous } = body;

    if (!companyName || !rating || !title || !review) {
      return NextResponse.json({ error: 'Company name, rating, title, and review are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const newReview = await prisma.companyReview.create({
      data: {
        jobId: jobId || null,
        companyName,
        userId: session.user.id,
        rating,
        title,
        review,
        pros,
        cons,
        isAnonymous: isAnonymous || false,
      },
    });

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    console.error('Failed to create review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
