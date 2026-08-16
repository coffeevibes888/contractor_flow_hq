import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST /api/jobs/applicants/[id]/submit
// Finalizes a draft application with the full form data.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applicant = await prisma.jobApplicant.findUnique({ where: { id } });
    if (!applicant) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (applicant.userId && applicant.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const f = body.formData || {};

    // Minimum required
    if (!f.fullName || !f.email || !f.signatureUrl || !f.signedName) {
      return NextResponse.json(
        { error: 'Missing required fields (name, email, signature)' },
        { status: 400 },
      );
    }

    const ssnLast4 = typeof f.ssn === 'string' ? f.ssn.replace(/\D/g, '').slice(-4) : null;

    // Get IP for audit trail
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;

    const updated = await prisma.jobApplicant.update({
      where: { id },
      data: {
        name: f.fullName,
        email: f.email,
        phone: f.phone || null,
        dateOfBirth: f.dateOfBirth || null,
        ssnLast4: ssnLast4 || null,
        // NOTE: in production, ssnEncrypted should use a KMS-backed encryption.
        // For now we store nothing in ssnEncrypted until encryption util is wired.
        ssnEncrypted: null,
        addressLine1: f.addressLine1 || null,
        addressLine2: f.addressLine2 || null,
        city: f.city || null,
        stateRegion: f.stateRegion || null,
        postalCode: f.postalCode || null,
        workAuth: f.workAuth || null,
        requiresSponsorship: !!f.requiresSponsorship,
        workHistory: f.workHistory || [],
        education: f.education || [],
        references: f.references || [],
        skills: Array.isArray(f.skills) ? f.skills : [],
        certifications: Array.isArray(f.certifications) ? f.certifications : [],
        yearsExperience: f.yearsExperience ? parseInt(f.yearsExperience, 10) : null,
        documents: f.documents || [],
        coverLetter: f.coverLetter || null,
        backgroundCheckConsent: !!f.backgroundCheckConsent,
        creditCheckConsent: !!f.creditCheckConsent,
        signatureUrl: f.signatureUrl || null,
        signedName: f.signedName || null,
        signedAt: new Date(),
        signedIp: ip,
        completedAt: new Date(),
        status: 'new',
      },
    });

    // System message to start the thread between applicant & employer
    await prisma.jobApplicantMessage.create({
      data: {
        applicantId: updated.id,
        senderRole: 'system',
        content: `${updated.name} submitted an application.`,
      },
    });

    return NextResponse.json({ success: true, applicant: updated });
  } catch (err) {
    console.error('Submit failed', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
