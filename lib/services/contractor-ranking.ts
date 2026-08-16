/**
 * PropertyFlowHQ Contractor Ranking Algorithm
 *
 * Philosophy: Merit-first, money-for-reach-not-rank.
 *
 * How it works:
 * 1. Every contractor gets a composite MERIT SCORE (0–100) based on quality signals.
 * 2. The organic list is sorted by merit score — money cannot change this order.
 * 3. Contractors with active visibility boosts (paid credits OR new-member auto-boost)
 *    get rotated into a "Sponsored" slot at the top — clearly labeled, capped at 3 slots,
 *    randomly rotated on each page load so no one locks the top forever.
 * 4. New contractors (< 30 days) get a free auto-boost so they can build history.
 *
 * Merit Score breakdown (0–100):
 *   25pts  Average rating (1–5 stars, weighted by review count)
 *   15pts  Review volume (log scale — 10 reviews ≠ 10x better than 1)
 *   15pts  Completed jobs (log scale)
 *   15pts  Response rate (% of messages replied to)
 *   10pts  Profile completeness (photo, bio, specialties, location, tagline)
 *   10pts  Trust signals (identity verified, insured, background checked)
 *    5pts  On-time rate
 *    5pts  Recency (active in last 30 days gets full points, decays over 90 days)
 */

export interface RankableContractor {
  id: string;
  avgRating: number;
  totalReviews: number;
  completedJobs: number;
  responseRate: number;
  onTimeRate: number;
  identityVerified: boolean;
  insuranceVerified: boolean;
  backgroundChecked: boolean;
  profilePhoto: string | null;
  coverPhoto: string | null;
  bio: string | null;
  tagline: string | null;
  specialties: string[];
  baseCity: string | null;
  baseState: string | null;
  featuredUntil: Date | null;
  visibilityCredits: number;
  newContractorBoostUntil: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  // mapped display fields
  name: string;
  email: string;
  isPaymentReady: boolean;
  user: { id: string; name: string | null; image: string | null } | null;
  coverPhotoDisplay: string | null;
  taglineDisplay: string | null;
  baseCity2: string | null;
  baseState2: string | null;
  hourlyRate: number | null;
  yearsExperience: number | null;
  slug: string | null;
  source: 'profile' | 'contractor';
  responseTime: string;
}

export interface RankedContractor extends RankableContractor {
  meritScore: number;
  isBoosted: boolean;   // has active paid or new-member boost
  isNew: boolean;       // joined < 30 days ago
  isSponsored: boolean; // currently occupying a sponsored slot this render
}

