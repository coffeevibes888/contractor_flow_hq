/**
 * GET  /api/contractor/subcontractors/[id]/assignments  — list job assignments
 * POST /api/contractor/subcontractors/[id]/assignments  — create new assignment
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;

    const assignments = await db.contractorSubcontractorAssignment.findMany({
      where: { subcontractorId: id, contractorId: profile.id },
      include: {
        job: {
          select: {
            id: true, title: true, jobNumber: true, status: true,
            address: true, city: true, state: true,
            estimatedStartDate: true, estimatedEndDate: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('[GET assignments]', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;

    // Verify sub belongs to this contractor
    const sub = await db.contractorSubcontractor.findFirst({
      where: { id, contractorId: profile.id },
      select: { id: true, paymentTerms: true, preferredPayment: true },
    });
    if (!sub) return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 });

    const body = await req.json();
    const {
      jobId,
      scopeOfWork,
      agreedPrice,
      estimatedHours,
      startDate,
      endDate,
      paymentTerms,
      paymentMethod,
    } = body;

    if (!jobId || !scopeOfWork || !agreedPrice) {
      return NextResponse.json({ error: 'jobId, scopeOfWork, and agreedPrice are required' }, { status: 400 });
    }

    // Verify job belongs to this contractor
    const job = await db.contractorJob.findFirst({
      where: { id: jobId, contractorId: profile.id },
      select: { id: true },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const assignment = await db.contractorSubcontractorAssignment.create({
      data: {
        contractorId: profile.id,
        subcontractorId: id,
        jobId,
        scopeOfWork,
        agreedPrice: Number(agreedPrice),
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        // Per-assignment overrides for payment terms and method. Falls back
        // to whatever's set on the subcontractor record if not provided.
        paymentTerms: paymentTerms || sub.paymentTerms,
        paymentMethod: paymentMethod || sub.preferredPayment,
        status: 'assigned',
        paymentStatus: 'pending',
      },
      include: {
        job: { select: { id: true, title: true, jobNumber: true } },
      },
    });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    console.error('[POST assignment]', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
