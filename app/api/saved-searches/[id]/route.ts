import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * PATCH - Update a saved search
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, emailAlerts, alertFrequency } = body;

    // Verify ownership
    const search = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    if (search.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (emailAlerts !== undefined) updateData.emailAlerts = emailAlerts;
    if (alertFrequency !== undefined) updateData.alertFrequency = alertFrequency;

    const updatedSearch = await prisma.savedSearch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      savedSearch: updatedSearch,
      message: 'Search updated successfully',
    });
  } catch (error) {
    console.error('Error updating saved search:', error);
    return NextResponse.json(
      { error: 'Failed to update search' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a saved search
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const search = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    if (search.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Search deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return NextResponse.json(
      { error: 'Failed to delete search' },
      { status: 500 }
    );
  }
}
