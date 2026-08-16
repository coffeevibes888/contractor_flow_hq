import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * Single contractor portfolio item.
 *
 *   GET    /api/contractor/portfolio/:id  — fetch one (owner only)
 *   PATCH  /api/contractor/portfolio/:id  — update editable fields
 *   DELETE /api/contractor/portfolio/:id  — remove the item
 *
 * All operations are scoped to the authenticated contractor's own profile
 * so one contractor can't read or mutate another's work.
 */

async function getOwnedItem(userId: string, itemId: string) {
  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!contractorProfile) return { error: 'profile' as const };

  const item = await prisma.contractorPortfolioItem.findFirst({
    where: { id: itemId, contractorId: contractorProfile.id },
  });
  if (!item) return { error: 'notfound' as const };

  return { item, contractorId: contractorProfile.id };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getOwnedItem(session.user.id, id);
    if (result.error === 'profile') {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (result.error === 'notfound') {
      return NextResponse.json({ error: 'Portfolio item not found' }, { status: 404 });
    }

    return NextResponse.json({ item: result.item });
  } catch (error) {
    console.error('Error fetching portfolio item:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio item' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getOwnedItem(session.user.id, id);
    if (result.error === 'profile') {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (result.error === 'notfound') {
      return NextResponse.json({ error: 'Portfolio item not found' }, { status: 404 });
    }

    const body = await request.json();

    // Only allow a known set of fields to be updated.
    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string') data.title = body.title;
    if (typeof body.description === 'string') data.description = body.description;
    if (typeof body.category === 'string') data.category = body.category;
    if (Array.isArray(body.images)) data.images = body.images;
    if (typeof body.videoUrl === 'string' || body.videoUrl === null) data.videoUrl = body.videoUrl;
    if (typeof body.location === 'string' || body.location === null) data.location = body.location;
    if (body.projectDate !== undefined) {
      data.projectDate = body.projectDate ? new Date(body.projectDate) : null;
    }
    if (body.budget !== undefined) {
      data.budget = body.budget != null && body.budget !== '' ? parseFloat(body.budget) : null;
    }
    if (body.duration !== undefined) {
      data.duration = body.duration != null && body.duration !== '' ? parseInt(body.duration) : null;
    }
    if (Array.isArray(body.tags)) data.tags = body.tags;
    if (typeof body.featured === 'boolean') data.featured = body.featured;
    if (typeof body.isPublic === 'boolean') data.isPublic = body.isPublic;

    const updated = await prisma.contractorPortfolioItem.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item: updated, message: 'Portfolio item updated' });
  } catch (error) {
    console.error('Error updating portfolio item:', error);
    return NextResponse.json({ error: 'Failed to update portfolio item' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getOwnedItem(session.user.id, id);
    if (result.error === 'profile') {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (result.error === 'notfound') {
      return NextResponse.json({ error: 'Portfolio item not found' }, { status: 404 });
    }

    await prisma.contractorPortfolioItem.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Portfolio item deleted' });
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    return NextResponse.json({ error: 'Failed to delete portfolio item' }, { status: 500 });
  }
}
