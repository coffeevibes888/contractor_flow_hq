/**
 * GET    /api/contractor/jobs/[id]/notes  — list notes for a job
 * POST   /api/contractor/jobs/[id]/notes  — add a note to a job
 * DELETE /api/contractor/jobs/[id]/notes?noteId=xxx — remove a note
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

const VALID_TYPES = ['general', 'issue', 'update', 'customer_communication'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const db = prisma as any;

    // Verify job belongs to this contractor
    const job = await db.contractorJob.findFirst({
      where: { id, contractorId: contractorAuth.contractorId },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const notes = await db.contractorJobNote.findMany({
      where: { jobId: id, contractorId: contractorAuth.contractorId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('[GET job notes]', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const db = prisma as any;

    // Verify job belongs to this contractor
    const job = await db.contractorJob.findFirst({
      where: { id, contractorId: contractorAuth.contractorId },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await req.json();
    const content: string = (body.content ?? '').trim();
    const type: string = VALID_TYPES.includes(body.type) ? body.type : 'general';
    const isInternal: boolean = body.isInternal !== false;

    if (!content) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    const note = await db.contractorJobNote.create({
      data: {
        contractorId: contractorAuth.contractorId,
        jobId: id,
        authorId: session.user.id,
        content,
        type,
        isInternal,
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('[POST job notes]', error);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');
    if (!noteId) {
      return NextResponse.json({ error: 'noteId required' }, { status: 400 });
    }

    const db = prisma as any;
    await db.contractorJobNote.deleteMany({
      where: { id: noteId, contractorId: contractorAuth.contractorId, jobId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE job notes]', error);
    return NextResponse.json({ error: 'Failed to remove note' }, { status: 500 });
  }
}
