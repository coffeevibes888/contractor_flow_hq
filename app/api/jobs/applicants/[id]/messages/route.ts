import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/jobs/applicants/[id]/messages - List messages in order
// POST /api/jobs/applicants/[id]/messages - Send a message (applicant or employer)

async function authorize(id: string, userId: string) {
  const applicant = await prisma.jobApplicant.findUnique({
    where: { id },
    include: { job: { select: { userId: true } } },
  });
  if (!applicant) return { error: 'Not found', status: 404 } as const;
  const isEmployer = applicant.job.userId === userId;
  const isApplicant = applicant.userId === userId;
  if (!isEmployer && !isApplicant) {
    return { error: 'Forbidden', status: 403 } as const;
  }
  return { applicant, role: (isEmployer ? 'employer' : 'applicant') as 'employer' | 'applicant' };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await authorize(id, session.user.id);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const messages = await prisma.jobApplicantMessage.findMany({
      where: { applicantId: id },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages from the OTHER party as read
    await prisma.jobApplicantMessage.updateMany({
      where: {
        applicantId: id,
        readAt: null,
        NOT: { senderRole: result.role },
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true, messages, role: result.role });
  } catch (err) {
    console.error('List messages failed', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const body = await req.json();
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const result = await authorize(id, session.user.id);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const msg = await prisma.jobApplicantMessage.create({
      data: {
        applicantId: id,
        senderId: session.user.id,
        senderRole: result.role,
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, message: msg });
  } catch (err) {
    console.error('Send message failed', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
