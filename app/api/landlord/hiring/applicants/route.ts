import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// Get all applicants for landlord
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const applicants = await prisma.jobApplicant.findMany({
      where: { landlordId: landlord.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        job: { select: { title: true } },
      },
    });

    return NextResponse.json({
      success: true,
      applicants: applicants.map(a => ({
        id: a.id,
        jobId: a.jobId,
        jobTitle: a.job.title,
        name: a.name,
        email: a.email,
        phone: a.phone,
        resumeUrl: a.resumeUrl,
        coverLetter: a.coverLetter,
        status: a.status,
        notes: a.notes,
        appliedAt: a.appliedAt,
      })),
    });
  } catch (error) {
    console.error('Get applicants error:', error);
    return NextResponse.json({ success: false, message: 'Failed to get applicants' }, { status: 500 });
  }
}
