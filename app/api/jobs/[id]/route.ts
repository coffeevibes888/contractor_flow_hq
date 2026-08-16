import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

// GET /api/jobs/[id] - Fetch a single job posting
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        _count: { select: { applicants: true, reviews: true } },
        reviews: {
          where: { status: 'published' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Increment view count
    await prisma.jobPosting.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Failed to fetch job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