/** Calculate profile completeness 0–100 */
function profileCompleteness(c: RankableContractor): number {
  const checks = [
    !!c.profilePhoto,
    !!c.coverPhoto,
    !!c.bio && c.bio.length > 50,
    !!c.tagline,
    c.specialties.length > 0,
    !!c.baseCity,
    !!c.baseState,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Log scale normalizer — prevents one contractor with 1000 jobs dominating */
function logNorm(value: number, max: number): number {
  if (value <= 0) return 0;
  return Math.min(Math.log1p(value) / Math.log1p(max), 1);
}

/** Recency score — full points if active in last 30 days, decays to 0 at 90 days */
function recencyScore(lastActiveAt: Date | null, createdAt: Date): number {
  const ref = lastActiveAt || createdAt;
  const daysSince = (Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince <= 30) return 1;
  if (daysSince >= 90) return 0;
  return 1 - (daysSince - 30) / 60;
}

/** Core merit score 0–100 */
export function calculateMeritScore(c: RankableContractor): number {
  // Rating: weighted by review count to avoid 1-review 5-star gaming
  // Bayesian average: (reviews * rating + 5 * 3.5) / (reviews + 5)
  const bayesianRating = (c.totalReviews * c.avgRating + 5 * 3.5) / (c.totalReviews + 5);
  const ratingScore = ((bayesianRating - 1) / 4) * 25; // 1–5 → 0–25

  const reviewScore = logNorm(c.totalReviews, 200) * 15;
  const jobScore = logNorm(c.completedJobs, 500) * 15;
  const responseScore = (c.responseRate / 100) * 15;
  const completenessScore = (profileCompleteness(c) / 100) * 10;

  const trustPoints =
    (c.identityVerified ? 4 : 0) +
    (c.insuranceVerified ? 4 : 0) +
    (c.backgroundChecked ? 2 : 0);
  const trustScore = (trustPoints / 10) * 10;

  const onTimeScore = (c.onTimeRate / 100) * 5;
  const recency = recencyScore(c.lastActiveAt, c.createdAt) * 5;

  return Math.round(
    ratingScore + reviewScore + jobScore + responseScore +
    completenessScore + trustScore + onTimeScore + recency
  );
}

/** Check if a contractor has an active boost right now */
export function hasActiveBoost(c: RankableContractor): boolean {
  const now = new Date();
  const hasPaidBoost = c.featuredUntil != null && c.featuredUntil > now;
  const hasNewBoost = c.newContractorBoostUntil != null && c.newContractorBoostUntil > now;
  const hasCredits = c.visibilityCredits > 0;
  return hasPaidBoost || hasNewBoost || hasCredits;
}

/** Check if contractor is "new" (joined < 30 days ago) */
export function isNewContractor(c: RankableContractor): boolean {
  const daysSince = (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < 30;
}

/**
 * Main ranking function.
 *
 * Returns contractors split into:
 * - sponsored: up to 3 boosted contractors, randomly rotated
 * - organic: everyone else sorted by merit score descending
 *
 * The final display list is [...sponsored, ...organic] but sponsored slots
 * are clearly labeled in the UI.
 */
export function rankContractors(contractors: RankableContractor[]): RankedContractor[] {
  const now = new Date();

  const scored: RankedContractor[] = contractors.map(c => ({
    ...c,
    meritScore: calculateMeritScore(c),
    isBoosted: hasActiveBoost(c),
    isNew: isNewContractor(c),
    isSponsored: false,
  }));

  // Split boosted vs organic
  const boosted = scored.filter(c => c.isBoosted);
  const organic = scored.filter(c => !c.isBoosted);

  // Sort organic by merit score descending
  organic.sort((a, b) => b.meritScore - a.meritScore);

  // Randomly rotate boosted — shuffle so no one locks the top slot
  // Use a daily seed so the rotation is stable within a day but changes each day
  const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const shuffled = [...boosted].sort((a, b) => {
    const hashA = simpleHash(a.id + daySeed);
    const hashB = simpleHash(b.id + daySeed);
    return hashA - hashB;
  });

  // Cap sponsored slots at 3
  const sponsored = shuffled.slice(0, 3).map(c => ({ ...c, isSponsored: true }));
  const boostedNotShown = shuffled.slice(3).map(c => ({ ...c, isSponsored: false }));

  // Boosted contractors not in sponsored slots still appear in organic by merit
  const organicFull = [...boostedNotShown, ...organic].sort((a, b) => b.meritScore - a.meritScore);

  return [...sponsored, ...organicFull];
}

/** Simple deterministic hash for daily rotation seed */
function simpleHash(str: string | number): number {
  const s = String(str);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Normalize a specialty string to title case for consistent matching.
 * "roofing" → "Roofing", "HVAC" → "HVAC"
 */
export function normalizeSpecialty(s: string): string {
  // Keep all-caps acronyms as-is
  if (s === s.toUpperCase() && s.length <= 6) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** The canonical specialty list used by the marketplace filter buttons */
export const CANONICAL_SPECIALTIES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Carpentry',
  'Painting',
  'Roofing',
  'Landscaping',
  'General Repairs',
  'Appliance Repair',
];

/**
 * Calculate profile completion score for display in the dashboard.
 * Returns { score: 0-100, missing: string[] }
 */
export function getProfileCompletion(profile: {
  profilePhoto?: string | null;
  coverPhoto?: string | null;
  bio?: string | null;
  tagline?: string | null;
  specialties?: string[];
  baseCity?: string | null;
  baseState?: string | null;
  phone?: string | null;
  licenseNumber?: string | null;
  identityVerified?: boolean;
  insuranceVerified?: boolean;
  hourlyRate?: any;
}): { score: number; missing: string[] } {
  const checks: { label: string; pass: boolean }[] = [
    { label: 'Profile photo (your face)', pass: !!profile.profilePhoto },
    { label: 'Cover photo / banner', pass: !!profile.coverPhoto },
    { label: 'Bio (50+ characters)', pass: !!profile.bio && profile.bio.length > 50 },
    { label: 'Tagline', pass: !!profile.tagline },
    { label: 'At least one specialty', pass: (profile.specialties?.length ?? 0) > 0 },
    { label: 'City & state', pass: !!profile.baseCity && !!profile.baseState },
    { label: 'Phone number', pass: !!profile.phone },
    { label: 'Hourly rate', pass: !!profile.hourlyRate },
    { label: 'Identity verified', pass: !!profile.identityVerified },
    { label: 'Insurance verified', pass: !!profile.insuranceVerified },
  ];

  const passed = checks.filter(c => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  const missing = checks.filter(c => !c.pass).map(c => c.label);

  return { score, missing };
}
