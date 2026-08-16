/**
 * PATCH /api/contractor/subcontractors/[id]/assignments/[assignmentId]
 * Update assignment status, actual hours, final price, quality rating
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  try {
    const { id, assignmentId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;
    const body = await req.json();

    const assignment = await db.contractorSubcontractorAssignment.findFirst({
      where: { id: assignmentId, subcontractorId: id, contractorId: profile.id },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.actualHours !== undefined) updateData.actualHours = Number(body.actualHours);
    if (body.finalPrice !== undefined) updateData.finalPrice = Number(body.finalPrice);
    if (body.qualityRating !== undefined) updateData.qualityRating = Number(body.qualityRating);
    if (body.completionPhotos) updateData.completionPhotos = body.completionPhotos;
    if (body.paymentStatus) updateData.paymentStatus = body.paymentStatus;
    if (body.paymentTerms) updateData.paymentTerms = body.paymentTerms;
    if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);

    if (body.status === 'completed' && !assignment.completedDate) {
      updateData.completedDate = new Date();
    }

    const updated = await db.contractorSubcontractorAssignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        job: { select: { id: true, title: true, jobNumber: true } },
      },
    });

    // If quality rating given, update sub's average rating
    if (body.qualityRating) {
      const allAssignments = await db.contractorSubcontractorAssignment.findMany({
        where: { subcontractorId: id, qualityRating: { not: null } },
        select: { qualityRating: true },
      });
      const avg = allAssignments.reduce((s: number, a: any) => s + a.qualityRating, 0) / allAssignments.length;
      await db.contractorSubcontractor.update({
        where: { id },
        data: { rating: Math.round(avg * 100) / 100 },
      });
    }

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error('[PATCH assignment]', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  try {
    const { id, assignmentId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;
    await db.contractorSubcontractorAssignment.deleteMany({
      where: { id: assignmentId, subcontractorId: id, contractorId: profile.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE assignment]', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}
