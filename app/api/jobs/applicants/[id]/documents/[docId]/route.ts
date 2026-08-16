import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// DELETE /api/jobs/applicants/[id]/documents/[docId]
// Removes a document from the applicant's documents array.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applicant = await prisma.jobApplicant.findUnique({ where: { id } });
    if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (applicant.userId && applicant.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = (applicant.documents as any[] | null) || [];
    await prisma.jobApplicant.update({
      where: { id },
      data: { documents: existing.filter((d) => d.id !== docId) as any },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Doc delete failed', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
