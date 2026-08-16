import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

const db = prisma as any;

/**
 * POST /api/contractor/hiring/[postId]/apply
 *
 * Public endpoint — applicants submit their application here.
 * They may or may not be logged in.
 *
 * Body: {
 *   firstName, lastName, email, phone?, address?, city?, state?, zipCode?,
 *   yearsExperience?, skills?, certifications?, licenseNumber?, licenseState?,
 *   resumeUrl?, governmentIdUrl?, governmentIdBackUrl?, additionalDocs?,
 *   coverLetter?, customAnswers?
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    // Validate the hiring post exists and is active
    const post = await db.contractorHiringPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        contractorId: true,
        status: true,
        requireResume: true,
        requireId: true,
        title: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }
    if (post.status !== 'active') {
      return NextResponse.json({ error: 'This position is no longer accepting applications' }, { status: 400 });
    }

    const body = await req.json();
    const {
      firstName, lastName, email, phone, address, city, state, zipCode,
      yearsExperience, skills, certifications, licenseNumber, licenseState,
      resumeUrl, governmentIdUrl, governmentIdBackUrl, additionalDocs,
      coverLetter, customAnswers,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    // Validate required documents
    if (post.requireId && !governmentIdUrl) {
      return NextResponse.json({ error: 'Government-issued ID is required for this position' }, { status: 400 });
    }
    if (post.requireResume && !resumeUrl) {
      return NextResponse.json({ error: 'Resume is required for this position' }, { status: 400 });
    }

    // Check for duplicate application
    const existingApp = await db.contractorHiringApplication.findFirst({
      where: {
        postId,
        email: email.toLowerCase().trim(),
        status: { notIn: ['rejected', 'withdrawn'] },
      },
    });

    if (existingApp) {
      return NextResponse.json({ error: 'You have already applied for this position' }, { status: 409 });
    }

    // Check if applicant is logged in
    const session = await auth();
    const userId = session?.user?.id || null;

    const application = await db.contractorHiringApplication.create({
      data: {
        contractorId: post.contractorId,
        postId,
        userId,
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
        skills: skills || [],
        certifications: certifications || [],
        licenseNumber: licenseNumber || null,
        licenseState: licenseState || null,
        resumeUrl: resumeUrl || null,
        governmentIdUrl: governmentIdUrl || null,
        governmentIdBackUrl: governmentIdBackUrl || null,
        additionalDocs: additionalDocs || [],
        coverLetter: coverLetter || null,
        customAnswers: customAnswers || null,
        status: 'submitted',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Application submitted for ${post.title}. You will be contacted at ${email}.`,
      applicationId: application.id,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contractor/hiring/[postId]/apply', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
