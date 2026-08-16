/**
 * GET /api/mobile/marketplace/contractors/[id]
 *
 * Full contractor profile detail for the marketplace detail screen.
 * Includes: profile, portfolio images, reviews, services, hours.
 *
 * `id` may be either the contractor profile id OR the slug (e.g. "john-smith-plumbing").
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });

    // The `id` route param may be either a UUID (the contractor profile id)
    // OR a human-readable slug (e.g. "gonzalez-electric-services"). Prisma's
    // OR with two `{ id }` and `{ slug: id }` clauses fails on non-UUID
    // strings because the id column is typed `@db.Uuid` — Postgres rejects
    // the cast and the query 500s. Detect the UUID shape and pick the right
    // clause manually so non-UUID slugs don't blow up.
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let profile: any = await prisma.contractorProfile.findFirst({
      where: looksLikeUuid ? { OR: [{ id }, { slug: id }] } : { slug: id },
      include: {
        user: { select: { id: true, name: true, image: true, email: true } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const db = prisma as any;

    // Reviews — best-effort. If a Review model exists for contractors, pull recent ones.
    let reviews: any[] = [];
    try {
      reviews = await db.contractorReview?.findMany?.({
        where: { contractorId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customerName: true,
          customerImage: true,
        },
      }) ?? [];
    } catch {
      reviews = [];
    }

    return NextResponse.json({
      contractor: {
        id: profile.id,
        slug: profile.slug ?? null,
        businessName: profile.businessName ?? profile.user?.name ?? 'Contractor',
        userName: profile.user?.name,
        userImage: profile.user?.image,
        profilePhoto: profile.profilePhoto,
        coverPhoto: profile.coverPhoto,
        heroImages: profile.heroImages ?? [],
        portfolioImages: profile.portfolioImages ?? [],
        tagline: profile.tagline,
        bio: profile.bio,
        specialties: profile.specialties ?? [],
        services: profile.services ?? [],
        baseCity: profile.baseCity,
        baseState: profile.baseState,
        serviceArea: profile.serviceArea ?? null,
        hourlyRate: profile.hourlyRate ? Number(profile.hourlyRate) : null,
        yearsExperience: profile.yearsExperience,
        avgRating: profile.avgRating ?? 0,
        totalReviews: profile.totalReviews ?? 0,
        completedJobs: profile.completedJobs ?? 0,
        responseRate: profile.responseRate ?? 0,
        responseTime: profile.responseTime ?? null,
        onTimeRate: profile.onTimeRate ?? 0,
        identityVerified: profile.identityVerified,
        insuranceVerified: profile.insuranceVerified,
        backgroundChecked: profile.backgroundChecked,
        isPaymentReady: !!profile.stripeAccountId,
        instantBookingEnabled: !!profile.instantBookingEnabled,
        depositRequired: !!profile.depositRequired,
        depositAmount: profile.depositRequired ? Number(profile.depositAmount ?? 0) : 0,
        phone: profile.phone,
        email: profile.user?.email ?? profile.email ?? null,
        websiteUrl: profile.websiteUrl,
        businessHours: profile.businessHours ?? null,
        createdAt: profile.createdAt,
      },
      reviews: reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        customerName: r.customerName ?? 'Customer',
        customerImage: r.customerImage ?? null,
      })),
    });
  } catch (error) {
    console.error('[mobile/marketplace/contractors/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
