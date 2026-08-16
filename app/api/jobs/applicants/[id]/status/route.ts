import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

const ALLOWED_STATUSES = [
  'new',
  'reviewing',
  'interview',
  'offered',
  'hired',
  'rejected',
  'withdrawn',
];

// PATCH /api/jobs/applicants/[id]/status
// Employer updates application status. Also handles optional rejection reason / offer data.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status, rejectionReason, offerAmount, offerMessage, notes } = body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const applicant = await prisma.jobApplicant.findUnique({
      where: { id },
      include: { job: { select: { userId: true, landlordId: true, title: true } } },
    });
    if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Authorisation: only the user who posted the job (or applicant self for withdraw) can change status
    const isEmployer = applicant.job.userId === session.user.id;
    const isSelfWithdraw = status === 'withdrawn' && applicant.userId === session.user.id;
    if (!isEmployer && !isSelfWithdraw) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.jobApplicant.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason || null : null,
        offerAmount: status === 'offered' && offerAmount ? offerAmount : null,
        offerMessage: status === 'offered' ? offerMessage || null : null,
        notes: notes !== undefined ? notes : undefined,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    });

    // Post a system message to the thread
    const systemMsg =
      status === 'rejected'
        ? `Application was declined.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`
        : status === 'offered'
        ? `Offer extended${offerAmount ? ' at $' + offerAmount : ''}.`
        : status === 'hired'
        ? `${applicant.name} was hired! 🎉`
        : status === 'withdrawn'
        ? `${applicant.name} withdrew their application.`
        : `Application status updated to "${status}".`;

    await prisma.jobApplicantMessage.create({
      data: {
        applicantId: id,
        senderRole: 'system',
        senderId: session.user.id,
        content: systemMsg,
      },
    });

    return NextResponse.json({ success: true, applicant: updated });
  } catch (err) {
    console.error('Status update failed', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
