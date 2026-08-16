import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// Update a job posting
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    // Verify job belongs to landlord
    const job = await prisma.jobPosting.findFirst({
      where: { id, landlordId: landlord.id },
    });

    if (!job) {
      return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, type, location, salary, requirements, benefits, status } = body;

    const updatedJob = await prisma.jobPosting.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(type && { type }),
        ...(location && { location }),
        ...(salary !== undefined && { salary }),
        ...(requirements !== undefined && { requirements }),
        ...(benefits !== undefined && { benefits }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error) {
    console.error('Update job error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update job' }, { status: 500 });
  }
}

// Delete a job posting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    // Verify job belongs to landlord
    const job = await prisma.jobPosting.findFirst({
      where: { id, landlordId: landlord.id },
    });

    if (!job) {
      return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 });
    }

    // Delete job (cascades to applicants)
    await prisma.jobPosting.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Job deleted',
    });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete job' }, { status: 500 });
  }
}
