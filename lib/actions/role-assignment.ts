'use server';

/**
 * Role assignment guarantees.
 *
 * Every public signup path eventually lands on a plan-picker page or a
 * dashboard — both of which depend on User.role being correct. Historically
 * we've had a recurring bug where a user signs up via a marketing landing
 * page, the form's hidden `role` input doesn't make it through, the user
 * ends up with `role: 'user'`, and then the dashboard redirect-loop traps
 * them on the role picker forever.
 *
 * This file contains ONE function — `ensureRoleForContext` — that callers
 * (subscription pages, admin layouts, contractor layouts) can invoke as a
 * defensive backstop. It promotes the user's role + creates the required
 * profile (Landlord, ContractorProfile) if it's missing, with the right
 * trial-date initialization.
 *
 * Idempotent. Safe to call on every page load. Only writes when a real
 * inconsistency is detected.
 */

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { logAuthEvent } from '@/lib/security/audit-logger';
import { requestContextFromHeaders } from '@/lib/security/request-context';
import { getOrCreateCurrentLandlord } from './landlord.actions';
type IntendedRole = 'landlord' | 'contractor';

/**
 * Ensure the signed-in user has the right role + profile for the page they
 * just landed on. Called from server components/layouts that already know
 * the intended role for their route.
 *
 * @param intended - 'landlord' for /admin/* and /onboarding/landlord/*,
 *                   'contractor' for /contractor-dashboard/* and
 *                   /onboarding/contractor/*
 *
 * @returns A summary of what (if anything) was changed. Useful for logging.
 */
export async function ensureRoleForContext(intended: IntendedRole): Promise<{
  changed: boolean;
  reason?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { changed: false, reason: 'no-session' };
  }

  const userId = session.user.id;
  const currentRole = session.user.role;

  // Roles that are fully privileged on either side — we never demote them.
  const PRESERVE = new Set(['admin', 'superAdmin']);
  if (currentRole && PRESERVE.has(currentRole)) {
    return { changed: false, reason: 'preserved-role' };
  }

  // Already in the right shape — nothing to do.
  if (intended === 'landlord') {
    if (currentRole === 'landlord' || currentRole === 'property_manager') {
      // But still verify trial dates so a stuck user can recover by simply
      // visiting the page again. Idempotent.
      await ensureLandlordTrialInitialized(userId);
      return { changed: false, reason: 'role-already-correct' };
    }
  } else if (intended === 'contractor') {
    if (currentRole === 'contractor' || currentRole === 'contractor_employee') {
      // Contractor employees never need a profile — they're linked through
      // ContractorEmployee.userId to someone else's profile.
      if (currentRole === 'contractor') {
        await ensureContractorTrialInitialized(userId);
      }
      return { changed: false, reason: 'role-already-correct' };
    }
  }

  // SAFETY: only auto-promote when the current role is the schema default
  // (`'user'`) or completely missing. We do NOT silently flip a tenant,
  // homeowner, agent, or cross-side role (e.g., a contractor visiting an
  // admin landlord page). Those users are bounced by SubscriptionGate /
  // requireContractor as they should be — auto-promotion is reserved for
  // the "stuck signup" case where the role never got set in the first
  // place.
  const PROMOTABLE = new Set(['user', '', null, undefined]);
  if (!PROMOTABLE.has(currentRole as any)) {
    return { changed: false, reason: `not-promotable-from-${currentRole}` };
  }

  // Role mismatch — promote.
  const targetRole = intended;

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: targetRole,
      onboardingCompleted: true,
      // Enable 2FA-by-default for landlords/PMs as the rest of the codebase does.
      ...(targetRole === 'landlord' ? { twoFactorEnabled: true } : {}),
    },
  });

  // Create profile + initialize trial dates for the side they landed on.
  if (targetRole === 'landlord') {
    await ensureLandlordTrialInitialized(userId);
  } else if (targetRole === 'contractor') {
    await ensureContractorTrialInitialized(userId);
  }

  // Audit so we can see in the logs why a role flipped, and from where.
  // Capturing the request IP/user-agent here is the difference between an
  // unattributable "AUTH_ROLE_PROMOTED" line and "promoted from IP X by
  // user-agent Y" — critical when investigating suspected bypasses.
  const ctx = await requestContextFromHeaders();
  logAuthEvent('AUTH_ROLE_PROMOTED', {
    userId,
    email: session.user.email || undefined,
    success: true,
    role: targetRole,
    ipAddress: ctx.ipAddress ?? undefined,
    userAgent: ctx.userAgent ?? undefined,
  }).catch(() => {});

  return {
    changed: true,
    reason: `promoted from "${currentRole || 'none'}" to "${targetRole}"`,
  };
}

/**
 * Make sure the landlord record exists and has a trial started.
 * Sets a 7-day no-card trial if one hasn't been started yet.
 * If the landlord already has trial dates or a Stripe subscription,
 * this is a no-op — existing state is never overwritten.
 */
async function ensureLandlordTrialInitialized(userId: string): Promise<void> {
  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) return;

  const landlord = landlordResult.landlord;

  // Already has trial dates or a stripe subscription — nothing to do.
  const existing = await prisma.landlord.findUnique({
    where: { id: landlord.id },
    select: { trialStartDate: true, stripeSubscriptionId: true },
  });
  if (existing?.trialStartDate || existing?.stripeSubscriptionId) return;

  // Mint the 14-day trial now.
  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 14);

  await prisma.landlord.update({
    where: { id: landlord.id },
    data: {
      trialStartDate: trialStart,
      trialEndDate: trialEnd,
      trialStatus: 'trialing',
      subscriptionStatus: 'trialing',
    },
  });
}

/**
 * Mirror of the landlord helper for the contractor side. Creates a minimal
 * ContractorProfile if missing. Trial dates are NOT initialized here —
 * they're only set by the Stripe webhook after a real card is on file.
 *
 * Idempotent: existing contractors with trial dates keep them.
 */
async function ensureContractorTrialInitialized(userId: string): Promise<void> {
  const existing = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) return; // Profile exists; trial state is webhook-managed.

  // Create a minimal contractor profile with a unique slug. The full
  // profile (business name, specialties, etc.) gets filled in via the
  // contractor onboarding questionnaire later. No trial dates — Stripe
  // Checkout completion is required.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const baseName = (user?.name || user?.email?.split('@')[0] || 'contractor')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'contractor';
  const suffix = userId.slice(0, 8);
  const slug = `${baseName}-${suffix}`;

  await prisma.contractorProfile.create({
    data: {
      userId,
      slug,
      businessName: user?.name || 'My Business',
      displayName: user?.name || 'My Business',
      email: user?.email || '',
      subscriptionTier: 'starter',
      subscriptionStatus: 'incomplete', // Awaiting Stripe Checkout completion
      isPublic: false,
    },
  });
}
