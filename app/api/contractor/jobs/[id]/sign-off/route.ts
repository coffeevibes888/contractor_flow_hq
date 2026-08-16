/**
 * GET  /api/contractor/jobs/[id]/sign-off  — fetch any existing completion sign-off
 * POST /api/contractor/jobs/[id]/sign-off   — record a customer sign-off signature
 *
 * Stores the signature as a `completion` ContractorJobPhoto (so it shows up in
 * the photo timeline) and logs a customer_communication note. Optionally marks
 * the job complete.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

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

    const signOff = await db.contractorJobPhoto.findFirst({
      where: {
        jobId: id,
        contractorId: contractorAuth.contractorId,
        category: 'completion',
        tags: { has: 'signature' },
      },
      orderBy: { takenAt: 'desc' },
    });

    return NextResponse.json({ signOff: signOff ?? null });
  } catch (error) {
    console.error('[GET sign-off]', error);
    return NextResponse.json({ error: 'Failed to fetch sign-off' }, { status: 500 });
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

    const job = await db.contractorJob.findFirst({
      where: { id, contractorId: contractorAuth.contractorId },
      select: { id: true, status: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await req.json();
    const signatureUrl: string = (body.signatureUrl ?? '').trim();
    const signerName: string = (body.signerName ?? '').trim();
    const markComplete: boolean = body.markComplete === true;

    if (!signatureUrl) {
      return NextResponse.json({ error: 'A signature is required' }, { status: 400 });
    }
    if (!signerName) {
      return NextResponse.json({ error: 'Signer name is required' }, { status: 400 });
    }

    const photo = await db.contractorJobPhoto.create({
      data: {
        contractorId: contractorAuth.contractorId,
        jobId: id,
        url: signatureUrl,
        caption: `Signed off by ${signerName}`,
        category: 'completion',
        tags: ['signature', 'sign-off'],
        visibleToCustomer: true,
        takenBy: contractorAuth.employeeId ?? null,
      },
    });

    // Log a note for the activity timeline
    await db.contractorJobNote.create({
      data: {
        contractorId: contractorAuth.contractorId,
        jobId: id,
        authorId: session.user.id,
        content: `Customer ${signerName} signed off on the completed work.`,
        type: 'customer_communication',
        isInternal: false,
        attachments: [signatureUrl],
      },
    });

    if (markComplete && !['completed', 'invoiced', 'paid'].includes(job.status)) {
      await db.contractorJob.update({
        where: { id },
        data: { status: 'completed', actualEndDate: new Date() },
      });
    }

    return NextResponse.json({ signOff: photo }, { status: 201 });
  } catch (error) {
    console.error('[POST sign-off]', error);
    return NextResponse.json({ error: 'Failed to record sign-off' }, { status: 500 });
  }
}
