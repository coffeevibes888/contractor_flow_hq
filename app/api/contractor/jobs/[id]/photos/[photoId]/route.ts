import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

type Params = { params: { id: string; photoId: string } };

// DELETE - Remove a photo
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const db = prisma as any;
    const photo = await db.contractorJobPhoto.findFirst({
      where: {
        id: params.photoId,
        jobId: params.id,
        contractorId: contractorAuth.contractorId,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    await db.contractorJobPhoto.delete({
      where: { id: params.photoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contractor/jobs/[id]/photos/[photoId]', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}

// PATCH - Update photo metadata
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const db = prisma as any;
    const photo = await db.contractorJobPhoto.findFirst({
      where: {
        id: params.photoId,
        jobId: params.id,
        contractorId: contractorAuth.contractorId,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const body = await req.json();
    const { caption, category, visibleToCustomer, tags } = body;

    const updateData: any = {};
    if (caption !== undefined) updateData.caption = caption;
    if (category) updateData.category = category;
    if (typeof visibleToCustomer === 'boolean') updateData.visibleToCustomer = visibleToCustomer;
    if (tags) updateData.tags = tags;

    const updated = await db.contractorJobPhoto.update({
      where: { id: params.photoId },
      data: updateData,
    });

    return NextResponse.json({ success: true, photo: updated });
  } catch (error) {
    console.error('PATCH /api/contractor/jobs/[id]/photos/[photoId]', error);
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
  }
}
