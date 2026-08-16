import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// DELETE - Soft delete a thread for the current user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = params;

    // Update the participant record to mark as deleted
    await prisma.threadParticipant.updateMany({
      where: {
        threadId,
        userId: session.user.id,
      },
      data: {
        isDeleted: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thread:', error);
    return NextResponse.json(
      { error: 'Failed to delete thread' },
      { status: 500 }
    );
  }
}

// PATCH - Update thread (archive, move to folder)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = params;
    const body = await req.json();
    const { isArchived, folderId } = body;

    // Verify user is a participant
    const participant = await prisma.threadParticipant.findFirst({
      where: {
        threadId,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Update thread
    const updateData: any = {};
    if (typeof isArchived === 'boolean') {
      updateData.isArchived = isArchived;
    }
    if (folderId !== undefined) {
      updateData.folderId = folderId;
    }

    const updatedThread = await prisma.thread.update({
      where: { id: threadId },
      data: updateData,
    });

    return NextResponse.json({ success: true, thread: updatedThread });
  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    );
  }
}
