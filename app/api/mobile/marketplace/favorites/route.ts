/**
 * GET    /api/mobile/marketplace/favorites          - list saved contractors
 * POST   /api/mobile/marketplace/favorites          - body { contractorId }
 * DELETE /api/mobile/marketplace/favorites?id=...   - unsave a contractor
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

async function getAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyMobileToken(token);
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const favorites = await prisma.favoriteContractor.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      contractor: {
        select: {
          id: true,
          slug: true,
          businessName: true,
          tagline: true,
          profilePhoto: true,
          coverPhoto: true,
          baseCity: true,
          baseState: true,
          avgRating: true,
          totalReviews: true,
          completedJobs: true,
          specialties: true,
          identityVerified: true,
          insuranceVerified: true,
          backgroundChecked: true,
        },
      },
    },
  });

  return NextResponse.json({
    favorites: favorites.map((f: any) => ({
      id: f.id,
      contractorId: f.contractorId,
      notes: f.notes,
      tags: f.tags,
      createdAt: f.createdAt.toISOString(),
      contractor: {
        id: f.contractor.id,
        slug: f.contractor.slug,
        businessName: f.contractor.businessName,
        tagline: f.contractor.tagline,
        profilePhoto: f.contractor.profilePhoto,
        coverPhoto: f.contractor.coverPhoto,
        baseCity: f.contractor.baseCity,
        baseState: f.contractor.baseState,
        avgRating: f.contractor.avgRating ?? 0,
        totalReviews: f.contractor.totalReviews ?? 0,
        completedJobs: f.contractor.completedJobs ?? 0,
        specialties: f.contractor.specialties ?? [],
        identityVerified: f.contractor.identityVerified,
        insuranceVerified: f.contractor.insuranceVerified,
        backgroundChecked: f.contractor.backgroundChecked,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { contractorId, notes, tags } = body ?? {};
  if (!contractorId) {
    return NextResponse.json({ error: 'contractorId is required' }, { status: 400 });
  }

  const exists = await prisma.contractorProfile.findFirst({
    where: { OR: [{ id: contractorId }, { slug: contractorId }] },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

  try {
    const fav = await prisma.favoriteContractor.upsert({
      where: { userId_contractorId: { userId: auth.userId, contractorId: exists.id } },
      create: {
        userId: auth.userId,
        contractorId: exists.id,
        notes: notes ?? null,
        tags: Array.isArray(tags) ? tags : [],
      },
      update: { notes: notes ?? undefined, tags: Array.isArray(tags) ? tags : undefined },
    });
    return NextResponse.json({ success: true, favorite: { id: fav.id, contractorId: fav.contractorId } });
  } catch (error: any) {
    console.error('[mobile/favorites POST]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not save favorite' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const contractorId = searchParams.get('id');
  if (!contractorId) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  await prisma.favoriteContractor.deleteMany({
    where: { userId: auth.userId, contractorId },
  });
  return NextResponse.json({ success: true });
}
