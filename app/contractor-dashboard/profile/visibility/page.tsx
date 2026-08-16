import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/db/prisma';
import { getProfileCompletion, calculateMeritScore, type RankableContractor } from '@/lib/services/contractor-ranking';
import { VISIBILITY_PACKAGES } from '@/app/api/contractor/visibility/purchase/route';
import VisibilityClient from './visibility-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace Visibility | Contractor Dashboard',
};

export default async function ContractorVisibilityPage({
  searchParams,
}: {
  searchParams?: Promise<{ boost?: string; package?: string; session_id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');
  // Marketplace visibility is owner-only — paying for boosts is a billing
  // decision that should never be exposed to an employee.
  if (session.user.role === 'contractor_employee') redirect('/contractor-dashboard');
  if (session.user.role !== 'contractor') redirect('/');

  const params = (await searchParams) || {};

  // If returning from a successful Stripe checkout, confirm the payment server-side
  // This is a safety net in case the webhook hasn't fired yet
  if (params.boost === 'success' && params.session_id) {
    try {
      const profile = await getContractorProfileForUser(session.user.id, { id: true });
      if (profile) {
        const checkoutSession = await (await import('@/lib/stripe')).stripe.checkout.sessions.retrieve(params.session_id);
        if (
          checkoutSession.payment_status === 'paid' &&
          checkoutSession.metadata?.type === 'visibility_boost' &&
          checkoutSession.metadata?.contractorProfileId === profile.id
        ) {
          const credits = parseInt(checkoutSession.metadata?.credits || '0', 10);
          if (credits > 0) {
            // Use upsert-style update — safe to call multiple times
            await prisma.contractorProfile.update({
              where: { id: profile.id },
              data: {
                visibilityCredits: { increment: credits },
                featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
          }
        }
      }
    } catch (e) {
      // Non-fatal — webhook will handle it if this fails
      console.error('Visibility confirm error:', e);
    }
  }

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      displayName: true,
      businessName: true,
      profilePhoto: true,
      coverPhoto: true,
      bio: true,
      tagline: true,
      specialties: true,
      baseCity: true,
      baseState: true,
      phone: true,
      hourlyRate: true,
      identityVerified: true,
      insuranceVerified: true,
      avgRating: true,
      totalReviews: true,
      completedJobs: true,
      responseRate: true,
      onTimeRate: true,
      backgroundChecked: true,
      lastActiveAt: true,
      visibilityCredits: true,
      featuredUntil: true,
      newContractorBoostUntil: true,
      createdAt: true,
      isPublic: true,
      acceptingNewWork: true,
    },
  });

  if (!profile) redirect('/onboarding/contractor');

  const { score, missing } = getProfileCompletion(profile);
  const now = new Date();
  const hasActiveBoost =
    (profile.featuredUntil && profile.featuredUntil > now) ||
    (profile.newContractorBoostUntil && profile.newContractorBoostUntil > now) ||
    profile.visibilityCredits > 0;

  const isNewMember =
    (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24) < 30;

  // Calculate the actual merit score with per-factor breakdown
  const rankable: RankableContractor = {
    id: profile.id,
    avgRating: profile.avgRating,
    totalReviews: profile.totalReviews,
    completedJobs: profile.completedJobs,
    responseRate: profile.responseRate ?? 0,
    onTimeRate: profile.onTimeRate ?? 0,
    identityVerified: profile.identityVerified,
    insuranceVerified: profile.insuranceVerified,
    backgroundChecked: profile.backgroundChecked ?? false,
    profilePhoto: profile.profilePhoto,
    coverPhoto: profile.coverPhoto,
    bio: profile.bio,
    tagline: profile.tagline,
    specialties: profile.specialties,
    baseCity: profile.baseCity,
    baseState: profile.baseState,
    featuredUntil: profile.featuredUntil,
    visibilityCredits: profile.visibilityCredits,
    newContractorBoostUntil: profile.newContractorBoostUntil,
    lastActiveAt: profile.lastActiveAt,
    createdAt: profile.createdAt,
    name: '', email: '', isPaymentReady: false, user: null,
    coverPhotoDisplay: null, taglineDisplay: null, baseCity2: null,
    baseState2: null, hourlyRate: null, yearsExperience: null,
    slug: null, source: 'profile', responseTime: '',
  };

  const meritScore = calculateMeritScore(rankable);

  // Calculate per-factor scores for the breakdown
  const bayesianRating = (profile.totalReviews * profile.avgRating + 5 * 3.5) / (profile.totalReviews + 5);
  const ratingScore = Math.round(((bayesianRating - 1) / 4) * 25);
  const logNorm = (v: number, max: number) => v <= 0 ? 0 : Math.min(Math.log1p(v) / Math.log1p(max), 1);
  const reviewScore = Math.round(logNorm(profile.totalReviews, 200) * 15);
  const jobScore = Math.round(logNorm(profile.completedJobs, 500) * 15);
  const responseScore = Math.round(((profile.responseRate ?? 0) / 100) * 15);
  const completenessScore = Math.round((score / 100) * 10);
  const trustPoints = (profile.identityVerified ? 4 : 0) + (profile.insuranceVerified ? 4 : 0) + ((profile.backgroundChecked ?? false) ? 2 : 0);
  const trustScore = Math.round((trustPoints / 10) * 10);
  const onTimeScore = Math.round(((profile.onTimeRate ?? 0) / 100) * 5);
  const ref = profile.lastActiveAt || profile.createdAt;
  const daysSince = (Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24);
  const recencyVal = daysSince <= 30 ? 1 : daysSince >= 90 ? 0 : 1 - (daysSince - 30) / 60;
  const recencyScore = Math.round(recencyVal * 5);

  const scoreBreakdown = [
    { key: 'rating', earned: ratingScore, max: 25 },
    { key: 'reviews', earned: reviewScore, max: 15 },
    { key: 'jobs', earned: jobScore, max: 15 },
    { key: 'response', earned: responseScore, max: 15 },
    { key: 'completeness', earned: completenessScore, max: 10 },
    { key: 'trust', earned: trustScore, max: 10 },
    { key: 'ontime', earned: onTimeScore, max: 5 },
    { key: 'recency', earned: recencyScore, max: 5 },
  ];

  // Estimate rank position among all public contractors
  const totalPublicContractors = await prisma.contractorProfile.count({
    where: { isPublic: true, acceptingNewWork: true },
  });
  const contractorsAbove = await prisma.contractorProfile.count({
    where: {
      isPublic: true,
      acceptingNewWork: true,
      rankScore: { gt: meritScore },
    },
  });
  const rankPosition = totalPublicContractors > 0 ? contractorsAbove + 1 : 1;
  const rankPercentile = totalPublicContractors > 1
    ? Math.round(((totalPublicContractors - rankPosition) / (totalPublicContractors - 1)) * 100)
    : 100;

  // Check if new-member boost is still active (blocks purchasing)
  const newBoostActive = profile.newContractorBoostUntil != null && profile.newContractorBoostUntil > now;
  const newBoostDaysLeft = newBoostActive
    ? Math.ceil((profile.newContractorBoostUntil!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <VisibilityClient
      profile={{
        id: profile.id,
        name: profile.displayName || profile.businessName,
        completionScore: score,
        missingItems: missing,
        visibilityCredits: profile.visibilityCredits,
        featuredUntil: profile.featuredUntil?.toISOString() || null,
        newContractorBoostUntil: profile.newContractorBoostUntil?.toISOString() || null,
        hasActiveBoost,
        isNewMember,
        isPublic: profile.isPublic,
        acceptingNewWork: profile.acceptingNewWork,
        avgRating: profile.avgRating,
        totalReviews: profile.totalReviews,
        completedJobs: profile.completedJobs,
        meritScore,
        scoreBreakdown,
        rankPosition,
        rankPercentile,
        totalContractors: totalPublicContractors,
        newBoostActive,
        newBoostDaysLeft,
        responseRate: profile.responseRate ?? 0,
        onTimeRate: profile.onTimeRate ?? 0,
        identityVerified: profile.identityVerified,
        insuranceVerified: profile.insuranceVerified,
        backgroundChecked: profile.backgroundChecked ?? false,
      }}
      packages={VISIBILITY_PACKAGES as any}
      boostResult={params.boost || null}
    />
  );
}
