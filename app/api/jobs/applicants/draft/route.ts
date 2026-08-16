import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST /api/jobs/applicants/draft
// Creates (or returns existing) draft application for the current user on a job.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in to apply' }, { status: 401 });
    }

    const body = await req.json();
    const { jobId } = body;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, landlordId: true },
    });
    if (!job || job.status !== 'active') {
      return NextResponse.json(
        { error: 'Job not found or no longer accepting applications' },
        { status: 404 },
      );
    }

    // Look for existing non-terminal application
    const existing = await prisma.jobApplicant.findFirst({
      where: {
        jobId,
        userId: session.user.id,
      },
      orderBy: { appliedAt: 'desc' },
    });

    if (existing && existing.status !== 'withdrawn' && existing.status !== 'rejected') {
      // If it's still a draft, resume; otherwise report already applied
      if (existing.status === 'draft') {
        return NextResponse.json({
          success: true,
          applicantId: existing.id,
          draft: hydrateFromRow(existing),
        });
      }
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 409 },
      );
    }

    const applicant = await prisma.jobApplicant.create({
      data: {
        jobId,
        landlordId: job.landlordId,
        userId: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
        status: 'draft',
      },
    });

    return NextResponse.json({ success: true, applicantId: applicant.id, draft: null });
  } catch (err) {
    console.error('Draft create failed', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function hydrateFromRow(row: any) {
  return {
    fullName: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    dateOfBirth: row.dateOfBirth || '',
    ssn: row.ssnLast4 ? `***-**-${row.ssnLast4}` : '',
    addressLine1: row.addressLine1 || '',
    addressLine2: row.addressLine2 || '',
    city: row.city || '',
    stateRegion: row.stateRegion || '',
    postalCode: row.postalCode || '',
    workAuth: row.workAuth || '',
    requiresSponsorship: row.requiresSponsorship || false,
    yearsExperience: row.yearsExperience?.toString() || '',
    workHistory: row.workHistory || [],
    education: row.education || [],
    references: row.references || [],
    skills: row.skills || [],
    certifications: row.certifications || [],
    documents: row.documents || [],
    coverLetter: row.coverLetter || '',
    backgroundCheckConsent: row.backgroundCheckConsent || false,
    creditCheckConsent: row.creditCheckConsent || false,
    signatureUrl: row.signatureUrl || '',
    signedName: row.signedName || '',
  };
}
