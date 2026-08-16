import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST /api/jobs/[id]/apply - Apply to a job posting
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const session = await auth();
    const body = await req.json();

    const { name, email, phone, coverLetter, resumeUrl } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Verify job exists and is active
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, landlordId: true },
    });

    if (!job || job.status !== 'active') {
      return NextResponse.json({ error: 'Job not found or no longer accepting applications' }, { status: 404 });
    }

    // Check if already applied (by email or userId)
    const existingApplication = await prisma.jobApplicant.findFirst({
      where: {
        jobId,
        OR: [
          { email },
          ...(session?.user?.id ? [{ userId: session.user.id }] : []),
        ],
      },
    });

    if (existingApplication) {
      return NextResponse.json({ error: 'You have already applied to this job' }, { status: 409 });
    }

    const applicant = await prisma.jobApplicant.create({
      data: {
        jobId,
        landlordId: job.landlordId,
        userId: session?.user?.id || null,
        name,
        email,
        phone,
        coverLetter,
        resumeUrl,
        status: 'new',
      },
    });

    return NextResponse.json({ success: true, applicant });
  } catch (error) {
    console.error('Failed to apply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
