import { prisma } from '@/db/prisma';
import {
  rankContractors,
  type RankableContractor,
  CANONICAL_SPECIALTIES,
} from '@/lib/services/contractor-ranking';
import type { Prisma } from '@prisma/client';

/**
 * Shared data loader for the contractor marketplace.
 *
 * Both `app/contractor-marketplace/page.tsx` (canonical) and the legacy
 * `app/contractors/page.tsx` used to contain identical ~180-line copies of
 * this logic. It now lives here once: fetch public ContractorProfiles, map
 * them into RankableContractor, rank, apply the optional sort override, and
 * shape the result for the ContractorMarketplace UI.
 */

export interface MarketplaceSearchParams {
  q?: string;
  specialty?: string;
  location?: string;
  sort?: string;
  view?: string;
}

export interface MarketplaceContractor {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  isPaymentReady: boolean;
  completedJobs: number;
  rating: number;
  responseTime: string;
  user: { id: string; name: string | null; image: string | null } | null;
  profilePhoto: string | null;
  coverPhoto: string | null;
  tagline: string | null;
  baseCity: string | null;
  baseState: string | null;
  hourlyRate: number | null;
  yearsExperience: number | null;
  slug: string | null;
  source: 'profile' | 'contractor';
  meritScore?: number;
  isSponsored?: boolean;
  isNew?: boolean;
  isBoosted?: boolean;
}

export interface MarketplaceData {
  contractors: MarketplaceContractor[];
  openJobsCount: number;
  normalizedSpecialty: string | undefined;
}

export async function loadMarketplaceContractors(
  params: MarketplaceSearchParams,
): Promise<MarketplaceData> {
  const { q, specialty, sort } = params;

  const normalizedSpecialty = specialty
    ? CANONICAL_SPECIALTIES.find((s) => s.toLowerCase() === specialty.toLowerCase()) || specialty
    : undefined;

  // ── ContractorProfile (the modern, showcased contractors) ──────────────
  const profileWhere: Prisma.ContractorProfileWhereInput = { isPublic: true, acceptingNewWork: true };
  if (normalizedSpecialty) {
    profileWhere.specialties = { hasSome: specialtyVariants(normalizedSpecialty) };
  }
  if (q) {
    profileWhere.OR = [
      { businessName: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
      { tagline: { contains: q, mode: 'insensitive' } },
      { bio: { contains: q, mode: 'insensitive' } },
      { specialties: { hasSome: [q, q.toLowerCase(), q.toUpperCase()] } },
      { baseCity: { contains: q, mode: 'insensitive' } },
      { baseState: { contains: q, mode: 'insensitive' } },
    ];
  }

  const contractorProfiles = await prisma.contractorProfile.findMany({
    where: profileWhere,
    include: { user: { select: { id: true, name: true, image: true } } },
    take: 50,
  });

  // Public contractor marketplace profiles are the single source of truth.
  const profileResults: RankableContractor[] = contractorProfiles.map((c) => ({
    id: c.id,
    avgRating: c.avgRating || 0,
    totalReviews: c.totalReviews || 0,
    completedJobs: c.completedJobs || 0,
    responseRate: c.responseRate || 0,
    onTimeRate: c.onTimeRate || 0,
    identityVerified: c.identityVerified,
    insuranceVerified: c.insuranceVerified,
    backgroundChecked: c.backgroundChecked,
    profilePhoto: c.profilePhoto || null,
    coverPhoto: c.coverPhoto || null,
    bio: c.bio || null,
    tagline: c.tagline || null,
    specialties: c.specialties,
    baseCity: c.baseCity || null,
    baseState: c.baseState || null,
    featuredUntil: c.featuredUntil || null,
    visibilityCredits: c.visibilityCredits || 0,
    newContractorBoostUntil: c.newContractorBoostUntil || null,
    lastActiveAt: c.lastActiveAt || null,
    createdAt: c.createdAt,
    name: c.displayName || c.businessName,
    email: c.email,
    isPaymentReady: c.identityVerified && c.insuranceVerified,
    user: c.user ? { id: c.user.id, name: c.user.name, image: c.profilePhoto || c.user.image } : null,
    coverPhotoDisplay: c.coverPhoto || null,
    taglineDisplay: c.tagline || null,
    baseCity2: c.baseCity || null,
    baseState2: c.baseState || null,
    hourlyRate: c.hourlyRate ? parseFloat(c.hourlyRate.toString()) : null,
    yearsExperience: c.yearsExperience || null,
    slug: c.slug,
    source: 'profile' as const,
    responseTime: c.responseRate > 90 ? '< 1 hour' : c.responseRate > 70 ? '< 4 hours' : '< 24 hours',
  }));

  let ranked = rankContractors(profileResults);

  if (sort === 'rating') {
    const sponsored = ranked.filter((c) => c.isSponsored);
    const organic = ranked.filter((c) => !c.isSponsored).sort((a, b) => b.avgRating - a.avgRating);
    ranked = [...sponsored, ...organic];
  } else if (sort === 'jobs') {
    const sponsored = ranked.filter((c) => c.isSponsored);
    const organic = ranked.filter((c) => !c.isSponsored).sort((a, b) => b.completedJobs - a.completedJobs);
    ranked = [...sponsored, ...organic];
  }

  const contractors: MarketplaceContractor[] = ranked.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    specialties: c.specialties,
    isPaymentReady: c.isPaymentReady,
    completedJobs: c.completedJobs,
    rating: c.avgRating || 0,
    responseTime: c.responseTime,
    user: c.user,
    profilePhoto: c.profilePhoto,
    coverPhoto: c.coverPhotoDisplay,
    tagline: c.taglineDisplay,
    baseCity: c.baseCity2,
    baseState: c.baseState2,
    hourlyRate: c.hourlyRate,
    yearsExperience: c.yearsExperience,
    slug: c.slug,
    source: c.source,
    meritScore: c.meritScore,
    isSponsored: c.isSponsored,
    isNew: c.isNew,
    isBoosted: c.isBoosted,
  }));

  const openJobsCount = await prisma.workOrder.count({
    where: { isOpenBid: true, status: 'open' },
  });

  return { contractors, openJobsCount, normalizedSpecialty };
}

/** Case-flexible specialty variants for `hasSome` matching across stored formats. */
function specialtyVariants(specialty: string): string[] {
  return [
    specialty,
    specialty.toLowerCase(),
    specialty.toUpperCase(),
    specialty.charAt(0).toUpperCase() + specialty.slice(1).toLowerCase(),
  ];
}
