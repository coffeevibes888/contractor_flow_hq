/**
 * GET /api/partner/marketplace/contractors/[id]
 *
 * Partner bridge: return a single public contractor profile by id OR slug so
 * a trusted sister site (Property Flow HQ) can render the contractor's detail
 * / hire page. Only public-facing fields are returned.
 *
 * Protected by the shared INTERNAL_API_SECRET (x-internal-secret header).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const secret = req.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const isUUID = UUID_RE.test(id);

  try {
    const profile = await prisma.contractorProfile.findFirst({
      where: isUUID ? { OR: [{ id }, { slug: id }] } : { slug: id },
      include: {
        user: { select: { id: true, name: true, image: true, createdAt: true } },
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { customer: { select: { name: true, image: true } } },
        },
      },
    });

    if (!profile || !profile.isPublic) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Shape a public, serializable contractor object (Decimals -> numbers).
    const contractor = {
      id: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
      businessName: profile.businessName,
      tagline: profile.tagline,
      bio: profile.bio,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      profilePhoto: profile.profilePhoto,
      coverPhoto: profile.coverPhoto,
      specialties: profile.specialties,
      baseCity: profile.baseCity,
      baseState: profile.baseState,
      serviceAreas: profile.serviceAreas,
      serviceRadius: profile.serviceRadius,
      yearsExperience: profile.yearsExperience,
      hourlyRate: profile.hourlyRate ? Number(profile.hourlyRate) : null,
      licenseNumber: profile.licenseNumber,
      licenseState: profile.licenseState,
      insuranceVerified: profile.insuranceVerified,
      backgroundChecked: profile.backgroundChecked,
      identityVerified: profile.identityVerified,
      avgRating: profile.avgRating ?? 0,
      totalReviews: profile.totalReviews ?? 0,
      completedJobs: profile.completedJobs ?? 0,
      responseRate: profile.responseRate ?? 0,
      acceptingNewWork: profile.acceptingNewWork,
      portfolioImages: profile.portfolioImages ?? [],
      instantBookingEnabled: profile.instantBookingEnabled ?? false,
      depositRequired: profile.depositRequired ?? false,
      depositAmount:
        profile.depositAmount != null ? Number(profile.depositAmount) : null,
      cancellationPolicy: profile.cancellationPolicy ?? null,
      cancellationHours: profile.cancellationHours ?? null,
      memberSince: profile.user?.createdAt ?? profile.createdAt,
      user: profile.user
        ? { id: profile.user.id, name: profile.user.name, image: profile.user.image }
        : null,
      reviews: profile.reviewsReceived.map((r) => ({
        id: r.id,
        overallRating: Number(r.overallRating),
        comment: r.comment,
        createdAt: r.createdAt,
        customerName: r.customer?.name ?? null,
        customerImage: r.customer?.image ?? null,
      })),
    };

    return NextResponse.json(
      { contractor },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[partner/marketplace/contractors/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
